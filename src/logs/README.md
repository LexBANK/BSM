# BSU Log Analyzer

A web-based log file analyzer that parses, analyzes, and visualizes error frequencies and trends from log files.

## Features

- **File Upload**: Upload log files up to 10MB (.log, .txt, .json formats)
- **Auto-Detection**: Automatically detects JSON (Pino, Bunyan, Winston) or plain text log formats
- **Error Analysis**: 
  - Groups similar errors by pattern
  - Calculates error frequencies and percentages
  - Shows first and last occurrence timestamps
  - Displays example error messages
- **Warning Analysis**: Same analysis for warning-level log entries
- **Trend Visualization**: Charts showing error/warning trends over time
- **Time Range**: Displays log time span from first to last entry
- **In-Memory Storage**: Files stored temporarily (1 hour) with automatic cleanup

## Usage

1. **Access the UI**: Navigate to `http://localhost:3000/logs` in your browser

2. **Upload a Log File**:
   - Click "Select Log File" or drag and drop
   - Supported formats: .log, .txt, .json (max 10MB)
   - Click "Upload & Analyze"

3. **View Results**:
   - Summary cards showing total lines, errors, warnings, and detected format
   - Time range of log entries
   - Interactive chart showing trends over time
   - Detailed error and warning frequency tables with examples

## API Endpoints

### Upload Log File
```bash
POST /api/logs/upload
Content-Type: multipart/form-data

# Example
curl -X POST http://localhost:3000/api/logs/upload \
  -F "file=@app.log"
```

Response:
```json
{
  "uploadId": "uuid",
  "filename": "app.log",
  "size": 204800,
  "uploadedAt": "2024-01-15T10:30:00Z",
  "correlationId": "req-123"
}
```

### Analyze Log File
```bash
POST /api/logs/analyze
Content-Type: application/json

{
  "uploadId": "uuid",
  "format": "auto"  // or "json" or "plain"
}
```

Response:
```json
{
  "uploadId": "uuid",
  "analysis": {
    "summary": {
      "totalLines": 1500,
      "errorCount": 45,
      "warningCount": 120,
      "timeRange": {
        "start": "2024-01-15T00:00:00Z",
        "end": "2024-01-15T23:59:59Z"
      },
      "detectedFormat": "json"
    },
    "errorFrequencies": [...],
    "warningFrequencies": [...],
    "trends": { ... }
  }
}
```

### Get Analysis Results
```bash
GET /api/logs/results/:uploadId
```

### Delete Upload
```bash
DELETE /api/logs/:uploadId
```

## Supported Log Formats

### JSON Logs
Supports common structured logging formats:
```json
{"time":"2024-01-15T10:15:23Z","level":"error","msg":"Connection timeout"}
{"timestamp":"2024-01-15T10:15:23Z","severity":"ERROR","message":"Connection timeout"}
```

### Plain Text Logs
Supports various timestamp formats:
```
[2024-01-15 10:15:23] ERROR: Connection timeout
2024-01-15T10:15:23Z ERROR Connection timeout
ERROR: Connection timeout
```

## Pattern Extraction

The analyzer groups similar errors together by extracting patterns:
- Timestamps → `<TIMESTAMP>`
- UUIDs → `<UUID>`
- Numbers → `<NUM>`
- File paths → `<PATH>`
- URLs → `<URL>`

Example:
```
"Connection timeout after 5000ms" → "Connection timeout after <NUM>ms"
"Failed to load /api/users/123" → "Failed to load <PATH>"
```

## Architecture

```
src/logs/
├── index.html      # Vue 3 UI
├── app.js          # Frontend logic
└── README.md       # This file

src/routes/
└── logs.js         # API routes

src/controllers/
└── logsController.js   # Request handlers

src/services/
└── logAnalysisService.js   # Analysis logic
```

## Security

- File type validation (.log, .txt, .json only)
- File size limit (10MB max)
- In-memory storage only (no disk writes)
- Automatic cleanup after 1 hour
- Rate limiting on API endpoints
- CORS and CSP headers configured

## Development

The log analyzer integrates seamlessly with the BSU platform:
- Follows existing architecture patterns
- Uses Pino for structured logging
- Includes correlation IDs for request tracing
- Follows Express middleware patterns

## Testing

Upload sample logs to test:

**Plain Text:**
```bash
cat > sample.log << 'EOF'
2024-01-15T10:15:23Z ERROR Connection timeout
2024-01-15T10:16:45Z INFO User login
2024-01-15T10:17:12Z ERROR Connection timeout
2024-01-15T10:18:34Z WARN Cache miss
EOF

curl -X POST http://localhost:3000/api/logs/upload -F "file=@sample.log"
```

**JSON:**
```bash
cat > sample.json << 'EOF'
{"time":"2024-01-15T10:15:23Z","level":"error","msg":"DB connection failed"}
{"time":"2024-01-15T10:16:45Z","level":"info","msg":"Request processed"}
EOF

curl -X POST http://localhost:3000/api/logs/upload -F "file=@sample.json"
```

## License

Part of the BSU platform. See main project LICENSE.
