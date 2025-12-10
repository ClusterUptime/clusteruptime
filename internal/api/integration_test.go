package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/clusteruptime/clusteruptime/internal/db"
	"github.com/clusteruptime/clusteruptime/internal/uptime"
)

// TestAPIKeyIntegrationFlow simulates the full user journey:
// 1. Login (setup default admin)
// 2. Create API Key
// 3. Use API Key to Create Group
// 4. Use API Key to Create Monitor
func TestAPIKeyIntegrationFlow(t *testing.T) {
	// 1. Setup Server
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, _ := db.NewStore(dbPath)
	manager := uptime.NewManager(store)
	router := NewRouter(manager, store)

	ts := httptest.NewServer(router)
	defer ts.Close()

	jar, _ := cookiejar.New(nil)
	client := ts.Client()
	client.Jar = jar

	// Helper for requests
	baseURL := ts.URL + "/api"

	// 2. Login as Admin
	// Note: NewStore defaults admin/password if empty
	loginPayload := map[string]string{"username": "admin", "password": "password"}
	loginBody, _ := json.Marshal(loginPayload)
	resp, err := client.Post(baseURL+"/auth/login", "application/json", bytes.NewBuffer(loginBody))
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("Login status: %d", resp.StatusCode)
	}
	// Cookies are handled by jar if configured, creating API Key needs Cookie auth
	// client.Jar should capture cookies automatically from Login response

	// 3. Create API Key
	apiKeyPayload := map[string]string{"name": "test-key-go"}
	keyBody, _ := json.Marshal(apiKeyPayload)
	resp, err = client.Post(baseURL+"/api-keys", "application/json", bytes.NewBuffer(keyBody))
	if err != nil {
		t.Fatalf("Create API Key request failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("Create API Key failed: %d", resp.StatusCode)
	}
	var keyResp map[string]string
	json.NewDecoder(resp.Body).Decode(&keyResp)
	apiKey := keyResp["key"]
	if apiKey == "" {
		t.Fatal("Empty API Key returned")
	}
	t.Logf("Generated API Key: %s", apiKey)

	// 4. Verify API Key Usage (Create Group)
	// Create a NEW client to ensure NO COOKIES are used, proving API Key works
	apiClient := &http.Client{}

	groupPayload := map[string]string{"name": "Go Test Group"}
	groupBody, _ := json.Marshal(groupPayload)
	req, _ := http.NewRequest("POST", baseURL+"/groups", bytes.NewBuffer(groupBody))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err = apiClient.Do(req)
	if err != nil {
		t.Fatalf("Create Group req failed: %v", err)
	}
	if resp.StatusCode != 201 {
		buf := new(bytes.Buffer)
		buf.ReadFrom(resp.Body)
		t.Fatalf("Create Group failed: %d Body: %s", resp.StatusCode, buf.String())
	}
	var groupResp map[string]string
	json.NewDecoder(resp.Body).Decode(&groupResp)
	groupID := groupResp["id"]
	if groupID == "" {
		t.Fatal("Empty Group ID")
	}

	// 5. Verify API Key Usage (Create Monitor)
	monPayload := map[string]interface{}{
		"name":     "Go Monitor",
		"url":      "https://example.com",
		"groupId":  groupID,
		"interval": 60,
	}
	monBody, _ := json.Marshal(monPayload)
	req, _ = http.NewRequest("POST", baseURL+"/monitors", bytes.NewBuffer(monBody))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err = apiClient.Do(req)
	if err != nil {
		t.Fatalf("Create Monitor req failed: %v", err)
	}
	if resp.StatusCode != 201 {
		buf := new(bytes.Buffer)
		buf.ReadFrom(resp.Body)
		t.Fatalf("Create Monitor failed: %d Body: %s", resp.StatusCode, buf.String())
	}

	// Check if monitor is in DB
	checkMon, err := store.GetMonitors()
	found := false
	for _, m := range checkMon {
		if strings.Contains(m.Name, "Go Monitor") {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("Monitor not found in DB after API creation")
	}

	t.Log("Success: API Key Integration Test Passed")
}
