package handlers

import (
	"calculator-workspace/api/internal/config"
	"calculator-workspace/api/internal/repository"
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestCalculationErrorsDoNotPersist(t *testing.T) {
	h := testAPI(t)
	thread := create(t, h, "Rejected calculations")
	for _, tc := range []struct {
		name, operation string
		operands        any
		code            string
	}{
		{"unknown", "eval", []string{"1+2"}, "INVALID_OPERATION"}, {"divide zero", "divide", []string{"1", "0"}, "DIVISION_BY_ZERO"}, {"negative sqrt", "sqrt", []string{"-4"}, "NEGATIVE_SQUARE_ROOT"}, {"fractional power", "power", []string{"4", "0.5"}, "INVALID_EXPONENT"}, {"outside exponent", "power", []string{"2", "21"}, "INVALID_EXPONENT"}, {"zero negative", "power", []string{"0", "-1"}, "ZERO_NEGATIVE_POWER"}, {"nan", "add", []string{"NaN", "1"}, "INVALID_OPERAND"}, {"infinity", "sqrt", []string{"Infinity"}, "INVALID_OPERAND"}, {"expression", "sqrt", []string{"1+2"}, "INVALID_OPERAND"}, {"notation", "sqrt", []string{"1e10"}, "INVALID_OPERAND"}, {"too big", "sqrt", []string{"1000000000000000000000000"}, "INVALID_OPERAND"}, {"too small", "sqrt", []string{"0.0000000000001"}, "INVALID_OPERAND"}, {"count", "add", []string{"1"}, "INVALID_OPERAND_COUNT"}, {"overflow", "power", []string{"999999999999999999999999", "20"}, "RESULT_OUT_OF_RANGE"}, {"underflow", "percent", []string{"0.000000000001"}, "RESULT_UNDERFLOW"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(map[string]any{"threadId": thread.ID, "operation": tc.operation, "operands": tc.operands})
			w := request(h, "POST", "/api/v1/calculations", string(body))
			assertStatus(t, w, 422)
			var envelope struct {
				Error struct{ Code, Message string }
			}
			if err := json.Unmarshal(w.Body.Bytes(), &envelope); err != nil || envelope.Error.Code != tc.code {
				t.Fatalf("error=%s,err=%v", w.Body.String(), err)
			}
		})
	}
	if len(history(t, h, thread.ID)) != 0 {
		t.Fatal("failed calculations persisted")
	}
	for _, extra := range []string{`,"unknown":true`, `,"operands":[1,2]`, `,"operands":[{},"2"]`} {
		body := `{"threadId":"` + thread.ID + `","operation":"add","operands":["1","2"]` + extra + `}`
		assertStatus(t, request(h, "POST", "/api/v1/calculations", body), 400)
	}
	r := httptest.NewRequest("POST", "/api/v1/calculations", strings.NewReader(`{}`))
	r.Header.Set("Content-Type", "text/plain")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	assertStatus(t, w, 415)
}

func TestInternalErrorDoesNotLeak(t *testing.T) {
	db, err := repository.Open(filepath.Join(t.TempDir(), "private.db"))
	if err != nil {
		t.Fatal(err)
	}
	h := New(repository.New(db), config.Config{}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	db.Close()
	w := request(h, "GET", "/api/v1/threads", "")
	assertStatus(t, w, 500)
	if strings.Contains(w.Body.String(), "database") || strings.Contains(w.Body.String(), "sql:") {
		t.Fatal(w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "INTERNAL_ERROR") {
		t.Fatal(w.Body.String())
	}
}

func TestRestrictedCORS(t *testing.T) {
	db, err := repository.Open(filepath.Join(t.TempDir(), "cors.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	h := New(repository.New(db), config.Config{EnableCORS: true, FrontendOrigin: "http://localhost:5173"}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	for _, tc := range []struct {
		origin string
		status int
	}{{"http://localhost:5173", 204}, {"https://untrusted.example", 403}} {
		r := httptest.NewRequest("OPTIONS", "/api/v1/threads", nil)
		r.Header.Set("Origin", tc.origin)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		assertStatus(t, w, tc.status)
		if tc.status == 204 && w.Header().Get("Access-Control-Allow-Origin") != tc.origin {
			t.Fatal(w.Header())
		}
	}
}
