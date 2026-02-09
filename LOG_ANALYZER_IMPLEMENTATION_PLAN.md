# Log Analyzer Feature - Implementation Plan

## Overview
Minimal-change implementation following BSU's existing architecture patterns for a web-based log file analysis feature.

---

## 1. File Structure

### New Files to Create

```
src/
├── logs/                           # New directory for log analyzer UI
│   ├── index.html                  # Main UI page
│   ├── app.js                      # Vue 3 frontend logic
│   └── styles.css                  # Custom styles (if needed)
│
├── controllers/
│   └── logsController.js           # NEW: Controller for log operations
│
├── services/
│   └── logAnalysisService.js       # NEW: Log parsing & analysis logic
│
└── routes/
    └── logs.js                     # NEW: Log analyzer routes
```

### Files to Modify

```
src/
├── app.js                          # Add static serving for /logs UI
└── routes/
    └── index.js                    # Register logs router
```

---

## 2. API Endpoint Design

### Base Path: `/api/logs`

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/api/logs/upload` | Upload log file | `multipart/form-data` with file | `{ uploadId, filename, size, correlationId }` |
| POST | `/api/logs/analyze` | Analyze uploaded log | `{ uploadId, format }` | `{ analysis: {...}, correlationId }` |
| GET | `/api/logs/results/:uploadId` | Get analysis results | - | `{ uploadId, analysis: {...}, correlationId }` |
| DELETE | `/api/logs/:uploadId` | Delete uploaded log | - | `{ success: true, correlationId }` |

### Request/Response Schemas

#### POST `/api/logs/upload`
```javascript
// Request: multipart/form-data
{
  file: File // Max 10MB
}

// Response
{
  uploadId: "uuid-v4",
  filename: "app.log",
  size: 204800,
  uploadedAt: "2024-01-15T10:30:00Z",
  correlationId: "req-123"
}
```

#### POST `/api/logs/analyze`
```javascript
// Request
{
  uploadId: "uuid-v4",
  format: "json" | "plain" | "auto" // Default: "auto"
}

// Response
{
  uploadId: "uuid-v4",
  analysis: {
    summary: {
      totalLines: 1500,
      errorCount: 45,
      warningCount: 120,
      timeRange: {
        start: "2024-01-15T00:00:00Z",
        end: "2024-01-15T23:59:59Z"
      }
    },
    errorFrequencies: [
      {
        pattern: "Connection timeout",
        count: 15,
        percentage: 33.3,
        firstOccurrence: "2024-01-15T08:15:00Z",
        lastOccurrence: "2024-01-15T22:30:00Z",
        examples: ["Line 45: Connection timeout to DB"]
      }
    ],
    trends: [
      {
        hour: "2024-01-15T10:00:00Z",
        errorCount: 5,
        warningCount: 12
      }
    ],
    topErrors: [...] // Top 10 by frequency
  },
  analyzedAt: "2024-01-15T10:31:00Z",
  correlationId: "req-124"
}
```

---

## 3. Service Layer Architecture

### logAnalysisService.js

```javascript
// Core Functions
export const storeUpload = (fileBuffer, filename)
export const analyzeLog = (uploadId, format)
export const getResults = (uploadId)
export const deleteUpload = (uploadId)

// Internal Parsing Functions
const parseJsonLog = (content)
const parsePlainLog = (content)
const detectFormat = (content)
const extractTimestamps = (lines)
const categorizeErrors = (lines)
const calculateTrends = (errors)
const extractErrorPatterns = (errorLines)
```

#### Storage Strategy
```javascript
// In-memory storage (no persistence needed)
const uploads = new Map(); // uploadId -> { buffer, filename, timestamp }
const analyses = new Map(); // uploadId -> { analysis, timestamp }

// Auto-cleanup after 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of uploads.entries()) {
    if (now - data.timestamp > 3600000) {
      uploads.delete(id);
      analyses.delete(id);
    }
  }
}, 300000); // Check every 5 minutes
```

#### Parsing Logic

##### JSON Format Detection
```javascript
// Detect JSON logs (Pino, Bunyan, Winston JSON format)
{
  "level": "error",
  "time": 1705315200000,
  "msg": "Connection failed",
  "err": { "type": "TimeoutError" }
}
```

##### Plain Text Detection
```javascript
// Detect common formats:
// - ISO timestamp: 2024-01-15T10:30:00Z [ERROR] Message
// - Syslog: Jan 15 10:30:00 ERROR: Message
// - Custom: [2024-01-15 10:30:00] ERROR - Message
```

##### Error Pattern Extraction
```javascript
// Use regex patterns to identify errors:
const ERROR_PATTERNS = [
  /\b(error|err|exception|failed|failure|fatal)\b/i,
  /\b(timeout|refused|denied|unreachable)\b/i,
  /\b(500|503|404|401|403)\b/,
  /\bstack\s*trace\b/i
];

// Group similar errors by:
// 1. Error type/message similarity
// 2. Stack trace patterns
// 3. HTTP status codes
```

##### Trend Calculation
```javascript
// If timestamps available:
// - Group by hour/minute
// - Count errors per time bucket
// - Calculate moving average

// If no timestamps:
// - Return null trends
// - Show warning in UI
```

---

## 4. Frontend UI Structure

### File: src/logs/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BSU - Log Analyzer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-950 text-white min-h-screen">
  <div id="app">
    <!-- Upload Section -->
    <!-- Analysis Results Section -->
    <!-- Error Frequencies Table -->
    <!-- Trends Chart -->
  </div>
  <script src="app.js"></script>
</body>
</html>
```

### File: src/logs/app.js

```javascript
const { createApp } = Vue;

createApp({
  data() {
    return {
      uploadId: null,
      file: null,
      filename: '',
      uploading: false,
      analyzing: false,
      analysis: null,
      error: null,
      view: 'upload' // 'upload' | 'results'
    };
  },
  methods: {
    async handleFileSelect(event) {
      this.file = event.target.files[0];
      this.filename = this.file.name;
    },
    
    async uploadFile() {
      if (!this.file) return;
      
      this.uploading = true;
      this.error = null;
      
      try {
        const formData = new FormData();
        formData.append('file', this.file);
        
        const res = await fetch('/api/logs/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        this.uploadId = data.uploadId;
        
        // Auto-analyze after upload
        await this.analyzeLog();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.uploading = false;
      }
    },
    
    async analyzeLog() {
      this.analyzing = true;
      this.error = null;
      
      try {
        const res = await fetch('/api/logs/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: this.uploadId,
            format: 'auto'
          })
        });
        
        if (!res.ok) throw new Error('Analysis failed');
        
        const data = await res.json();
        this.analysis = data.analysis;
        this.view = 'results';
        
        // Render chart if trends available
        if (this.analysis.trends && this.analysis.trends.length > 0) {
          this.$nextTick(() => this.renderChart());
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.analyzing = false;
      }
    },
    
    renderChart() {
      const ctx = document.getElementById('trendsChart');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.analysis.trends.map(t => new Date(t.hour).toLocaleTimeString()),
          datasets: [
            {
              label: 'Errors',
              data: this.analysis.trends.map(t => t.errorCount),
              borderColor: 'rgb(239, 68, 68)',
              tension: 0.3
            },
            {
              label: 'Warnings',
              data: this.analysis.trends.map(t => t.warningCount),
              borderColor: 'rgb(251, 191, 36)',
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#fff' } }
          },
          scales: {
            x: { ticks: { color: '#9ca3af' } },
            y: { ticks: { color: '#9ca3af' } }
          }
        }
      });
    },
    
    reset() {
      this.uploadId = null;
      this.file = null;
      this.filename = '';
      this.analysis = null;
      this.view = 'upload';
    }
  }
}).mount('#app');
```

### UI Components

1. **Upload Section**
   - Drag & drop file area
   - File size validation (max 10MB)
   - Progress indicator during upload
   - Supported formats badge (JSON, TXT)

2. **Analysis Results Section**
   - Summary cards (total errors, warnings, time range)
   - Error frequencies table with sorting
   - Collapsible error examples
   - Download results as JSON

3. **Trends Chart**
   - Chart.js line chart
   - Show errors/warnings over time
   - Hide if no timestamp data

4. **Error Actions**
   - Copy error pattern
   - Export to CSV
   - Reset to upload new file

---

## 5. Integration with Existing Code

### Step 1: Install Multer for File Uploads

```bash
npm install multer
```

**Why?** BSU currently has no file upload middleware. Multer is the standard Express middleware for handling `multipart/form-data`.

### Step 2: Modify `src/app.js`

```javascript
// Add after existing static routes (line 72)
app.use(
  "/logs",
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"]
      }
    }
  }),
  express.static(path.join(process.cwd(), "src/logs"))
);
```

### Step 3: Modify `src/routes/index.js`

```javascript
// Add import
import logs from "./logs.js";

// Add route registration (before error handlers)
router.use("/logs", logs);
```

### Step 4: Create Route Module

**File: src/routes/logs.js**

```javascript
import { Router } from "express";
import multer from "multer";
import {
  uploadLog,
  analyzeLog,
  getResults,
  deleteLog
} from "../controllers/logsController.js";

const router = Router();

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/json', 'text/x-log'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.log')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .log, .txt, and .json files are allowed.'));
    }
  }
});

// Routes
router.post("/upload", upload.single('file'), uploadLog);
router.post("/analyze", analyzeLog);
router.get("/results/:uploadId", getResults);
router.delete("/:uploadId", deleteLog);

export default router;
```

### Step 5: Create Controller

**File: src/controllers/logsController.js**

```javascript
import {
  storeUpload,
  analyzeLog as analyze,
  getResults as getAnalysis,
  deleteUpload
} from "../services/logAnalysisService.js";
import { AppError } from "../utils/AppError.js";

export const uploadLog = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, "No file uploaded", "NO_FILE");
    }

    const result = await storeUpload(req.file.buffer, req.file.originalname);

    res.json({
      uploadId: result.uploadId,
      filename: result.filename,
      size: result.size,
      uploadedAt: result.uploadedAt,
      correlationId: req.correlationId
    });
  } catch (err) {
    next(err);
  }
};

export const analyzeLog = async (req, res, next) => {
  try {
    const { uploadId, format = 'auto' } = req.body;

    if (!uploadId) {
      throw new AppError(400, "uploadId is required", "MISSING_UPLOAD_ID");
    }

    const analysis = await analyze(uploadId, format);

    res.json({
      uploadId,
      analysis,
      analyzedAt: new Date().toISOString(),
      correlationId: req.correlationId
    });
  } catch (err) {
    next(err);
  }
};

export const getResults = async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    const result = await getAnalysis(uploadId);

    if (!result) {
      throw new AppError(404, "Analysis not found", "NOT_FOUND");
    }

    res.json({
      uploadId,
      analysis: result,
      correlationId: req.correlationId
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLog = async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    await deleteUpload(uploadId);

    res.json({
      success: true,
      correlationId: req.correlationId
    });
  } catch (err) {
    next(err);
  }
};
```

### Step 6: Create Service

**File: src/services/logAnalysisService.js**

```javascript
import { randomUUID } from "crypto";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";

// In-memory storage
const uploads = new Map();
const analyses = new Map();

// Cleanup old uploads every 5 minutes
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 3600000;

  for (const [id, data] of uploads.entries()) {
    if (now - data.timestamp > ONE_HOUR) {
      uploads.delete(id);
      analyses.delete(id);
      logger.info({ uploadId: id }, "Cleaned up expired upload");
    }
  }
}, 300000);

export const storeUpload = async (buffer, filename) => {
  const uploadId = randomUUID();
  const timestamp = Date.now();

  uploads.set(uploadId, {
    buffer,
    filename,
    timestamp,
    size: buffer.length
  });

  logger.info({ uploadId, filename, size: buffer.length }, "Log file uploaded");

  return {
    uploadId,
    filename,
    size: buffer.length,
    uploadedAt: new Date(timestamp).toISOString()
  };
};

export const analyzeLog = async (uploadId, format = 'auto') => {
  const upload = uploads.get(uploadId);

  if (!upload) {
    throw new AppError(404, "Upload not found", "UPLOAD_NOT_FOUND");
  }

  const content = upload.buffer.toString('utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  logger.info({ uploadId, format, lineCount: lines.length }, "Analyzing log file");

  // Detect format
  const detectedFormat = format === 'auto' ? detectFormat(content) : format;

  // Parse based on format
  const parsedLines = detectedFormat === 'json' 
    ? parseJsonLog(lines) 
    : parsePlainLog(lines);

  // Extract errors and warnings
  const errors = parsedLines.filter(l => l.level === 'error');
  const warnings = parsedLines.filter(l => l.level === 'warning');

  // Calculate error frequencies
  const errorFrequencies = calculateErrorFrequencies(errors);

  // Calculate trends if timestamps available
  const trends = calculateTrends(parsedLines);

  // Get time range
  const timeRange = getTimeRange(parsedLines);

  const analysis = {
    summary: {
      totalLines: lines.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      timeRange
    },
    errorFrequencies,
    trends,
    topErrors: errorFrequencies.slice(0, 10)
  };

  analyses.set(uploadId, analysis);

  logger.info({ uploadId, errorCount: errors.length }, "Analysis complete");

  return analysis;
};

export const getResults = async (uploadId) => {
  return analyses.get(uploadId);
};

export const deleteUpload = async (uploadId) => {
  uploads.delete(uploadId);
  analyses.delete(uploadId);
  logger.info({ uploadId }, "Upload deleted");
};

// Internal parsing functions

function detectFormat(content) {
  const firstLine = content.split('\n')[0];
  try {
    JSON.parse(firstLine);
    return 'json';
  } catch {
    return 'plain';
  }
}

function parseJsonLog(lines) {
  return lines.map((line, index) => {
    try {
      const obj = JSON.parse(line);
      return {
        line: index + 1,
        timestamp: obj.time || obj.timestamp || obj['@timestamp'],
        level: normalizeLevel(obj.level || obj.severity),
        message: obj.msg || obj.message || line,
        raw: line
      };
    } catch {
      return {
        line: index + 1,
        timestamp: null,
        level: 'info',
        message: line,
        raw: line
      };
    }
  });
}

function parsePlainLog(lines) {
  const TIMESTAMP_REGEX = /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/;
  const LEVEL_REGEX = /\b(ERROR|ERR|WARN|WARNING|INFO|DEBUG|FATAL|TRACE)\b/i;

  return lines.map((line, index) => {
    const timestampMatch = line.match(TIMESTAMP_REGEX);
    const levelMatch = line.match(LEVEL_REGEX);

    return {
      line: index + 1,
      timestamp: timestampMatch ? new Date(timestampMatch[1]).getTime() : null,
      level: normalizeLevel(levelMatch ? levelMatch[1] : detectLevelFromContent(line)),
      message: line,
      raw: line
    };
  });
}

function normalizeLevel(level) {
  if (!level) return 'info';
  
  const levelStr = String(level).toLowerCase();
  
  if (['error', 'err', 'fatal', '50', '60'].includes(levelStr)) return 'error';
  if (['warn', 'warning', '40'].includes(levelStr)) return 'warning';
  
  return 'info';
}

function detectLevelFromContent(line) {
  const lower = line.toLowerCase();
  
  if (/\b(error|err|exception|failed|failure|fatal|critical)\b/.test(lower)) {
    return 'error';
  }
  if (/\b(warn|warning|deprecated)\b/.test(lower)) {
    return 'warning';
  }
  
  return 'info';
}

function calculateErrorFrequencies(errors) {
  const patterns = new Map();

  for (const error of errors) {
    // Extract error pattern (first 100 chars, normalized)
    const pattern = extractErrorPattern(error.message);

    if (!patterns.has(pattern)) {
      patterns.set(pattern, {
        pattern,
        count: 0,
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp,
        examples: []
      });
    }

    const entry = patterns.get(pattern);
    entry.count++;
    
    if (error.timestamp) {
      if (!entry.firstOccurrence || error.timestamp < entry.firstOccurrence) {
        entry.firstOccurrence = error.timestamp;
      }
      if (!entry.lastOccurrence || error.timestamp > entry.lastOccurrence) {
        entry.lastOccurrence = error.timestamp;
      }
    }

    if (entry.examples.length < 3) {
      entry.examples.push(`Line ${error.line}: ${error.message.slice(0, 200)}`);
    }
  }

  const total = errors.length;
  const frequencies = Array.from(patterns.values()).map(p => ({
    ...p,
    percentage: total > 0 ? ((p.count / total) * 100).toFixed(1) : 0,
    firstOccurrence: p.firstOccurrence ? new Date(p.firstOccurrence).toISOString() : null,
    lastOccurrence: p.lastOccurrence ? new Date(p.lastOccurrence).toISOString() : null
  }));

  return frequencies.sort((a, b) => b.count - a.count);
}

function extractErrorPattern(message) {
  // Remove timestamps, IDs, numbers to group similar errors
  let pattern = message
    .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?/g, '[TIMESTAMP]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]')
    .replace(/\b\d+\b/g, '[NUM]')
    .replace(/\s+/g, ' ')
    .trim();

  return pattern.slice(0, 150);
}

function calculateTrends(parsedLines) {
  const withTimestamps = parsedLines.filter(l => l.timestamp);

  if (withTimestamps.length === 0) {
    return null;
  }

  // Group by hour
  const hourly = new Map();

  for (const line of withTimestamps) {
    const hour = new Date(line.timestamp);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();

    if (!hourly.has(key)) {
      hourly.set(key, { hour: key, errorCount: 0, warningCount: 0 });
    }

    const bucket = hourly.get(key);
    if (line.level === 'error') bucket.errorCount++;
    if (line.level === 'warning') bucket.warningCount++;
  }

  return Array.from(hourly.values()).sort((a, b) => 
    new Date(a.hour).getTime() - new Date(b.hour).getTime()
  );
}

function getTimeRange(parsedLines) {
  const withTimestamps = parsedLines.filter(l => l.timestamp);

  if (withTimestamps.length === 0) {
    return null;
  }

  const timestamps = withTimestamps.map(l => l.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString()
  };
}
```

---

## 6. Testing Strategy

### Manual Testing Checklist

1. **File Upload**
   - [ ] Upload JSON log file (< 10MB)
   - [ ] Upload plain text log file
   - [ ] Try uploading file > 10MB (should fail)
   - [ ] Try uploading non-log file (should fail)

2. **Analysis**
   - [ ] Analyze JSON format logs
   - [ ] Analyze plain text logs with timestamps
   - [ ] Analyze plain text logs without timestamps
   - [ ] Verify error frequencies calculated correctly
   - [ ] Verify trends chart appears when timestamps available

3. **UI/UX**
   - [ ] Upload progress indicator works
   - [ ] Error messages display correctly
   - [ ] Results table sortable
   - [ ] Chart renders correctly
   - [ ] Reset button works

4. **Edge Cases**
   - [ ] Empty log file
   - [ ] Very large log file (9.9MB)
   - [ ] Malformed JSON lines
   - [ ] Mixed format logs

### Sample Test Files

Create in `tests/fixtures/`:

1. **test-json.log** - Pino format
```json
{"level":50,"time":1705315200000,"msg":"Database connection failed"}
{"level":40,"time":1705315260000,"msg":"Slow query detected"}
```

2. **test-plain.log** - ISO timestamp format
```
2024-01-15T10:30:00Z [ERROR] Connection timeout
2024-01-15T10:31:00Z [WARN] High memory usage
```

3. **test-large.log** - Generate 100k lines for performance testing

---

## 7. Security Considerations

1. **File Size Limit**: 10MB max to prevent memory exhaustion
2. **File Type Validation**: Only .log, .txt, .json files
3. **Auto Cleanup**: Delete uploads after 1 hour
4. **No Persistence**: Files never written to disk
5. **Rate Limiting**: Existing `/api` rate limits apply
6. **CORS**: Existing CORS policy applies
7. **Input Sanitization**: Log content never executed, only parsed
8. **Memory Limits**: Monitor Map size in production

---

## 8. Implementation Checklist

### Phase 1: Backend Setup
- [ ] Install multer: `npm install multer`
- [ ] Create `src/services/logAnalysisService.js`
- [ ] Create `src/controllers/logsController.js`
- [ ] Create `src/routes/logs.js`
- [ ] Update `src/routes/index.js`
- [ ] Update `src/app.js`

### Phase 2: Frontend Setup
- [ ] Create `src/logs/index.html`
- [ ] Create `src/logs/app.js`
- [ ] Create `src/logs/styles.css` (optional)

### Phase 3: Testing
- [ ] Create test log files
- [ ] Manual testing of all endpoints
- [ ] UI testing in browser
- [ ] Edge case testing

### Phase 4: Documentation
- [ ] Update README.md with log analyzer usage
- [ ] Add API documentation
- [ ] Add screenshots

---

## 9. Estimated Effort

| Task | Time |
|------|------|
| Backend implementation | 2-3 hours |
| Frontend implementation | 2-3 hours |
| Testing & debugging | 1-2 hours |
| Documentation | 30 mins |
| **Total** | **5-8 hours** |

---

## 10. Future Enhancements (Out of Scope)

- Database persistence for analysis history
- Export to CSV/PDF
- Real-time log streaming
- Multi-file upload
- Advanced filtering (date range, severity)
- Custom error pattern rules
- Integration with monitoring systems
- User authentication for log access
- Log file encryption

---

## 11. Rollback Plan

If issues arise:

1. Remove route registration from `src/routes/index.js`
2. Remove static serving from `src/app.js`
3. Delete new files (`src/logs/*`, `src/controllers/logsController.js`, etc.)
4. Uninstall multer: `npm uninstall multer`

No database migrations or config changes needed, so rollback is clean.

---

## Summary

This implementation follows BSU's existing patterns:
- ✅ Modular route/controller/service architecture
- ✅ Express static serving for UI
- ✅ Vue 3 frontend (consistent with chat UI)
- ✅ Pino logging
- ✅ AppError for error handling
- ✅ Correlation IDs in responses
- ✅ Helmet CSP for security
- ✅ No database (in-memory storage)
- ✅ Minimal dependencies (only multer added)

**Total new files**: 6  
**Modified files**: 2  
**New dependencies**: 1 (multer)
