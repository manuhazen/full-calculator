package main

import (
	"calculator-workspace/api/internal/config"
	"calculator-workspace/api/internal/handlers"
	"calculator-workspace/api/internal/repository"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("invalid configuration", "error", err)
		os.Exit(1)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, cfg, logger); err != nil {
		logger.Error("API failed", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, cfg config.Config, logger *slog.Logger) error {
	db, err := repository.Open(cfg.DatabasePath)
	if err != nil {
		return fmt.Errorf("database initialization: %w", err)
	}
	defer db.Close()
	mux := handlers.New(repository.New(db), cfg, logger)
	server := &http.Server{Addr: cfg.Address, Handler: mux, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second}
	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("starting API", "address", cfg.Address)
		serverErrors <- server.ListenAndServe()
	}()
	select {
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("listen on %s: %w", cfg.Address, err)
		}
		return nil
	case <-ctx.Done():
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdown); err != nil {
		_ = server.Close()
		return fmt.Errorf("shutdown: %w", err)
	}
	logger.Info("API stopped")
	return nil
}
