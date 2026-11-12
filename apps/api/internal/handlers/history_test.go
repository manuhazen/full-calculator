package handlers

import (
	"calculator-workspace/api/internal/models"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func calculate(t *testing.T, h http.Handler, id, operation string, operands []string) models.Calculation {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"threadId": id, "operation": operation, "operands": operands})
	w := request(h, "POST", "/api/v1/calculations", string(body))
	assertStatus(t, w, 201)
	var item models.Calculation
	if err := json.Unmarshal(w.Body.Bytes(), &item); err != nil {
		t.Fatal(err)
	}
	return item
}
func history(t *testing.T, h http.Handler, id string) []models.Calculation {
	t.Helper()
	w := request(h, "GET", "/api/v1/threads/"+id+"/calculations", "")
	assertStatus(t, w, 200)
	var items []models.Calculation
	if err := json.Unmarshal(w.Body.Bytes(), &items); err != nil {
		t.Fatal(err)
	}
	return items
}

func TestHistoryIsolationOrderAndReuse(t *testing.T) {
	h := testAPI(t)
	first := create(t, h, "First")
	second := create(t, h, "Second")
	w := request(h, "GET", "/api/v1/threads/"+first.ID+"/calculations", "")
	assertStatus(t, w, 200)
	if strings.TrimSpace(w.Body.String()) != "[]" {
		t.Fatal(w.Body.String())
	}
	a := calculate(t, h, first.ID, "add", []string{"25", "15"})
	b := calculate(t, h, first.ID, "divide", []string{a.Result, "2"})
	other := calculate(t, h, second.ID, "power", []string{"2", "3"})
	items := history(t, h, first.ID)
	if len(items) != 2 || items[0].ID != a.ID || items[1].ID != b.ID || b.Result != "20" {
		t.Fatalf("history=%+v", items)
	}
	items = history(t, h, second.ID)
	if len(items) != 1 || items[0].ID != other.ID {
		t.Fatalf("isolated=%+v", items)
	}
	assertStatus(t, request(h, "DELETE", "/api/v1/threads/"+first.ID, ""), 204)
	assertStatus(t, request(h, "GET", "/api/v1/threads/"+first.ID+"/calculations", ""), 404)
	if len(history(t, h, second.ID)) != 1 {
		t.Fatal("unrelated history deleted")
	}
}
