package api

import (
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/clusteruptime/clusteruptime/internal/db"
	"github.com/clusteruptime/clusteruptime/internal/uptime"
)

type EventHandler struct {
	store   *db.Store
	manager *uptime.Manager
}

func NewEventHandler(store *db.Store, manager *uptime.Manager) *EventHandler {
	return &EventHandler{store: store, manager: manager}
}

type IncidentDTO struct {
	ID          string     `json:"id"` // Generated, or uses ID of start event
	MonitorID   string     `json:"monitorId"`
	MonitorName string     `json:"monitorName"`
	Type        string     `json:"type"` // down, degraded
	Message     string     `json:"message"`
	StartedAt   time.Time  `json:"startedAt"`
	ResolvedAt  *time.Time `json:"resolvedAt"` // Null if active
	Duration    string     `json:"duration"`   // Human readable? or client calc
}

func (h *EventHandler) GetSystemEvents(w http.ResponseWriter, r *http.Request) {
	rawEvents, err := h.store.GetSystemEvents(0)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch events")
		return
	}

	// 1. Group by Monitor
	eventsByMonitor := make(map[string][]db.SystemEvent)
	for _, e := range rawEvents {
		eventsByMonitor[e.MonitorID] = append(eventsByMonitor[e.MonitorID], e)
	}

	var active []IncidentDTO
	var history []IncidentDTO

	// 2. Process each monitor
	for _, events := range eventsByMonitor {
		// Ensure sorted ASC
		// (Store already does this, but being safe)
		// sort.Slice(events, ...)

		var current *IncidentDTO

		for i, e := range events {
			if e.Type == "up" {
				if current != nil {
					// Close the incident
					resolved := e.Timestamp
					current.ResolvedAt = &resolved
					history = append(history, *current)
					current = nil
				}
			} else {
				// Down or Degraded
				if current == nil {
					// Start new incident
					current = &IncidentDTO{
						ID:          iframeID(e.ID),
						MonitorID:   e.MonitorID,
						MonitorName: e.MonitorName,
						Type:        e.Type,
						Message:     e.Message,
						StartedAt:   e.Timestamp,
					}
				} else {
					// Already active. Escalation/De-escalation?
					// For now, let's just keep the start time.
					// Maybe update type if it got worse?
					if e.Type == "down" && current.Type == "degraded" {
						current.Type = "down"
						current.Message = e.Message
					}
				}
			}

			// Handle edge case: Last event is non-up -> It is Active
			if i == len(events)-1 && current != nil {
				active = append(active, *current)
			}
		}
	}

	// 3. Sort Results DESC (Newest First)
	sort.Slice(active, func(i, j int) bool {
		return active[i].StartedAt.After(active[j].StartedAt)
	})
	sort.Slice(history, func(i, j int) bool {
		return history[i].ResolvedAt.After(*history[j].ResolvedAt)
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"active":  active,
		"history": history,
	})
}

func iframeID(id int64) string {
	return fmt.Sprintf("evt-%d", id)
}
