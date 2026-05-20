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
};

// Transfers
export const transferAPI = {
  list: (params) => API.get('/transfers', { params }),
  create: (data) => API.post('/transfers', data),
  approve: (id, data) => API.put(`/transfers/${id}/approve`, data),
  reject: (id, data) => API.put(`/transfers/${id}/reject`, data),
};

// Promotions
export const promotionAPI = {
  list: (params) => API.get('/promotions', { params }),
  seniority: (params) => API.get('/promotions/seniority', { params }),
  create: (data) => API.post('/promotions', data),
  approve: (id, data) => API.put(`/promotions/${id}/approve`, data),
};

// APAR
export const aparAPI = {
  list: (params) => API.get('/apar', { params }),
  initiate: (data) => API.post('/apar/initiate', data),
  fillSelf: (id, data) => API.put(`/apar/${id}/self`, data),
  fillReporting: (id, data) => API.put(`/apar/${id}/reporting`, data),
  fillReviewing: (id, data) => API.put(`/apar/${id}/reviewing`, data),
};

// Service Book
export const sbAPI = {
  get: (empId) => API.get(`/service-book/${empId}`),
  addEntry: (empId, data) => API.post(`/service-book/${empId}`, data),
};

// Training
export const trainingAPI = {
  listPrograms: (params) => API.get('/training/programs', { params }),
  createProgram: (data) => API.post('/training/programs', data),
  updateProgram: (id, data) => API.put(`/training/programs/${id}`, data),
  enroll: (data) => API.post('/training/enroll', data),
  listEnrollments: (params) => API.get('/training/enrollments', { params }),
};

// Retirement
export const retirementAPI = {
  list: () => API.get('/retirement'),
  update: (empId, data) => API.put(`/retirement/${empId}`, data),
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

// Reports
export const reportsAPI = {
  dashboard: () => API.get('/reports/dashboard'),
  headcount: () => API.get('/reports/headcount'),
  payroll: (params) => API.get('/reports/payroll', { params }),
  leave: (params) => API.get('/reports/leave', { params }),
  retirement: () => API.get('/reports/retirement'),
};