package config

import "testing"

func TestLoad(t *testing.T) {
	for _, tc := range []struct {
		name, key, value string
		invalid          bool
	}{
		{"defaults", "API_ADDR", "", false}, {"custom address", "API_ADDR", "127.0.0.1:9000", false},
		{"bad address", "API_ADDR", "invalid", true}, {"bad port", "API_ADDR", ":70000", true},
		{"bad origin", "FRONTEND_ORIGIN", "javascript:alert(1)", true}, {"origin path", "FRONTEND_ORIGIN", "http://localhost/path", true},
		{"cors enabled", "ENABLE_CORS", "true", false}, {"bad cors", "ENABLE_CORS", "perhaps", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, k := range []string{"API_ADDR", "DATABASE_PATH", "FRONTEND_ORIGIN", "ENABLE_CORS"} {
				t.Setenv(k, "")
			}
			t.Setenv(tc.key, tc.value)
			c, err := Load()
			if (err != nil) != tc.invalid {
				t.Fatalf("error=%v, invalid=%v", err, tc.invalid)
			}
			if err == nil && c.DatabasePath != "/data/calculator.db" {
				t.Fatalf("database default=%q", c.DatabasePath)
			}
		})
	}
}
