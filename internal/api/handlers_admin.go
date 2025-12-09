package api

import (
	"log"
	"net/http"

	"github.com/clusteruptime/clusteruptime/internal/db"
	"github.com/clusteruptime/clusteruptime/internal/uptime"
)

type AdminHandler struct {
	store   *db.Store
	manager *uptime.Manager
}

func NewAdminHandler(store *db.Store, manager *uptime.Manager) *AdminHandler {
	return &AdminHandler{store: store, manager: manager}
}

func (h *AdminHandler) ResetDatabase(w http.ResponseWriter, r *http.Request) {
	log.Println("ADMIN: Initiating full database reset requested by user.")

	// Stop all monitoring before wiping DB to prevent FK violations
	h.manager.Reset()

	if err := h.store.Reset(); err != nil {
		log.Printf("Failed to reset database: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to reset database")
		return
	}

	// Sync manager to start monitoring new seed data
	h.manager.Sync()

	log.Println("ADMIN: Database reset successful.")
	writeJSON(w, http.StatusOK, map[string]string{"message": "Database reset successfully"})
}
