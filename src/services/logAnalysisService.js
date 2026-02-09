import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Log Analysis Service
 * In-memory storage and analysis of uploaded log files
 */

// In-memory storage: uploadId -> { filename, content, uploadedAt, analysis }
const uploads = new Map();

// Cleanup interval: 1 hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Auto-cleanup old uploads
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const cutoff = now - CLEANUP_INTERVAL_MS;
  
  for (const [uploadId, data] of uploads.entries()) {
    if (data.uploadedAt < cutoff) {
      uploads.delete(uploadId);
      logger.info({ uploadId }, 'Auto-cleaned old log upload');
    }
  }
}, CLEANUP_INTERVAL_MS);

// Graceful shutdown cleanup
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
});

process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
});

/**
 * Store uploaded log file
 */
export function storeUpload(filename, content) {
  const uploadId = uuidv4();
  const uploadedAt = Date.now();
  
  uploads.set(uploadId, {
    filename,
    content,
    uploadedAt,
    analysis: null
  });
  
  logger.info({ uploadId, filename, size: content.length }, 'Stored log upload');
  
  return {
    uploadId,
    filename,
    size: content.length,
    uploadedAt: new Date(uploadedAt).toISOString()
  };
}

/**
 * Get upload by ID
 */
export function getUpload(uploadId) {
  return uploads.get(uploadId);
}

/**
 * Delete upload by ID
 */
export function deleteUpload(uploadId) {
  const deleted = uploads.delete(uploadId);
  if (deleted) {
    logger.info({ uploadId }, 'Deleted log upload');
  }
  return deleted;
}

/**
 * Parse log line to extract timestamp, level, and message
 */
function parseLogLine(line, format) {
  if (format === 'json') {
    try {
      const parsed = JSON.parse(line);
      return {
        timestamp: parsed.time || parsed.timestamp || parsed.date || parsed['@timestamp'] || null,
        level: (parsed.level || parsed.severity || 'INFO').toString().toUpperCase(),
        message: parsed.msg || parsed.message || parsed.text || line,
        raw: line
      };
    } catch (e) {
      return null;
    }
  }
  
  // Plain text parsing with common patterns
  // Pattern: [timestamp] LEVEL message or YYYY-MM-DD HH:MM:SS LEVEL message
  const patterns = [
    /^\[([^\]]+)\]\s*(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL)\s*:?\s*(.+)$/i,
    /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\s+(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL)\s*:?\s*(.+)$/i,
    /^(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL)\s*:\s*(.+)$/i
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      if (match.length === 4) {
        // Pattern with timestamp
        return {
          timestamp: match[1],
          level: match[2].toUpperCase(),
          message: match[3],
          raw: line
        };
      } else if (match.length === 3) {
        // Pattern without timestamp
        return {
          timestamp: null,
          level: match[1].toUpperCase(),
          message: match[2],
          raw: line
        };
      }
    }
  }
  
  // No pattern matched, treat as INFO
  return {
    timestamp: null,
    level: 'INFO',
    message: line,
    raw: line
  };
}

/**
 * Detect log format (json, plain, or auto)
 */
function detectFormat(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return 'plain';
  
  // Check first few lines for JSON
  const sampleSize = Math.min(10, lines.length);
  let jsonCount = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    try {
      JSON.parse(lines[i]);
      jsonCount++;
    } catch (e) {
      // Not JSON
    }
  }
  
  // If >70% are JSON, consider it JSON format
  return (jsonCount / sampleSize) > 0.7 ? 'json' : 'plain';
}

/**
 * Extract error pattern from message
 * Groups similar errors together
 */
function extractErrorPattern(message) {
  // Remove timestamps, IDs, numbers, paths
  let pattern = message
    .replace(/\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?\b/g, '<TIMESTAMP>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
    .replace(/\b\d+\b/g, '<NUM>')
    .replace(/\/[^\s]+/g, '<PATH>')
    .replace(/https?:\/\/[^\s]+/g, '<URL>')
    .trim();
  
  // Truncate to first 100 chars for pattern
  return pattern.substring(0, 100);
}

/**
 * Analyze log content
 */
export function analyzeLog(uploadId, requestedFormat = 'auto') {
  const upload = uploads.get(uploadId);
  if (!upload) {
    throw new Error('Upload not found');
  }
  
  const { content, filename } = upload;
  const format = requestedFormat === 'auto' ? detectFormat(content) : requestedFormat;
  
  logger.info({ uploadId, format }, 'Analyzing log file');
  
  const lines = content.split('\n').filter(l => l.trim());
  const parsedLines = [];
  const errorMap = new Map(); // pattern -> { count, examples, timestamps }
  const warningMap = new Map();
  const timestamps = [];
  
  let errorCount = 0;
  let warningCount = 0;
  
  for (const line of lines) {
    const parsed = parseLogLine(line, format);
    if (!parsed) continue;
    
    parsedLines.push(parsed);
    
    if (parsed.timestamp) {
      try {
        const ts = new Date(parsed.timestamp);
        if (!isNaN(ts.getTime())) {
          timestamps.push(ts);
        }
      } catch (e) {
        // Invalid timestamp, skip
      }
    }
    
    if (parsed.level === 'ERROR' || parsed.level === 'FATAL') {
      errorCount++;
      const pattern = extractErrorPattern(parsed.message);
      
      if (!errorMap.has(pattern)) {
        errorMap.set(pattern, {
          count: 0,
          examples: [],
          timestamps: []
        });
      }
      
      const entry = errorMap.get(pattern);
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push(parsed.message);
      }
      if (parsed.timestamp) {
        entry.timestamps.push(parsed.timestamp);
      }
    } else if (parsed.level === 'WARN' || parsed.level === 'WARNING') {
      warningCount++;
      const pattern = extractErrorPattern(parsed.message);
      
      if (!warningMap.has(pattern)) {
        warningMap.set(pattern, {
          count: 0,
          examples: [],
          timestamps: []
        });
      }
      
      const entry = warningMap.get(pattern);
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push(parsed.message);
      }
      if (parsed.timestamp) {
        entry.timestamps.push(parsed.timestamp);
      }
    }
  }
  
  // Build error frequencies array
  const errorFrequencies = Array.from(errorMap.entries())
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      percentage: errorCount > 0 ? ((data.count / errorCount) * 100).toFixed(1) : 0,
      firstOccurrence: data.timestamps[0] || null,
      lastOccurrence: data.timestamps[data.timestamps.length - 1] || null,
      examples: data.examples
    }))
    .sort((a, b) => b.count - a.count);
  
  const warningFrequencies = Array.from(warningMap.entries())
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      percentage: warningCount > 0 ? ((data.count / warningCount) * 100).toFixed(1) : 0,
      firstOccurrence: data.timestamps[0] || null,
      lastOccurrence: data.timestamps[data.timestamps.length - 1] || null,
      examples: data.examples
    }))
    .sort((a, b) => b.count - a.count);
  
  // Calculate time range
  let timeRange = null;
  if (timestamps.length > 0) {
    timestamps.sort((a, b) => a - b);
    timeRange = {
      start: timestamps[0].toISOString(),
      end: timestamps[timestamps.length - 1].toISOString()
    };
  }
  
  // Calculate hourly trends if timestamps available
  const trends = calculateTrends(parsedLines);
  
  const analysis = {
    summary: {
      totalLines: lines.length,
      errorCount,
      warningCount,
      timeRange,
      detectedFormat: format
    },
    errorFrequencies,
    warningFrequencies,
    trends
  };
  
  // Store analysis
  upload.analysis = analysis;
  
  logger.info({ uploadId, errorCount, warningCount, totalLines: lines.length }, 'Log analysis complete');
  
  return analysis;
}

/**
 * Calculate error trends over time
 */
function calculateTrends(parsedLines) {
  const linesWithTimestamps = parsedLines.filter(l => l.timestamp);
  
  if (linesWithTimestamps.length === 0) {
    return { available: false, message: 'No timestamps found in log file' };
  }
  
  // Group by hour
  const hourlyMap = new Map();
  
  for (const line of linesWithTimestamps) {
    try {
      const ts = new Date(line.timestamp);
      if (isNaN(ts.getTime())) continue;
      
      const hourKey = ts.toISOString().substring(0, 13) + ':00:00Z'; // Round to hour
      
      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, { total: 0, errors: 0, warnings: 0 });
      }
      
      const entry = hourlyMap.get(hourKey);
      entry.total++;
      
      if (line.level === 'ERROR' || line.level === 'FATAL') {
        entry.errors++;
      } else if (line.level === 'WARN' || line.level === 'WARNING') {
        entry.warnings++;
      }
    } catch (e) {
      // Skip invalid timestamps
    }
  }
  
  // Convert to array and sort by time
  const trendData = Array.from(hourlyMap.entries())
    .map(([timestamp, data]) => ({
      timestamp,
      ...data
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  return {
    available: true,
    data: trendData
  };
}

export default {
  storeUpload,
  getUpload,
  deleteUpload,
  analyzeLog,
  MAX_FILE_SIZE
};
