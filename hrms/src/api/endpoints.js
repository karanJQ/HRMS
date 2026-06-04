import API from './axios';

// Auth
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
  changePassword: (data) => API.put('/auth/change-password', data),
  listUsers: () => API.get('/auth/users'),
  createUser: (data) => API.post('/auth/users', data),
  toggleUser: (id) => API.put(`/auth/users/${id}/toggle`),
};

// Departments
export const deptAPI = {
  list: () => API.get('/departments'),
  create: (data) => API.post('/departments', data),
  update: (id, data) => API.put(`/departments/${id}`, data),
  designations: () => API.get('/departments/designations'),
};

// Employees
export const empAPI = {
  list: (params) => API.get('/employees', { params }),
  get: (empId) => API.get(`/employees/${empId}`),
  create: (data) => API.post('/employees', data),
  update: (empId, data) => API.put(`/employees/${empId}`, data),
  me: () => API.get('/employees/me'),
  birthdays: (params) => API.get('/employees/birthdays', { params }),
  anniversaries: (params) => API.get('/employees/anniversaries', { params }),
  probationAction: (empId, data) => API.post(`/employees/${empId}/probation`, data),
};

// Payroll
export const payrollAPI = {
  list: (params) => API.get('/payroll', { params }),
  getSlip: (empId, month, year) => API.get(`/payroll/slip/${empId}/${month}/${year}`),
  process: (data) => API.post('/payroll/process', data),
  processAll: (data) => API.post('/payroll/process-all', data),
  markPaid: (data) => API.post('/payroll/mark-paid', data),
};

// Leaves
export const leaveAPI = {
  listApplications: (params) => API.get('/leaves/applications', { params }),
  apply: (data) => API.post('/leaves/applications', data),
  review: (id, data) => API.put(`/leaves/applications/${id}/review`, data),
  listBalances: (params) => API.get('/leaves/balances', { params }),
  myBalances: (params) => API.get('/leaves/my-balances', { params }),
  updateBalance: (empId, data) => API.put(`/leaves/balances/${empId}`, data),
};

// Transfers
export const transferAPI = {
  list: (params) => API.get('/transfers', { params }),
  create: (data) => API.post('/transfers', data),
  approve: (id, data) => API.put(`/transfers/${id}/approve`, data),
  reject: (id, data) => API.put(`/transfers/${id}/reject`, data),
};

// APAR
export const aparAPI = {
  list: (params) => API.get('/apar', { params }),
  initiate: (data) => API.post('/apar/initiate', data),
  fillSelf: (id, data) => API.put(`/apar/${id}/self`, data),
  fillReporting: (id, data) => API.put(`/apar/${id}/reporting`, data),
  fillReviewing: (id, data) => API.put(`/apar/${id}/reviewing`, data),
  aiInsights: (id) => API.get(`/apar/${id}/ai-insights`),
  yearlyReportAI: (params) => API.get('/apar/yearly-report-ai', { params }),
};

// Service Book
export const sbAPI = {
  get: (empId) => API.get(`/service-book/${empId}`),
  addEntry: (empId, data) => API.post(`/service-book/${empId}`, data),
  deleteEntry: (id) => API.delete(`/service-book/${id}`),
};

// Training
export const trainingAPI = {
  listPrograms: (params) => API.get('/training/programs', { params }),
  createProgram: (data) => API.post('/training/programs', data),
  updateProgram: (id, data) => API.put(`/training/programs/${id}`, data),
  enroll: (data) => API.post('/training/enroll', data),
  listEnrollments: (params) => API.get('/training/enrollments', { params }),
};


// Grievances
export const grievanceAPI = {
  list: (params) => API.get('/grievances', { params }),
  create: (data) => API.post('/grievances', data),
  assign: (id, data) => API.put(`/grievances/${id}/assign`, data),
  resolve: (id, data) => API.put(`/grievances/${id}/resolve`, data),
  listDisc: () => API.get('/grievances/disciplinary'),
  createDisc: (data) => API.post('/grievances/disciplinary', data),
  updateDisc: (id, data) => API.put(`/grievances/disciplinary/${id}`, data),
};

// Onboarding
export const onboardingAPI = {
  list: (params) => API.get('/onboarding', { params }),
  create: (data) => API.post('/onboarding', data),
  update: (id, data) => API.put(`/onboarding/${id}`, data),
};

// Documents
export const documentAPI = {
  list: (ownerId) => API.get(`/documents/${ownerId}`),
  upload: (data) => API.post('/documents/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  performOCR: (id) => API.post(`/documents/${id}/ocr`),
  updateData: (id, data) => API.put(`/documents/${id}/data`, data),
  delete: (id) => API.delete(`/documents/${id}`),
};

// Reports
export const reportsAPI = {
  dashboard: () => API.get('/reports/dashboard'),
  headcount: () => API.get('/reports/headcount'),
  payroll: (params) => API.get('/reports/payroll', { params }),
  leave: (params) => API.get('/reports/leave', { params }),
  attendanceInsights: () => API.get('/reports/attendance-insights'),
  demographics: () => API.get('/reports/demographics'),
  probationAlerts: (params) => API.get('/reports/probation-alerts', { params }),
};

// Attendance & Biometrics
export const attendanceAPI = {
  get: (params) => API.get('/attendance', { params }),
  calendar: (params) => API.get('/attendance/calendar', { params }),
  stats: (params) => API.get('/attendance/stats', { params }),
  teamCalendar: (params) => API.get('/attendance/team-calendar', { params }),
  sync: (data) => API.post('/attendance/sync', data),
  punch: (data) => API.post('/attendance/punch', data),
  getSettings: () => API.get('/attendance/settings'),
  updateSettings: (data) => API.put('/attendance/settings', data),
  applyRegularization: (data) => API.post('/attendance/regularize', data),
  getRegularizations: () => API.get('/attendance/regularize'),
  reviewRegularization: (id, data) => API.put(`/attendance/regularize/${id}`, data),
  applyWFH: (data) => API.post('/attendance/wfh', data),
  getWFH: () => API.get('/attendance/wfh'),
  reviewWFH: (id, data) => API.put(`/attendance/wfh/${id}`, data),
  getHolidays: (params) => API.get('/attendance/holidays', { params }),
  addHoliday: (data) => API.post('/attendance/holidays', data),
  deleteHoliday: (id) => API.delete(`/attendance/holidays/${id}`),
  exportCSV: (params) => API.get('/attendance/export', { params, responseType: 'blob' }),
};

// Tasks
export const taskAPI = {
  list: () => API.get('/tasks'),
  stats: () => API.get('/tasks/stats'),
  create: (data) => API.post('/tasks', data),
  update: (id, data) => API.put(`/tasks/${id}`, data),
  updateStatus: (id, data) => API.put(`/tasks/${id}/status`, data),
  delete: (id) => API.delete(`/tasks/${id}`),
};

// Notifications
export const notificationAPI = {
  list: () => API.get('/notifications'),
  unreadCount: () => API.get('/notifications/unread'),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/read-all'),
};

// KPI
export const kpiAPI = {
  listCycles:       ()           => API.get('/kpi/cycles'),
  createCycle:      (data)       => API.post('/kpi/cycles', data),
  listReports:      (params)     => API.get('/kpi/reports', { params }),
  createReport:     (data)       => API.post('/kpi/reports', data),
  getReport:        (id)         => API.get(`/kpi/reports/${id}`),
  saveItems:        (id, data)   => API.put(`/kpi/reports/${id}/items`, data),
  submitReport:     (id)         => API.put(`/kpi/reports/${id}/submit`),
  cpoAction:        (id, data)   => API.put(`/kpi/reports/${id}/cpo`, data),
  cooAction:        (id, data)   => API.put(`/kpi/reports/${id}/coo`, data),
  mdAction:         (id, data)   => API.put(`/kpi/reports/${id}/md`, data),
  publishReport:    (id)         => API.put(`/kpi/reports/${id}/publish`),
  aiInsights:       (id)         => API.get(`/kpi/reports/${id}/ai-insights`),
};

// Announcements
export const announcementAPI = {
  list: () => API.get('/announcements'),
  create: (data) => API.post('/announcements', data),
  delete: (id) => API.delete(`/announcements/${id}`),
};
