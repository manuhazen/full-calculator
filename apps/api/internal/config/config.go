package config

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
)

type Config struct {
	Address        string
	DatabasePath   string
	FrontendOrigin string
	EnableCORS     bool
}

func Load() (Config, error) {
	c := Config{Address: value("API_ADDR", ":8080"), DatabasePath: value("DATABASE_PATH", "/data/calculator.db"), FrontendOrigin: value("FRONTEND_ORIGIN", "http://localhost:5173")}
	_, port, err := net.SplitHostPort(c.Address)
	if err != nil {
		return c, fmt.Errorf("API_ADDR must contain a host and port")
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return c, fmt.Errorf("API_ADDR port must be between 1 and 65535")
	}
	u, err := url.Parse(c.FrontendOrigin)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return c, fmt.Errorf("FRONTEND_ORIGIN must be an HTTP(S) origin")
	}
	if raw := os.Getenv("ENABLE_CORS"); raw != "" {
		c.EnableCORS, err = strconv.ParseBool(raw)
		if err != nil {
			return c, fmt.Errorf("ENABLE_CORS must be true or false")
		}
	}
	return c, nil
}

func value(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
