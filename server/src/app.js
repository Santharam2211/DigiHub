const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { errorMiddleware } = require('./middlewares/errorMiddleware');
const { ensureUploadsDir, UPLOADS_DIR } = require('./utils/ensureUploadsDir');

ensureUploadsDir();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));

// Static folder for uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Loadtester verification
app.get('/.well-known/loadtester-verify.txt', (req, res) => {
  res.type('text/plain');
  res.send('652e07cc025f8122bc2c7cf49454e8dc3630ac917589e26d');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/winners', require('./routes/winnerRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/nominations', require('./routes/nominationRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/volunteers', require('./routes/volunteerRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/work-requests', require('./routes/workRequestRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/feedback-templates', require('./routes/feedbackTemplateRoutes'));
app.use('/api/templates', require('./routes/registrationTemplateRoutes'));

// Error Middleware
app.use(errorMiddleware);

module.exports = app;
