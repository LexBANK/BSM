import logAnalysisService from '../services/logAnalysisService.js';
import logger from '../utils/logger.js';

/**
 * Upload log file
 */
export async function uploadLog(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        correlationId: req.correlationId
      });
    }
    
    const { originalname, buffer, size } = req.file;
    
    // Check file size
    if (size > logAnalysisService.MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${logAnalysisService.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        correlationId: req.correlationId
      });
    }
    
    // Convert buffer to string
    const content = buffer.toString('utf-8');
    
    // Store upload
    const uploadData = logAnalysisService.storeUpload(originalname, content);
    
    logger.info({ 
      uploadId: uploadData.uploadId, 
      filename: originalname,
      correlationId: req.correlationId 
    }, 'Log file uploaded');
    
    res.json({
      ...uploadData,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error({ error, correlationId: req.correlationId }, 'Upload error');
    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message,
      correlationId: req.correlationId
    });
  }
}

/**
 * Analyze uploaded log file
 */
export async function analyzeLog(req, res) {
  try {
    const { uploadId, format = 'auto' } = req.body;
    
    if (!uploadId) {
      return res.status(400).json({
        error: 'uploadId is required',
        correlationId: req.correlationId
      });
    }
    
    const analysis = logAnalysisService.analyzeLog(uploadId, format);
    
    logger.info({ 
      uploadId, 
      errorCount: analysis.summary.errorCount,
      correlationId: req.correlationId 
    }, 'Log analysis complete');
    
    res.json({
      uploadId,
      analysis,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error({ error, correlationId: req.correlationId }, 'Analysis error');
    
    if (error.message === 'Upload not found') {
      return res.status(404).json({
        error: 'Upload not found',
        message: 'The specified uploadId does not exist or has expired',
        correlationId: req.correlationId
      });
    }
    
    res.status(500).json({
      error: 'Failed to analyze log',
      message: error.message,
      correlationId: req.correlationId
    });
  }
}

/**
 * Get analysis results
 */
export async function getResults(req, res) {
  try {
    const { uploadId } = req.params;
    
    const upload = logAnalysisService.getUpload(uploadId);
    
    if (!upload) {
      return res.status(404).json({
        error: 'Upload not found',
        correlationId: req.correlationId
      });
    }
    
    if (!upload.analysis) {
      return res.status(400).json({
        error: 'Analysis not yet performed',
        message: 'Call POST /api/logs/analyze first',
        correlationId: req.correlationId
      });
    }
    
    res.json({
      uploadId,
      filename: upload.filename,
      uploadedAt: new Date(upload.uploadedAt).toISOString(),
      analysis: upload.analysis,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error({ error, correlationId: req.correlationId }, 'Get results error');
    res.status(500).json({
      error: 'Failed to retrieve results',
      message: error.message,
      correlationId: req.correlationId
    });
  }
}

/**
 * Delete uploaded log
 */
export async function deleteLog(req, res) {
  try {
    const { uploadId } = req.params;
    
    const deleted = logAnalysisService.deleteUpload(uploadId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Upload not found',
        correlationId: req.correlationId
      });
    }
    
    logger.info({ uploadId, correlationId: req.correlationId }, 'Log upload deleted');
    
    res.json({
      success: true,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error({ error, correlationId: req.correlationId }, 'Delete error');
    res.status(500).json({
      error: 'Failed to delete log',
      message: error.message,
      correlationId: req.correlationId
    });
  }
}

export default {
  uploadLog,
  analyzeLog,
  getResults,
  deleteLog
};
