package api

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// RequestsTotal counts total HTTP requests
	RequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "document_processor_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	// RequestDuration measures request duration
	RequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "document_processor_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// DocumentsProcessed counts total documents processed
	DocumentsProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "documents_processed_total",
			Help: "Total number of documents processed",
		},
	)

	// DocumentsProcessingErrors counts processing errors
	DocumentsProcessingErrors = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "documents_processing_errors_total",
			Help: "Total number of document processing errors",
		},
	)
)
