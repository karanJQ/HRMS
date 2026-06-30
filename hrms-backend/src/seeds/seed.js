require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/database');

const DEPTS = [
  { name: 'Development', code: 'DEV' },
  { name: 'BA/BDE', code: 'BABDE' },
  { name: 'Management', code: 'MGT' },
  { name: 'IT', code: 'IT' },
  { name: 'QA', code: 'QA' },
  { name: 'UI/UX', code: 'UIUX' },
  { name: 'Marketing', code: 'MKT' },
  { name: 'Sales', code: 'SALES' },
  { name: 'HR', code: 'HR' },
];

const DESIGS = [
  { name: 'Intern', pay_level_min: 1, pay_level_max: 2 },
  { name: 'Junior Developer', pay_level_min: 2, pay_level_max: 3 },
  { name: 'Developer', pay_level_min: 3, pay_level_max: 5 },
  { name: 'Senior Developer', pay_level_min: 5, pay_level_max: 7 },
  { name: 'Lead Developer', pay_level_min: 7, pay_level_max: 9 },
  { name: 'Junior QA Engineer', pay_level_min: 2, pay_level_max: 3 },
  { name: 'QA Engineer', pay_level_min: 3, pay_level_max: 5 },
  { name: 'Senior QA Engineer', pay_level_min: 5, pay_level_max: 7 },
  { name: 'UI/UX Designer', pay_level_min: 4, pay_level_max: 6 },
  { name: 'Senior UI/UX Designer', pay_level_min: 6, pay_level_max: 8 },
  { name: 'Business Analyst', pay_level_min: 4, pay_level_max: 6 },
  { name: 'Senior Business Analyst', pay_level_min: 6, pay_level_max: 8 },
  { name: 'Project Manager', pay_level_min: 8, pay_level_max: 10 },
  { name: 'HR Executive', pay_level_min: 3, pay_level_max: 5 },
  { name: 'HR Manager', pay_level_min: 7, pay_level_max: 9 },
  { name: 'Sales Executive', pay_level_min: 3, pay_level_max: 5 },
  { name: 'Sales Manager', pay_level_min: 7, pay_level_max: 9 },
  { name: 'Team Lead', pay_level_min: 7, pay_level_max: 9 },
  { name: 'Engineering Manager', pay_level_min: 10, pay_level_max: 12 },
  { name: 'Chief Technology Officer', pay_level_min: 12, pay_level_max: 14 },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Seeding departments...');
    const deptMap = {};
    for (const d of DEPTS) {
      const r = await client.query(
        'INSERT INTO departments(name,code) VALUES($1,$2) ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name RETURNING id',
        [d.name, d.code]
      );
      deptMap[d.name] = r.rows[0].id;
    }

    console.log('🌱 Seeding designations...');
    for (const d of DESIGS) {
      await client.query(
        'INSERT INTO designations(name,pay_level_min,pay_level_max) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [d.name, d.pay_level_min, d.pay_level_max]
      );
    }

    console.log('🌱 Seeding super admin user...');
    const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@123456', 12);
    const adminRes = await client.query(
      `INSERT INTO users(username, email, password_hash, role, is_active)
       VALUES('superadmin', $1, $2, 'super_admin', true)
       ON CONFLICT(email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [process.env.SEED_ADMIN_EMAIL || 'admin@company.com', hash]
    );
    const adminId = adminRes.rows[0].id;

    console.log('🌱 Seeding HR Manager...');
    const hrHash = await bcrypt.hash('Hr@123456', 12);
    await client.query(
      `INSERT INTO users(username, email, password_hash, role, dept_id, is_active)
       VALUES('hr_manager', 'hr@company.com', $1, 'hr_manager', $2, true)
       ON CONFLICT(email) DO NOTHING`,
      [hrHash, deptMap['HR']]
    );

    console.log('🌱 Seeding sample employees...');
    const sampleEmployees = [
      { emp_id:'EMP00001', first_name:'Rajesh', last_name:'Kumar', gender:'Male', dob:'1990-05-12', mobile:'9876543210', official_email:'rajesh.kumar@company.com', dept:'Development', desig:'Senior Developer', pay_level:6, basic_pay:75000, category:'General', doj:'2021-03-15', pan_number:'ABCDE1234F', pf_number:'GJ/AHM/12345', bank_name:'HDFC Bank', account_number:'3721849300', ifsc_code:'HDFC0001234', blood_group:'B+', qualification:'B.Tech (CS)', nominee_name:'Priya Kumar' },
      { emp_id:'EMP00002', first_name:'Meena', last_name:'Shah', gender:'Female', dob:'1992-11-22', mobile:'9765432109', official_email:'meena.shah@company.com', dept:'QA', desig:'QA Engineer', pay_level:4, basic_pay:55000, category:'OBC', doj:'2022-08-01', pan_number:'FGHIJ5678K', pf_number:'GJ/SRT/54321', bank_name:'ICICI Bank', account_number:'9876543210', ifsc_code:'ICIC0SURATX', blood_group:'A+', qualification:'B.E (IT)', nominee_name:'Suresh Shah' },
      { emp_id:'EMP00003', first_name:'Amit', last_name:'Desai', gender:'Male', dob:'1988-07-30', mobile:'9654321098', official_email:'amit.desai@company.com', dept:'Sales', desig:'Sales Executive', pay_level:3, basic_pay:45000, category:'General', doj:'2021-01-10', pan_number:'KLMNO9012P', pf_number:'GJ/VDR/98765', bank_name:'Axis Bank', account_number:'1234567890', ifsc_code:'UTIB0VDRXXX', blood_group:'O+', qualification:'BBA', nominee_name:'Rita Desai' },
      { emp_id:'EMP00004', first_name:'Sunita', last_name:'Joshi', gender:'Female', dob:'1978-03-18', mobile:'9543210987', official_email:'sunita.joshi@company.com', dept:'Management', desig:'Project Manager', pay_level:9, basic_pay:95000, category:'General', doj:'2015-06-01', pan_number:'QRSTU3456V', pf_number:'GJ/RJK/11111', bank_name:'SBI', account_number:'5432198760', ifsc_code:'SBIN0002345', blood_group:'AB+', qualification:'MBA, B.Tech', nominee_name:'Mahesh Joshi' },
      { emp_id:'EMP00005', first_name:'Vikram', last_name:'Singh', gender:'Male', dob:'1995-12-05', mobile:'9432109876', official_email:'vikram.singh@company.com', dept:'UI/UX', desig:'UI/UX Designer', pay_level:5, basic_pay:60000, category:'OBC', doj:'2020-09-15', pan_number:'VWXYZ7890A', pf_number:'GJ/GNR/22222', bank_name:'Kotak Bank', account_number:'6543219870', ifsc_code:'KKBK0GNDNGR', blood_group:'B-', qualification:'B.Des', nominee_name:'Kamla Singh' },
    ];

    const desigRes = await client.query('SELECT id, name FROM designations');
    const desigMap = {};
    desigRes.rows.forEach(d => { desigMap[d.name] = d.id; });

    for (const e of sampleEmployees) {
      const deptId = deptMap[e.dept];
      const desigId = desigMap[e.desig] || null;
      const dor = new Date(e.dob);
      dor.setFullYear(dor.getFullYear() + 60);
      await client.query(
        `INSERT INTO employees(emp_id,first_name,last_name,gender,dob,mobile,official_email,dept_id,designation_id,
          pay_level,basic_pay,category,doj,dor,pan_number,pf_number,
          bank_name,account_number,ifsc_code,blood_group,qualification,nominee_name,status,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'Active',$23)
         ON CONFLICT(emp_id) DO NOTHING`,
        [e.emp_id, e.first_name, e.last_name, e.gender, e.dob, e.mobile, e.official_email, deptId, desigId,
         e.pay_level, e.basic_pay, e.category, e.doj, dor.toISOString().split('T')[0],
         e.pan_number, e.pf_number, e.bank_name, e.account_number, e.ifsc_code, e.blood_group, e.qualification, e.nominee_name, adminId]
      );

      // Create user account for each employee
      const empHash = await bcrypt.hash('Emp@123456', 12);
      const username = `${e.first_name.toLowerCase()}.${e.last_name.split(' ')[0].toLowerCase()}`;
      await client.query(
        `INSERT INTO users(emp_id, username, email, password_hash, role, dept_id, is_active)
         VALUES($1,$2,$3,$4,'employee',$5,true) ON CONFLICT(email) DO NOTHING`,
        [e.emp_id, username, e.official_email, empHash, deptMap[e.dept]]
      );

      // Leave balance
      const yr = new Date().getFullYear();
      await client.query(
        `INSERT INTO leave_balances(emp_id, year) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [e.emp_id, yr]
      );

      // Service book joining entry
      await client.query(
        `INSERT INTO service_book_entries(emp_id, event_date, event_type, details, recorded_by, recorded_by_name, is_verified)
         VALUES($1,$2,'Joining',$3,$4,'Super Admin',true) ON CONFLICT DO NOTHING`,
        [e.emp_id, e.doj, `Joined as ${e.desig} at ${e.posting_station}`, adminId]
      );

      // Retirement tracking
      await client.query(
        `INSERT INTO retirement_tracking(emp_id, retirement_date) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [e.emp_id, dor.toISOString().split('T')[0]]
      );
    }

    // Sample payroll for March 2025
    console.log('🌱 Seeding sample payroll...');
    const payrollSamples = [
      { emp_id:'EMP00001', basic:75000, da_pct:0, hra_pct:20, ta:2000 },
      { emp_id:'EMP00002', basic:55000, da_pct:0, hra_pct:20, ta:1500 },
      { emp_id:'EMP00003', basic:45000, da_pct:0, hra_pct:20, ta:1200 },
      { emp_id:'EMP00004', basic:95000, da_pct:0, hra_pct:20, ta:3000 },
      { emp_id:'EMP00005', basic:60000, da_pct:0, hra_pct:20, ta:2000 },
    ];
    for (const p of payrollSamples) {
      const da = Math.round(p.basic * p.da_pct / 100);
      const hra = Math.round(p.basic * p.hra_pct / 100);
      const gross = p.basic + da + hra + p.ta;
      const pf_emp = Math.round(p.basic * 0.12);
      const tds = gross > 50000 ? Math.round((gross - 50000) * 0.1) : 0;
      const total_ded = pf_emp + 200 + tds;
      const net = gross - total_ded;
      await client.query(
        `INSERT INTO payroll_records(emp_id,month,year,basic_pay,da_percentage,da_amount,hra_percentage,hra_amount,
          ta_amount,gross_pay,pf_employee,pf_employer,professional_tax,tds,total_deductions,net_pay,status,processed_by)
         VALUES($1,3,2025,$2,$3,$4,20,$5,$6,$7,$8,$9,200,$10,$11,$12,'Paid',$13)
         ON CONFLICT(emp_id,month,year) DO NOTHING`,
        [p.emp_id, p.basic, p.da_pct, da, hra, p.ta, gross, pf_emp, Math.round(p.basic*0.12), tds, total_ded, net, adminId]
      );
    }

    // Sample training
    console.log('🌱 Seeding training programs...');
    await client.query(
      `INSERT INTO training_programs(title, dept_id, start_date, end_date, venue, capacity, is_mandatory, status, created_by)
       VALUES
       ('Advanced React & Next.js Workshop', $1, '2025-03-10', '2025-03-12', 'Head Office, Ahmedabad', 30, true, 'Upcoming', $2),
       ('Agile & Scrum Certification Prep', $3, '2025-04-01', '2025-04-03', 'Online (Zoom)', 50, true, 'Upcoming', $2),
       ('Effective Communication & Presentation Skills', $4, '2025-02-10', '2025-02-11', 'Conference Room A, Ahmedabad', 40, false, 'Completed', $2)
       ON CONFLICT DO NOTHING`,
       [deptMap['development'], adminId, deptMap['management'], deptMap['sales']]
    );

    // Sample grievance
    await client.query(
      `INSERT INTO grievances(emp_id, grievance_type, subject, description, priority, status)
       VALUES('EMP00003', 'Compensation', 'Performance bonus not credited for Q3 2024',
              'The performance bonus for Q3 2024 was approved by the manager but has not been credited to the salary account yet.', 'High', 'Under Review')
       ON CONFLICT DO NOTHING`
    );

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('   Super Admin : admin@company.com / Admin@123456');
    console.log('   HR Manager  : hr@company.com / Hr@123456');
    console.log('   Employee    : rajesh.kumar@company.com / Emp@123456');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();