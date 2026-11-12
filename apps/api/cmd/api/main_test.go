package main

import (
	"calculator-workspace/api/internal/config"
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"path/filepath"
	"testing"
)

func TestRunReturnsFatalListenerError(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	err = run(context.Background(), config.Config{Address: listener.Addr().String(), DatabasePath: filepath.Join(t.TempDir(), "busy.db")}, logger)
	var network *net.OpError
	if !errors.As(err, &network) || network.Op != "listen" {
		t.Fatalf("fatal listener error not propagated: %v", err)
	}
}

func TestRunGracefulCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	err := run(ctx, config.Config{Address: "127.0.0.1:0", DatabasePath: filepath.Join(t.TempDir(), "cancel.db")}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatalf("graceful cancellation: %v", err)
	}
}
