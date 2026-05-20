# HRMS Backend API — Government Portal

## Tech Stack
- **Runtime**: Node.js (Express.js)
- **Database**: PostgreSQL
- **Auth**: JWT (jsonwebtoken)
- **Password**: bcryptjs

## Quick Start

### 1. Setup Database
```bash
createdb hrms_db        # or create via pgAdmin
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your DB credentials
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Migration
```bash
npm run migrate
```

### 5. Seed Database
```bash
npm run seed
```

### 6. Start Server
```bash
npm run dev       # Development (nodemon)
npm start         # Production
```

## Default Login Credentials (after seed)
| Role         | Email                  | Password      |
|--------------|------------------------|---------------|
| Super Admin  | admin@hrms.gov.in      | Admin@123456  |
| HR Manager   | hr@hrms.gov.in         | Hr@123456     |
| Employee     | rajesh@gov.in          | Emp@123456    |

## Role Hierarchy & Access
| Role         | Access Level                                         |
|--------------|------------------------------------------------------|
| super_admin  | Full access to everything                            |
| hr_manager   | All HRMS modules, create users, process payroll      |
| dept_head    | Own department employees, approve leaves/transfers   |
| hr_staff     | CRUD on most modules, no user management             |
| employee     | Own profile, own leave/payslip/service book          |

## API Endpoints

### Auth
| Method | Path                          | Access       |
|--------|-------------------------------|--------------|
| POST   | /api/v1/auth/login            | Public       |
| GET    | /api/v1/auth/me               | All          |
| PUT    | /api/v1/auth/change-password  | All          |
| GET    | /api/v1/auth/users            | super_admin  |
| POST   | /api/v1/auth/users            | super_admin  |
| PUT    | /api/v1/auth/users/:id/toggle | super_admin  |

### Employees
| Method | Path                    | Access         |
|--------|-------------------------|----------------|
| GET    | /api/v1/employees       | hr_staff+      |
| GET    | /api/v1/employees/me    | All (own)      |
| GET    | /api/v1/employees/:id   | All            |
| POST   | /api/v1/employees       | hr_staff+      |
| PUT    | /api/v1/employees/:id   | hr_staff+      |

### Payroll
| Method | Path                                  | Access      |
|--------|---------------------------------------|-------------|
| GET    | /api/v1/payroll                       | All (scoped)|
| GET    | /api/v1/payroll/slip/:empId/:m/:y     | All (scoped)|
| POST   | /api/v1/payroll/process               | hr_staff+   |
| POST   | /api/v1/payroll/process-all           | hr_manager+ |
| POST   | /api/v1/payroll/mark-paid             | hr_manager+ |

### (Similar pattern for leaves, transfers, promotions, apar, service-book, training, retirement, grievances, onboarding)

### Reports
| Method | Path                        | Access    |
|--------|-----------------------------|-----------|
| GET    | /api/v1/reports/dashboard   | All       |
| GET    | /api/v1/reports/headcount   | hr_staff+ |
| GET    | /api/v1/reports/payroll     | hr_staff+ |
| GET    | /api/v1/reports/leave       | hr_staff+ |
| GET    | /api/v1/reports/retirement  | hr_staff+ |
