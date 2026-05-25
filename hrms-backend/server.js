require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV }));

// ── API Routes ────────────────────────────────────────────────────
const prefix = '/api/v1';
app.use(`${prefix}/auth`,        require('./src/routes/auth.routes'));
app.use(`${prefix}/departments`, require('./src/routes/department.routes'));
app.use(`${prefix}/employees`,   require('./src/routes/employee.routes'));
app.use(`${prefix}/payroll`,     require('./src/routes/payroll.routes'));
app.use(`${prefix}/leaves`,      require('./src/routes/leave.routes'));
app.use(`${prefix}/transfers`,   require('./src/routes/transfer.routes'));
app.use(`${prefix}/promotions`,  require('./src/routes/promotion.routes'));
app.use(`${prefix}/apar`,        require('./src/routes/apar.routes'));
app.use(`${prefix}/service-book`,require('./src/routes/servicebook.routes'));
app.use(`${prefix}/training`,    require('./src/routes/training.routes'));
app.use(`${prefix}/retirement`,  require('./src/routes/retirement.routes'));
app.use(`${prefix}/grievances`,  require('./src/routes/grievance.routes'));
app.use(`${prefix}/onboarding`,  require('./src/routes/onboarding.routes'));
app.use(`${prefix}/reports`,     require('./src/routes/reports.routes'));
app.use(`${prefix}/tasks`,       require('./src/routes/task.routes'));
app.use(`${prefix}/attendance`,  require('./src/routes/attendance.routes'));
app.use(`${prefix}/notifications`, require('./src/routes/notification.routes'));
app.use(`${prefix}/documents`, require('./src/routes/document.routes'));
// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` }));

// ── Error handler ─────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 HRMS API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API base    : http://localhost:${PORT}/api/v1\n`);
});

module.exports = app;
