import express from 'express';
import multer from 'multer';
import logsController from '../controllers/logsController.js';

const router = express.Router();

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept .log, .txt, .json files
    const allowedExtensions = ['.log', '.txt', '.json'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .log, .txt, and .json files are allowed'));
    }
  }
});

/**
 * POST /api/logs/upload
 * Upload a log file
 */
router.post('/upload', upload.single('file'), logsController.uploadLog);

/**
 * POST /api/logs/analyze
 * Analyze an uploaded log file
 */
router.post('/analyze', logsController.analyzeLog);

/**
 * GET /api/logs/results/:uploadId
 * Get analysis results for a specific upload
 */
router.get('/results/:uploadId', logsController.getResults);

/**
 * DELETE /api/logs/:uploadId
 * Delete an uploaded log file
 */
router.delete('/:uploadId', logsController.deleteLog);

export default router;
