const express = require('express');
const router = express.Router();
const { 
    submitFeedback, 
    getEventFeedback, 
    checkFeedbackStatus,
    sendFeedbackEmails,
    getFeedbackAnalytics,
    exportFeedbackExcel,
    exportFeedbackPDF
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
    .post(protect, submitFeedback);

router.route('/event/:eventId')
    .get(protect, getEventFeedback);

router.route('/analytics/:eventId')
    .get(protect, getFeedbackAnalytics);

router.route('/export/excel/:eventId')
    .get(protect, exportFeedbackExcel);

router.route('/export/pdf/:eventId')
    .get(protect, exportFeedbackPDF);

router.route('/send/:eventId')
    .post(protect, sendFeedbackEmails);

router.route('/check/:eventId')
    .get(protect, checkFeedbackStatus);

module.exports = router;
