require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/database');

const DEPTS = [
  { name: 'development', code: 'DEV' },
  { name: 'BA/BDE', code: 'BABDE' },
  { name: 'management', code: 'MGT' },
  { name: 'IT', code: 'IT' },
  { name: 'QA', code: 'QA' },
  { name: 'UI/UX', code: 'UIUX' },
  { name: 'marketing', code: 'MKT' },
  { name: 'sales', code: 'SALES' },
  { name: 'HR', code: 'HR' },
];

const DESIGS = [
  { name: 'Junior Clerk', grade: 'Grade-D', pay_level_min: 2, pay_level_max: 3 },
  { name: 'Senior Clerk', grade: 'Grade-D', pay_level_min: 3, pay_level_max: 4 },
  { name: 'Talati', grade: 'Grade-D', pay_level_min: 4, pay_level_max: 5 },
  { name: 'Junior Assistant', grade: 'Grade-C', pay_level_min: 5, pay_level_max: 6 },
  { name: 'Senior Assistant', grade: 'Grade-C', pay_level_min: 6, pay_level_max: 7 },
  { name: 'Junior Teacher', grade: 'Grade-C', pay_level_min: 6, pay_level_max: 7 },
  { name: 'Teacher', grade: 'Grade-C', pay_level_min: 6, pay_level_max: 8 },
  { name: 'Senior Teacher', grade: 'Grade-B', pay_level_min: 8, pay_level_max: 9 },
  { name: 'Headmaster', grade: 'Grade-A', pay_level_min: 10, pay_level_max: 12 },
  { name: 'Staff Nurse', grade: 'Grade-C', pay_level_min: 6, pay_level_max: 7 },
  { name: 'Sub-Inspector', grade: 'Grade-B', pay_level_min: 7, pay_level_max: 9 },
  { name: 'Inspector', grade: 'Grade-B', pay_level_min: 9, pay_level_max: 11 },
  { name: 'Deputy Collector', grade: 'Grade-A', pay_level_min: 11, pay_level_max: 13 },
  { name: 'District Officer', grade: 'Grade-A', pay_level_min: 12, pay_level_max: 14 },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Seeding departments...');
    const deptMap = {};
    for (const d of DEPTS) {
      const r = await client.query(
        'INSERT INTO departments(name,code) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET code=EXCLUDED.code RETURNING id',
        [d.name, d.code]
      );
      deptMap[d.name] = r.rows[0].id;
    }

    console.log('🌱 Seeding designations...');
    for (const d of DESIGS) {
      await client.query(
        'INSERT INTO designations(name,grade,pay_level_min,pay_level_max) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [d.name, d.grade, d.pay_level_min, d.pay_level_max]
      );
    }

    console.log('🌱 Seeding super admin user...');
    const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@123456', 12);
    const adminRes = await client.query(
      `INSERT INTO users(username, email, password_hash, role, is_active)
       VALUES('superadmin', $1, $2, 'super_admin', true)
       ON CONFLICT(email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [process.env.SEED_ADMIN_EMAIL || 'admin@hrms.gov.in', hash]
    );
    const adminId = adminRes.rows[0].id;

    console.log('🌱 Seeding HR Manager...');
    const hrHash = await bcrypt.hash('Hr@123456', 12);
    await client.query(
      `INSERT INTO users(username, email, password_hash, role, dept_id, is_active)
       VALUES('hr_manager', 'hr@hrms.gov.in', $1, 'hr_manager', $2, true)
       ON CONFLICT(email) DO NOTHING`,
      [hrHash, deptMap['HR']]
    );

    console.log('🌱 Seeding sample employees...');
    const sampleEmployees = [
      { emp_id:'EMP00001', first_name:'Rajesh', last_name:'Kumar Patel', gender:'Male', dob:'1990-05-12', mobile:'9876543210', official_email:'rajesh@gov.in', dept:'development', desig:'Senior Teacher', grade:'Grade-B', pay_level:8, basic_pay:45000, category:'General', district:'Ahmedabad', posting_station:'Govt High School, Naranpura', doj:'2023-03-15', pan_number:'ABCDE1234F', pf_number:'GJ/AHM/12345', bank_name:'SBI', account_number:'3721849300', ifsc_code:'SBIN0001234', blood_group:'B+', qualification:'M.Ed', nominee_name:'Priya Patel' },
      { emp_id:'EMP00002', first_name:'Meena', last_name:'Sharma', gender:'Female', dob:'1992-11-22', mobile:'9765432109', official_email:'meena@gov.in', dept:'IT', desig:'Staff Nurse', grade:'Grade-C', pay_level:6, basic_pay:35000, category:'OBC', district:'Surat', posting_station:'Civil Hospital, Surat', doj:'2022-08-01', pan_number:'FGHIJ5678K', pf_number:'GJ/SRT/54321', bank_name:'BOB', account_number:'9876543210', ifsc_code:'BARB0SURATX', blood_group:'A+', qualification:'B.Sc Nursing', nominee_name:'Suresh Sharma' },
      { emp_id:'EMP00003', first_name:'Amit', last_name:'Desai', gender:'Male', dob:'1988-07-30', mobile:'9654321098', official_email:'amit@gov.in', dept:'sales', desig:'Talati', grade:'Grade-D', pay_level:4, basic_pay:28000, category:'SC', district:'Vadodara', posting_station:'Vadodara Collectorate', doj:'2021-01-10', pan_number:'KLMNO9012P', pf_number:'GJ/VDR/98765', bank_name:'PNB', account_number:'1234567890', ifsc_code:'PUNB0VDRXXX', blood_group:'O+', qualification:'BA', nominee_name:'Rita Desai' },
      { emp_id:'EMP00004', first_name:'Sunita', last_name:'Joshi', gender:'Female', dob:'1978-03-18', mobile:'9543210987', official_email:'sunita@gov.in', dept:'QA', desig:'Headmaster', grade:'Grade-A', pay_level:10, basic_pay:55000, category:'General', district:'Rajkot', posting_station:'Govt Primary School, Rajkot', doj:'2015-06-01', pan_number:'QRSTU3456V', pf_number:'GJ/RJK/11111', bank_name:'SBI', account_number:'5432198760', ifsc_code:'SBIN0002345', blood_group:'AB+', qualification:'M.Ed, M.Phil', nominee_name:'Mahesh Joshi' },
      { emp_id:'EMP00005', first_name:'Vikram', last_name:'Singh', gender:'Male', dob:'1995-12-05', mobile:'9432109876', official_email:'vikram@gov.in', dept:'management', desig:'Sub-Inspector', grade:'Grade-B', pay_level:7, basic_pay:40000, category:'OBC', district:'Bhavnagar', posting_station:'Bhavnagar Police Station', doj:'2020-09-15', pan_number:'VWXYZ7890A', pf_number:'GJ/BVN/22222', bank_name:'BOI', account_number:'6543219870', ifsc_code:'BKID0BHVNGR', blood_group:'B-', qualification:'BA, Police Training', nominee_name:'Kamla Singh' },
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
          grade,pay_level,basic_pay,category,district,posting_station,doj,dor,pan_number,pf_number,
          bank_name,account_number,ifsc_code,blood_group,qualification,nominee_name,status,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'Active',$26)
         ON CONFLICT(emp_id) DO NOTHING`,
        [e.emp_id, e.first_name, e.last_name, e.gender, e.dob, e.mobile, e.official_email, deptId, desigId,
         e.grade, e.pay_level, e.basic_pay, e.category, e.district, e.posting_station, e.doj, dor.toISOString().split('T')[0],
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
      { emp_id:'EMP00001', basic:45000, da_pct:42, hra_pct:20, ta:1500 },
      { emp_id:'EMP00002', basic:35000, da_pct:42, hra_pct:20, ta:1500 },
      { emp_id:'EMP00003', basic:28000, da_pct:42, hra_pct:20, ta:1200 },
      { emp_id:'EMP00004', basic:55000, da_pct:42, hra_pct:20, ta:2000 },
      { emp_id:'EMP00005', basic:40000, da_pct:42, hra_pct:20, ta:1800 },
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
       ('DIKSHA Digital Teaching', $1, '2025-03-10', '2025-03-15', 'GCERT Gandhinagar', 50, true, 'Upcoming', $2),
       ('First Aid & Emergency Response', $3, '2025-04-01', '2025-04-03', 'Civil Hospital Ahmedabad', 30, true, 'Upcoming', $2),
       ('Revenue Record Management', $4, '2025-02-10', '2025-02-14', 'Mantralaya Gandhinagar', 40, false, 'Completed', $2)
       ON CONFLICT DO NOTHING`,
       [deptMap['development'], adminId, deptMap['IT'], deptMap['sales']]
    );

    // Sample grievance
    await client.query(
      `INSERT INTO grievances(emp_id, grievance_type, subject, description, priority, status)
       VALUES('EMP00003', 'Service Matter', 'Increment not given for FY 2023-24', 
              'Annual increment due on April 2023 has not been credited to salary.', 'High', 'Under Review')
       ON CONFLICT DO NOTHING`
    );

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('   Super Admin : admin@hrms.gov.in / Admin@123456');
    console.log('   HR Manager  : hr@hrms.gov.in / Hr@123456');
    console.log('   Employee    : rajesh@gov.in / Emp@123456');
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