package handlers

import (
	"calculator-workspace/api/internal/models"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestUnifiedCalculationHTTP(t *testing.T) {
	h := testAPI(t)
	thread := create(t, h, "Math")
	for _, tc := range []struct {
		operation string
		operands  []string
		result    string
	}{
		{"add", []string{"12.50", "7.25"}, "19.75"}, {"subtract", []string{"10", "3"}, "7"}, {"multiply", []string{"2.5", "4"}, "10"}, {"divide", []string{"1", "3"}, "0.333333333333"}, {"power", []string{"2", "3"}, "8"}, {"sqrt", []string{"9"}, "3"}, {"percent", []string{"25"}, "0.25"},
	} {
		t.Run(tc.operation, func(t *testing.T) {
			body, _ := json.Marshal(map[string]any{"threadId": thread.ID, "operation": tc.operation, "operands": tc.operands})
			w := request(h, "POST", "/api/v1/calculations", string(body))
			assertStatus(t, w, 201)
			var result models.Calculation
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if result.Result != tc.result || result.ThreadID != thread.ID || result.Operation != tc.operation || result.Expression == "" || result.CreatedAt.IsZero() {
				t.Fatalf("result=%+v", result)
			}
			if _, err := uuid.Parse(result.ID); err != nil {
				t.Fatal(err)
			}
			for i, value := range tc.operands {
				if result.Operands[i] != value {
					t.Fatal(result.Operands)
				}
			}
		})
	}
	w := request(h, "POST", "/api/v1/calculations", `{"threadId":"550e8400-e29b-41d4-a716-446655440000","operation":"add","operands":["1","2"]}`)
	assertStatus(t, w, 404)
	assertStatus(t, request(h, "POST", "/api/v1/add", `{}`), 404)
}
