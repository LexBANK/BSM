# Log Analyzer - Quick Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Vue 3 App (/logs/index.html)               │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │ File Upload  │  │   Analysis   │               │     │
│  │  │   Component  │  │   Results    │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │ Error Table  │  │  Trends Chart│               │     │
│  │  │  (Sortable)  │  │  (Chart.js)  │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  └────────────────────────────────────────────────────┘     │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP (fetch API)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Middleware Stack                        │  │
│  │  CORS → Helmet → JSON → Correlation → Logger        │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Rate Limiter (/api/*)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Routes (/api/logs)                         │  │
│  │  POST /upload    → Multer → logsController.uploadLog│  │
│  │  POST /analyze   → logsController.analyzeLog        │  │
│  │  GET  /results/:id → logsController.getResults      │  │
│  │  DELETE /:id     → logsController.deleteLog          │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Controllers (logsController.js)           │  │
│  │  - Input validation                                  │  │
│  │  - Error handling (AppError)                        │  │
│  │  - Response formatting (with correlationId)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Services (logAnalysisService.js)             │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  In-Memory Storage (Map)                       │ │  │
│  │  │  uploads: uploadId → { buffer, filename }      │ │  │
│  │  │  analyses: uploadId → { analysis }             │ │  │
│  │  │  Auto-cleanup: 1 hour TTL                      │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Parsing Engine                                │ │  │
│  │  │  - Format detection (JSON/Plain)               │ │  │
│  │  │  - Timestamp extraction                        │ │  │
│  │  │  - Level normalization (error/warn/info)       │ │  │
│  │  │  - Pattern extraction                          │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Analysis Engine                               │ │  │
│  │  │  - Error frequency calculation                 │ │  │
│  │  │  - Pattern grouping                            │ │  │
│  │  │  - Trend calculation (hourly buckets)          │ │  │
│  │  │  - Time range detection                        │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Static File Serving                       │  │
│  │  /logs → express.static("src/logs")                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Upload Flow
```
1. User selects file
   ↓
2. Browser: POST /api/logs/upload (multipart/form-data)
   ↓
3. Multer: Parse multipart, extract buffer
   ↓
4. Controller: Validate file
   ↓
5. Service: Generate uploadId, store in Map
   ↓
6. Response: { uploadId, filename, size }
```

### Analysis Flow
```
1. Auto-trigger after upload (or manual)
   ↓
2. Browser: POST /api/logs/analyze { uploadId, format }
   ↓
3. Controller: Validate uploadId
   ↓
4. Service: Retrieve buffer from Map
   ↓
5. Service: Detect format (JSON vs Plain)
   ↓
6. Service: Parse lines
   ├─ JSON: JSON.parse each line
   └─ Plain: Regex extract timestamp, level, message
   ↓
7. Service: Filter errors & warnings
   ↓
8. Service: Calculate frequencies (group by pattern)
   ↓
9. Service: Calculate trends (group by hour)
   ↓
10. Service: Store analysis in Map
   ↓
11. Response: { uploadId, analysis }
   ↓
12. Browser: Render results + chart
```

## File Structure Tree

```
BSM/
├── src/
│   ├── logs/                         [NEW]
│   │   ├── index.html                # Main UI
│   │   ├── app.js                    # Vue app
│   │   └── styles.css                # Optional styles
│   │
│   ├── routes/
│   │   ├── index.js                  [MODIFY] - Add logs route
│   │   └── logs.js                   [NEW]    - Log endpoints
│   │
│   ├── controllers/
│   │   └── logsController.js         [NEW]    - Request handlers
│   │
│   ├── services/
│   │   └── logAnalysisService.js     [NEW]    - Business logic
│   │
│   └── app.js                        [MODIFY] - Add /logs static serving
│
└── package.json                      [MODIFY] - Add multer
```

## API Contract

### POST /api/logs/upload
```javascript
// Request
Content-Type: multipart/form-data
Body: { file: <binary> }

// Success Response (200)
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "app.log",
  "size": 204800,
  "uploadedAt": "2024-01-15T10:30:00.000Z",
  "correlationId": "req-abc123"
}

// Error Response (400)
{
  "error": "No file uploaded",
  "code": "NO_FILE",
  "correlationId": "req-abc123"
}
```

### POST /api/logs/analyze
```javascript
// Request
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "format": "auto" // or "json" or "plain"
}

// Success Response (200)
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "analysis": {
    "summary": {
      "totalLines": 1500,
      "errorCount": 45,
      "warningCount": 120,
      "timeRange": {
        "start": "2024-01-15T00:00:00.000Z",
        "end": "2024-01-15T23:59:59.000Z"
      }
    },
    "errorFrequencies": [
      {
        "pattern": "Connection timeout to [HOST]:[PORT]",
        "count": 15,
        "percentage": "33.3",
        "firstOccurrence": "2024-01-15T08:15:00.000Z",
        "lastOccurrence": "2024-01-15T22:30:00.000Z",
        "examples": [
          "Line 45: Connection timeout to db.example.com:5432",
          "Line 102: Connection timeout to cache.example.com:6379"
        ]
      }
    ],
    "trends": [
      {
        "hour": "2024-01-15T10:00:00.000Z",
        "errorCount": 5,
        "warningCount": 12
      }
    ],
    "topErrors": [...] // Top 10 from errorFrequencies
  },
  "analyzedAt": "2024-01-15T10:31:00.000Z",
  "correlationId": "req-def456"
}
```

## Log Format Support

### JSON Logs (Pino, Bunyan, Winston)
```json
{"level":50,"time":1705315200000,"msg":"Error message","err":{"type":"Error"}}
{"level":"error","timestamp":"2024-01-15T10:30:00Z","message":"Error message"}
```

### Plain Text Logs
```
2024-01-15T10:30:00Z [ERROR] Connection failed
2024-01-15 10:30:00 ERROR: Database timeout
Jan 15 10:30:00 ERROR Message here
[2024-01-15 10:30:00] ERROR - Connection refused
```

### Level Mapping
```
error, err, ERROR, fatal, FATAL, 50, 60 → "error"
warn, warning, WARN, WARNING, 40        → "warning"
info, INFO, debug, DEBUG, 30, 20, 10    → "info"
```

## Pattern Extraction Algorithm

```javascript
// Original error message:
"Connection timeout to db-prod-01.example.com:5432 after 30000ms at 2024-01-15T10:30:00Z"

// Step 1: Replace timestamps
"Connection timeout to db-prod-01.example.com:5432 after 30000ms at [TIMESTAMP]"

// Step 2: Replace UUIDs
(no UUIDs in this example)

// Step 3: Replace numbers
"Connection timeout to db-prod-[NUM].example.com:[NUM] after [NUM]ms at [TIMESTAMP]"

// Step 4: Normalize whitespace
"Connection timeout to db-prod-[NUM].example.com:[NUM] after [NUM]ms at [TIMESTAMP]"

// Step 5: Truncate to 150 chars
"Connection timeout to db-prod-[NUM].example.com:[NUM] after [NUM]ms at [TIMESTAMP]"

// Result: All similar connection timeouts grouped under this pattern
```

## Memory Management

```javascript
// Storage structure
uploads = Map {
  "uuid-1" => {
    buffer: Buffer<...>,
    filename: "app.log",
    timestamp: 1705315200000,
    size: 204800
  }
}

analyses = Map {
  "uuid-1" => {
    summary: {...},
    errorFrequencies: [...],
    trends: [...]
  }
}

// Cleanup policy
- Run every 5 minutes
- Delete entries older than 1 hour
- No disk persistence
- Max file size: 10MB
- Expected max memory: ~100MB for 10 concurrent uploads
```

## UI Component Breakdown

### Upload Section
```html
<div class="upload-section">
  <div class="drag-drop-area">
    <input type="file" @change="handleFileSelect" />
    <p>Drag & drop or click to upload</p>
    <small>Supports .log, .txt, .json (max 10MB)</small>
  </div>
  <button @click="uploadFile" :disabled="!file || uploading">
    Upload {{ filename }}
  </button>
</div>
```

### Summary Cards
```html
<div class="summary-grid">
  <div class="card">
    <h3>Total Lines</h3>
    <p>{{ analysis.summary.totalLines }}</p>
  </div>
  <div class="card error">
    <h3>Errors</h3>
    <p>{{ analysis.summary.errorCount }}</p>
  </div>
  <div class="card warning">
    <h3>Warnings</h3>
    <p>{{ analysis.summary.warningCount }}</p>
  </div>
  <div class="card" v-if="analysis.summary.timeRange">
    <h3>Time Range</h3>
    <p>{{ formatDateRange(analysis.summary.timeRange) }}</p>
  </div>
</div>
```

### Error Frequencies Table
```html
<table class="error-table">
  <thead>
    <tr>
      <th @click="sortBy('pattern')">Error Pattern</th>
      <th @click="sortBy('count')">Count</th>
      <th @click="sortBy('percentage')">%</th>
      <th>First Seen</th>
      <th>Last Seen</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="err in sortedErrors" :key="err.pattern">
      <td>
        <details>
          <summary>{{ err.pattern }}</summary>
          <ul>
            <li v-for="ex in err.examples">{{ ex }}</li>
          </ul>
        </details>
      </td>
      <td>{{ err.count }}</td>
      <td>{{ err.percentage }}%</td>
      <td>{{ formatDate(err.firstOccurrence) }}</td>
      <td>{{ formatDate(err.lastOccurrence) }}</td>
    </tr>
  </tbody>
</table>
```

### Trends Chart
```html
<canvas id="trendsChart" v-if="analysis.trends"></canvas>
<div v-else class="no-trends">
  <p>No timestamp data available for trend analysis</p>
</div>
```

## Installation Steps

### 1. Install Dependencies
```bash
cd /home/runner/work/BSM/BSM
npm install multer
```

### 2. Create Service
```bash
cat > src/services/logAnalysisService.js << 'EOF'
[Paste service code from plan]
EOF
```

### 3. Create Controller
```bash
cat > src/controllers/logsController.js << 'EOF'
[Paste controller code from plan]
EOF
```

### 4. Create Routes
```bash
cat > src/routes/logs.js << 'EOF'
[Paste routes code from plan]
EOF
```

### 5. Update Route Index
```bash
# Edit src/routes/index.js
# Add: import logs from "./logs.js";
# Add: router.use("/logs", logs);
```

### 6. Update App
```bash
# Edit src/app.js
# Add static serving for /logs after line 72
```

### 7. Create Frontend
```bash
mkdir -p src/logs
cat > src/logs/index.html << 'EOF'
[Paste HTML from plan]
EOF

cat > src/logs/app.js << 'EOF'
[Paste Vue app from plan]
EOF
```

### 8. Start Server
```bash
npm run dev
```

### 9. Test
```
Open: http://localhost:3000/logs
Upload: Sample log file
Verify: Analysis results display
```

## Testing Checklist

- [ ] Upload 1KB log file → ✓ Success
- [ ] Upload 9MB log file → ✓ Success
- [ ] Upload 11MB log file → ✗ Reject (too large)
- [ ] Upload .exe file → ✗ Reject (wrong type)
- [ ] Analyze JSON format → ✓ Parse correctly
- [ ] Analyze plain text → ✓ Parse correctly
- [ ] No timestamps → ✓ Show warning, skip trends
- [ ] Empty file → ✓ Handle gracefully
- [ ] Malformed JSON → ✓ Fall back to plain text
- [ ] 100k lines → ✓ Performance acceptable
- [ ] Wait 1 hour → ✓ Auto-cleanup runs
- [ ] Chart renders → ✓ Visual correct
- [ ] Sort table → ✓ Sorting works
- [ ] Reset button → ✓ Clears state

## Performance Expectations

| Metric | Expected |
|--------|----------|
| Upload 1MB file | < 500ms |
| Analyze 10k lines | < 2s |
| Analyze 100k lines | < 10s |
| Memory per upload | ~10MB |
| Max concurrent uploads | 10 |
| Total memory overhead | ~100MB |

## Security Notes

✅ File size limited to 10MB  
✅ File type validation (mimetype + extension)  
✅ In-memory only (no disk writes)  
✅ Auto-cleanup after 1 hour  
✅ Rate limiting on /api/* (existing)  
✅ CORS policy enforced (existing)  
✅ Helmet CSP for /logs UI  
✅ No code execution (only parsing)  
❌ No authentication (add if needed)  
❌ No file encryption (add if needed)

## Troubleshooting

### Upload fails with "No file uploaded"
- Check `multer` is installed
- Verify `enctype="multipart/form-data"` in form
- Check file input name is "file"

### Analysis returns empty results
- Verify log format matches expected patterns
- Check browser console for parsing errors
- Enable debug logging in service

### Chart doesn't render
- Verify `Chart.js` loaded (check CDN)
- Check timestamps are valid ISO strings
- Verify `trendsChart` canvas exists in DOM

### Memory leak / high memory usage
- Check cleanup interval is running
- Verify old uploads are being deleted
- Monitor Map sizes in production

### Rate limiting triggers too often
- Adjust rate limit in `src/app.js`
- Consider separate rate limit for /logs endpoints

## Next Steps

After basic implementation:

1. **Add authentication**: Protect /logs UI with admin token
2. **Add persistence**: Store analysis results in database
3. **Add export**: CSV/PDF download of results
4. **Add filtering**: Date range, severity level filters
5. **Add streaming**: Real-time log analysis
6. **Add dashboards**: Historical analysis over time
7. **Add alerts**: Notification on error threshold
8. **Add customization**: User-defined error patterns

## Support

For issues or questions:
1. Check existing BSU patterns in `/src`
2. Review error logs with Pino
3. Use correlation IDs for request tracing
4. Test with sample log files first
5. Monitor memory usage in production

---

**Ready to implement?** Follow the steps in `LOG_ANALYZER_IMPLEMENTATION_PLAN.md`
