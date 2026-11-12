package validation

import (
	"calculator-workspace/api/internal/fault"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestStrictDecode(t *testing.T) {
	for _, tc := range []struct{ name, body, content, code string }{
		{"valid", `{"name":"test"}`, "application/json", ""}, {"unknown", `{"extra":1}`, "application/json", "INVALID_JSON"}, {"trailing", `{} {}`, "application/json", "INVALID_JSON"}, {"bad", `{`, "application/json", "INVALID_JSON"}, {"array", `[]`, "application/json", "INVALID_JSON"}, {"null", `null`, "application/json", "INVALID_JSON"}, {"wrong type", `{"name":1}`, "application/json", "INVALID_JSON"}, {"size", `{"name":"` + strings.Repeat("x", 8200) + `"}`, "application/json", "BODY_TOO_LARGE"}, {"media", `{}`, "text/plain", "UNSUPPORTED_MEDIA_TYPE"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/", strings.NewReader(tc.body))
			r.Header.Set("Content-Type", tc.content)
			var input struct {
				Name string `json:"name"`
			}
			err := Decode(httptest.NewRecorder(), r, &input)
			var typed *fault.Error
			if tc.code == "" {
				if err != nil {
					t.Fatal(err)
				}
			} else if !errors.As(err, &typed) || typed.Code != tc.code {
				t.Fatalf("error=%v,want=%s", err, tc.code)
			}
		})
	}
}

func TestOperands(t *testing.T) {
	for _, value := range []string{"0", "-0", "12.50", "-1.2", "0.000000000001", "999999999999999999999999.999999999999"} {
		if err := Decimal(value); err != nil {
			t.Fatalf("%s: %v", value, err)
		}
	}
	for _, value := range []string{"NaN", "Infinity", "1e3", "+1", " 1", "1 ", "01", ".1", "1.", "1+2", "0.0000000000001", "1000000000000000000000000"} {
		if err := Decimal(value); err == nil {
			t.Fatalf("accepted %q", value)
		}
	}
	if err := Operands("eval", []string{"1"}); err == nil {
		t.Fatal("accepted operation")
	}
	if err := Operands("sqrt", []string{"1", "2"}); err == nil {
		t.Fatal("accepted count")
	}
	if err := Operands("sqrt", []string{"1"}); err != nil {
		t.Fatal(err)
	}
}

func TestNamesAndUUIDs(t *testing.T) {
	name, err := Name(nil, true)
	if err != nil || name != "Untitled Thread" {
		t.Fatal(name, err)
	}
	raw, _ := json.Marshal("  測試 name  ")
	name, err = Name(raw, false)
	if err != nil || name != "測試 name" {
		t.Fatal(name, err)
	}
	for _, raw := range []string{`null`, `[]`, `{}`, `" "`, `"` + strings.Repeat("界", 81) + `"`} {
		if _, err := Name(json.RawMessage(raw), false); err == nil {
			t.Fatalf("accepted %s", raw)
		}
	}
	if err := UUID("550e8400-e29b-41d4-a716-446655440000"); err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{"bad", "550E8400-E29B-41D4-A716-446655440000", "550e8400e29b41d4a716446655440000"} {
		if err := UUID(id); err == nil {
			t.Fatalf("accepted %s", id)
		}
	}
}
