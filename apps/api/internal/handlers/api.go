package handlers

import (
	"calculator-workspace/api/internal/config"
	"calculator-workspace/api/internal/fault"
	"calculator-workspace/api/internal/repository"
	"calculator-workspace/api/internal/validation"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type API struct {
	store  *repository.Store
	logger *slog.Logger
	cfg    config.Config
}

func New(store *repository.Store, cfg config.Config, logger *slog.Logger) http.Handler {
	a := &API{store: store, logger: logger, cfg: cfg}
	r := chi.NewRouter()
	r.Use(middleware.RequestID, a.observe, a.cors)
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		write(w, 404, map[string]any{"error": fault.New("NOT_FOUND", "The requested endpoint does not exist.")})
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		write(w, 405, map[string]any{"error": fault.New("METHOD_NOT_ALLOWED", "This HTTP method is not supported.")})
	})
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", a.health)
		r.Post("/calculations", a.calculate)
		r.Get("/threads", a.threads)
		r.Post("/threads", a.createThread)
		r.Get("/threads/{id}", a.thread)
		r.Patch("/threads/{id}", a.renameThread)
		r.Delete("/threads/{id}", a.deleteThread)
	})
	return r
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	if err := a.store.DB.PingContext(r.Context()); err != nil {
		write(w, 503, map[string]any{"error": fault.New("NOT_READY", "The service is not ready.")})
		return
	}
	write(w, 200, map[string]string{"status": "ok", "message": "API is ready"})
}
func (a *API) threads(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.Threads(r.Context())
	if err != nil {
		a.fail(w, r, err)
		return
	}
	write(w, 200, items)
}
func (a *API) thread(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := validation.UUID(id); err != nil {
		a.fail(w, r, err)
		return
	}
	item, err := a.store.Thread(r.Context(), id)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	write(w, 200, item)
}

func (a *API) createThread(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name json.RawMessage `json:"name"`
	}
	if err := validation.Decode(w, r, &input); err != nil {
		a.fail(w, r, err)
		return
	}
	name, err := validation.Name(input.Name, true)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	item, err := a.store.CreateThread(r.Context(), name)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	w.Header().Set("Location", "/api/v1/threads/"+item.ID)
	write(w, 201, item)
}

func (a *API) renameThread(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := validation.UUID(id); err != nil {
		a.fail(w, r, err)
		return
	}
	var input struct {
		Name json.RawMessage `json:"name"`
	}
	if err := validation.Decode(w, r, &input); err != nil {
		a.fail(w, r, err)
		return
	}
	name, err := validation.Name(input.Name, false)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	item, err := a.store.RenameThread(r.Context(), id, name)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	write(w, 200, item)
}
func (a *API) deleteThread(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := validation.UUID(id); err != nil {
		a.fail(w, r, err)
		return
	}
	if err := a.store.DeleteThread(r.Context(), id); err != nil {
		a.fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) fail(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusUnprocessableEntity
	var problem *fault.Error
	if errors.Is(err, repository.ErrNotFound) {
		problem = fault.New("THREAD_NOT_FOUND", "The calculation thread does not exist.")
		status = 404
	} else if errors.As(err, &problem) {
		switch problem.Code {
		case "INVALID_JSON":
			status = 400
		case "BODY_TOO_LARGE":
			status = 413
		case "UNSUPPORTED_MEDIA_TYPE":
			status = 415
		}
	} else {
		a.logger.Error("request failed", "requestId", middleware.GetReqID(r.Context()), "error", err)
		status = 500
		problem = fault.New("INTERNAL_ERROR", "Something went wrong. Please try again.")
	}
	write(w, status, map[string]any{"error": problem})
}

func write(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

type recorder struct {
	http.ResponseWriter
	status int
}

func (w *recorder) WriteHeader(status int) { w.status = status; w.ResponseWriter.WriteHeader(status) }
func (a *API) observe(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		out := &recorder{ResponseWriter: w, status: 200}
		defer func() {
			if recovered := recover(); recovered != nil {
				a.logger.Error("request panic", "requestId", middleware.GetReqID(r.Context()), "panic", recovered)
				write(out, 500, map[string]any{"error": fault.New("INTERNAL_ERROR", "Something went wrong. Please try again.")})
			}
			a.logger.Info("request", "method", r.Method, "path", r.URL.Path, "status", out.status, "durationMs", time.Since(start).Milliseconds(), "requestId", middleware.GetReqID(r.Context()))
		}()
		next.ServeHTTP(out, r)
	})
}

func (a *API) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.cfg.EnableCORS {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Add("Vary", "Origin")
		if origin := r.Header.Get("Origin"); origin != "" {
			if origin != strings.TrimRight(a.cfg.FrontendOrigin, "/") {
				write(w, 403, map[string]any{"error": fault.New("FORBIDDEN_ORIGIN", "This origin is not allowed.")})
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(204)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
