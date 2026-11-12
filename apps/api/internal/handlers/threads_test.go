package handlers

import (
	"calculator-workspace/api/internal/config"
	"calculator-workspace/api/internal/models"
	"calculator-workspace/api/internal/repository"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestThreadDeletionCascadesHistory(t *testing.T) {
	db, err := repository.Open(filepath.Join(t.TempDir(), "cascade.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	store := repository.New(db)
	thread, err := store.CreateThread(context.Background(), "Cascade")
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec("INSERT INTO calculations(id,thread_id,operation,operands,expression,result,created_at) VALUES(?,?,?,?,?,?,?)", "calculation-id", thread.ID, "add", `["1","2"]`, "1 + 2", "3", 1)
	if err != nil {
		t.Fatal(err)
	}
	h := New(store, config.Config{}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	assertStatus(t, request(h, "DELETE", "/api/v1/threads/"+thread.ID, ""), 204)
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM calculations WHERE thread_id=?", thread.ID).Scan(&count); err != nil || count != 0 {
		t.Fatalf("remaining=%d,err=%v", count, err)
	}
}

func testAPI(t *testing.T) http.Handler {
	t.Helper()
	db, err := repository.Open(filepath.Join(t.TempDir(), "api.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return New(repository.New(db), config.Config{}, slog.New(slog.NewTextHandler(io.Discard, nil)))
}
func request(handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	return w
}
func assertStatus(t *testing.T, w *httptest.ResponseRecorder, status int) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status=%d,want=%d,body=%s", w.Code, status, w.Body.String())
	}
}
func create(t *testing.T, h http.Handler, name string) models.Thread {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"name": name})
	w := request(h, "POST", "/api/v1/threads", string(body))
	assertStatus(t, w, 201)
	var item models.Thread
	if err := json.Unmarshal(w.Body.Bytes(), &item); err != nil {
		t.Fatal(err)
	}
	return item
}

func TestThreadHTTP(t *testing.T) {
	h := testAPI(t)
	w := request(h, "GET", "/api/v1/threads", "")
	assertStatus(t, w, 200)
	if strings.TrimSpace(w.Body.String()) != "[]" {
		t.Fatal(w.Body.String())
	}
	first := create(t, h, "  Budget  ")
	if first.Name != "Budget" {
		t.Fatal(first.Name)
	}
	second := create(t, h, "Other")
	assertStatus(t, request(h, "GET", "/api/v1/threads/"+first.ID, ""), 200)
	w = request(h, "PATCH", "/api/v1/threads/"+first.ID, `{"name":"Renamed"}`)
	assertStatus(t, w, 200)
	if !strings.Contains(w.Body.String(), "Renamed") {
		t.Fatal(w.Body.String())
	}
	assertStatus(t, request(h, "DELETE", "/api/v1/threads/"+first.ID, ""), 204)
	assertStatus(t, request(h, "GET", "/api/v1/threads/"+first.ID, ""), 404)
	assertStatus(t, request(h, "GET", "/api/v1/threads/"+second.ID, ""), 200)
	w = request(h, "POST", "/api/v1/threads", `{}`)
	assertStatus(t, w, 201)
	if !strings.Contains(w.Body.String(), "Untitled Thread") {
		t.Fatal(w.Body.String())
	}
}

func TestInvalidThreadRequests(t *testing.T) {
	h := testAPI(t)
	for _, tc := range []struct {
		method, path, body string
		status             int
	}{
		{"GET", "/api/v1/threads/invalid", "", 422}, {"GET", "/api/v1/threads/550e8400-e29b-41d4-a716-446655440000", "", 404}, {"POST", "/api/v1/threads", `{"unknown":1}`, 400}, {"POST", "/api/v1/threads", `{} {}`, 400}, {"POST", "/api/v1/threads", `{`, 400}, {"POST", "/api/v1/threads", `{"name":" "}`, 422}, {"POST", "/api/v1/threads", `{"name":null}`, 422}, {"POST", "/api/v1/threads", `{"name":[]}`, 422}, {"POST", "/api/v1/threads", `{"name":"` + strings.Repeat("x", 9000) + `"}`, 413}, {"PUT", "/api/v1/threads", `{}`, 405}, {"GET", "/api/v1/unknown", "", 404},
	} {
		t.Run(tc.method+tc.path+tc.body[:min(len(tc.body), 20)], func(t *testing.T) {
			w := request(h, tc.method, tc.path, tc.body)
			assertStatus(t, w, tc.status)
			var result struct {
				Error struct{ Code, Message string }
			}
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil || result.Error.Code == "" || result.Error.Message == "" {
				t.Fatalf("bad envelope %s", w.Body.String())
			}
		})
	}
}
