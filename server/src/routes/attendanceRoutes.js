const express = require('express');
const router = express.Router();
const { markAttendance, getAttendanceReport, getAttendanceRecords, exportReport, exportPDFReport } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/mark', protect, markAttendance);
router.get('/report/:eventId', protect, getAttendanceReport);
router.get('/records/:eventId', protect, getAttendanceRecords);
router.get('/export/:eventId', protect, exportReport);
router.post('/export-pdf/:eventId', protect, exportPDFReport);

module.exports = router;
