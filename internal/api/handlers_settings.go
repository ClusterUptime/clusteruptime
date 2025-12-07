package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/clusteruptime/clusteruptime/internal/db"
	"github.com/clusteruptime/clusteruptime/internal/uptime"
)

type SettingsHandler struct {
	store   *db.Store
	manager *uptime.Manager
}

func NewSettingsHandler(store *db.Store, manager *uptime.Manager) *SettingsHandler {
	return &SettingsHandler{store: store, manager: manager}
}

func (h *SettingsHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	// For now, we only expose latency_threshold
	val, err := h.store.GetSetting("latency_threshold")
	if err != nil {
		// If not set, return default
		val = "1000"
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"latency_threshold": val,
	})
}

func (h *SettingsHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if val, ok := body["latency_threshold"]; ok {
		// Validate int
		i, err := strconv.Atoi(val)
		if err != nil || i < 0 {
			http.Error(w, "Invalid latency_threshold", http.StatusBadRequest)
			return
		}

		// Save to DB
		if err := h.store.SetSetting("latency_threshold", val); err != nil {
			http.Error(w, "Failed to save setting", http.StatusInternalServerError)
			return
		}

		// Update Manager
		h.manager.SetLatencyThreshold(int64(i))
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
