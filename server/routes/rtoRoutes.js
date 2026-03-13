const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAdmin } = require('../middleware/auth');
const {
  uploadRTOData,
  scanBarcode,
  bulkScanBarcodes,
  getRTOReport,
  getCalendarData,
  getRTODataByDate,
  getScanResultsByDate,
  getOverallUploadSummary,
  getAllUploadedData,
  deleteUploadedData,
  deleteAllUploadedData,
  getCourierCounts,
  deleteUnmatchedScan,
  bulkDeleteUnmatchedScans,
  reconcileUnmatchedScan,
  getReconcilableScans,
} = require('../controllers/rtoController');
const {
  triggerBackup,
  getBackups,
  cleanupBackups,
} = require('../controllers/backupController');


// Upload RTO Excel file (supports single or multiple files)
router.post(
  '/upload',
  (req, res, next) => {
    console.log('📤 Step 1: Upload route hit');

    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'nimbuFile', maxCount: 1 },
      { name: 'shipOwlFile', maxCount: 1 },
      { name: 'shipOwlNimbusFile', maxCount: 1 }
    ])(req, res, (err) => {

      console.log('📤 Step 2: Multer middleware executed');

      if (err) {
        console.error('❌ Step 3: Multer error:', err);

        if (err.code === 'LIMIT_FILE_SIZE') {
          console.log('❌ File size limit exceeded');
          return res.status(400).json({
            error: 'File too large. Maximum size is 10MB per file.',
          });
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          console.log('❌ Unexpected field name received');
          return res.status(400).json({
            error:
              'Unexpected field name. Please use "file" for Parcel X, "nimbuFile" for NimbusPost and "shipOwlFile" for ShipOwl. For ShipOwl Nimbus, use "shipOwlNimbusFile".',
          });
        }

        console.log('❌ Generic multer error');
        return res.status(400).json({
          error: err.message || 'File upload failed',
        });
      }

      console.log('✅ Step 4: Files received from multer');
      console.log('req.files object:', req.files);
      console.log('req.file object:', req.file);

      // Normalize files
      if (req.files) {
        console.log('📦 Step 5: Normalizing multiple files');

        req.files = [
          ...(req.files.file || []),
          ...(req.files.nimbuFile || []),
          ...(req.files.shipOwlFile || []),
          ...(req.files.shipOwlNimbusFile || [])
        ];

        console.log('📦 Normalized files array:', req.files);
      } else if (req.file) {
        console.log('📦 Step 6: Single file fallback');

        req.files = [req.file];
      } else {
        console.log('⚠️ Step 7: No files found in request');
      }

      console.log('✅ Step 8: Multer upload middleware completed');
      next();
    });
  },

  (req, res, next) => {
    console.log('➡️ Step 9: Passing control to uploadRTOData controller');
    next();
  },

  uploadRTOData
);

// Scan barcode
router.post('/scan', scanBarcode);

// Bulk scan barcodes from Excel file
router.post('/scan/bulk', upload.single('file'), bulkScanBarcodes);

// Get RTO report for specific date
router.get('/report/:date', getRTOReport);

// Get calendar data
router.get('/calendar', getCalendarData);

// Get RTO data for specific date
router.get('/data/:date', getRTODataByDate);

// Get scan results for specific date
router.get('/scans/:date', getScanResultsByDate);

// Get overall upload summary across all dates
router.get('/summary', getOverallUploadSummary);

// Get all uploaded data
router.get('/uploads', getAllUploadedData);

// Delete uploaded data by date (Admin only)
router.delete('/uploads/:date', requireAdmin, deleteUploadedData);

// Delete all uploaded data (Admin only)
router.delete('/uploads', requireAdmin, deleteAllUploadedData);

// Get courier counts for specific date
router.get('/courier-counts/:date', getCourierCounts);

// Delete unmatched scan result (Admin only)
router.delete('/scan/unmatched', requireAdmin, deleteUnmatchedScan);

// Bulk delete unmatched scan results (Admin only)
router.delete('/scan/unmatched/bulk', requireAdmin, bulkDeleteUnmatchedScans);

// Reconcile unmatched scan to matched (move to correct date)
router.post('/scan/reconcile', reconcileUnmatchedScan);

// Get reconcilable unmatched scans for a date
router.get('/reconcilable/:date', getReconcilableScans);

// Backup routes (Admin only)
router.post('/backup/trigger', requireAdmin, triggerBackup);
router.get('/backup/list', requireAdmin, getBackups);
router.post('/backup/cleanup', requireAdmin, cleanupBackups);

module.exports = router;
