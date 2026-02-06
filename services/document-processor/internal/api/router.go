package api

import (
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/lexbank/bsm/services/document-processor/internal/config"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// NewRouter creates and configures the HTTP router
func NewRouter(cfg *config.Config) *chi.Mux {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(LoggerMiddleware)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30)) // 30 second timeout
	r.Use(MetricsMiddleware)

	// Health check endpoint
	r.Get("/health", HealthHandler)

	// Metrics endpoint
	r.Handle("/metrics", promhttp.Handler())

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/documents", func(r chi.Router) {
			r.Post("/parse", ParseDocumentHandler)
			r.Get("/{id}/metadata", GetMetadataHandler)
		})
	})

	return r
}
