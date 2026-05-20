export const employees = [
  { id:'EMP001', name:'Rajesh Kumar Patel', dept:'Education', designation:'Senior Teacher', grade:'Grade-B', payScale:'Level-8', doj:'2023-03-15', dob:'1990-05-12', mobile:'9876543210', email:'rajesh@gov.in', status:'Active', category:'General', district:'Ahmedabad', postingStation:'Govt High School, Naranpura', pfNo:'GJ/AHM/12345', panNo:'ABCDE1234F', accountNo:'3721849300', bankName:'SBI', ifsc:'SBIN0001234', nominee:'Priya Patel', bloodGroup:'B+', qualification:'M.Ed', experience:5 },
  { id:'EMP002', name:'Meena Sharma', dept:'Health', designation:'Staff Nurse', grade:'Grade-C', payScale:'Level-6', doj:'2022-08-01', dob:'1992-11-22', mobile:'9765432109', email:'meena@gov.in', status:'Active', category:'OBC', district:'Surat', postingStation:'Civil Hospital, Surat', pfNo:'GJ/SRT/54321', panNo:'FGHIJ5678K', accountNo:'9876543210', bankName:'BOB', ifsc:'BARB0SURATX', nominee:'Suresh Sharma', bloodGroup:'A+', qualification:'B.Sc Nursing', experience:3 },
  { id:'EMP003', name:'Amit Desai', dept:'Revenue', designation:'Talati', grade:'Grade-D', payScale:'Level-4', doj:'2021-01-10', dob:'1988-07-30', mobile:'9654321098', email:'amit@gov.in', status:'On Leave', category:'SC', district:'Vadodara', postingStation:'Vadodara Collectorate', pfNo:'GJ/VDR/98765', panNo:'KLMNO9012P', accountNo:'1234567890', bankName:'PNB', ifsc:'PUNB0VDRXXX', nominee:'Rita Desai', bloodGroup:'O+', qualification:'BA', experience:8 },
  { id:'EMP004', name:'Sunita Joshi', dept:'Education', designation:'Headmaster', grade:'Grade-A', payScale:'Level-10', doj:'2015-06-01', dob:'1978-03-18', mobile:'9543210987', email:'sunita@gov.in', status:'Active', category:'General', district:'Rajkot', postingStation:'Govt Primary School, Rajkot', pfNo:'GJ/RJK/11111', panNo:'QRSTU3456V', accountNo:'5432198760', bankName:'SBI', ifsc:'SBIN0002345', nominee:'Mahesh Joshi', bloodGroup:'AB+', qualification:'M.Ed, M.Phil', experience:15 },
  { id:'EMP005', name:'Vikram Singh', dept:'Police', designation:'Sub-Inspector', grade:'Grade-B', payScale:'Level-7', doj:'2020-09-15', dob:'1995-12-05', mobile:'9432109876', email:'vikram@gov.in', status:'Active', category:'OBC', district:'Bhavnagar', postingStation:'Bhavnagar Police Station', pfNo:'GJ/BVN/22222', panNo:'VWXYZ7890A', accountNo:'6543219870', bankName:'BOI', ifsc:'BKID0BHVNGR', nominee:'Kamla Singh', bloodGroup:'B-', qualification:'BA, Police Training', experience:4 }
];

export const departments = ['Education','Health','Revenue','Police','Agriculture','Water Supply','Urban Development','Finance','Forest','Transport'];
export const designations = ['Clerk','Junior Assistant','Senior Assistant','Talati','Teacher','Senior Teacher','Headmaster','Inspector','Sub-Inspector','Staff Nurse','Supervisor','Officer','Senior Officer'];
export const districts = ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Anand','Mehsana','Kutch'];
export const grades = ['Grade-A','Grade-B','Grade-C','Grade-D'];
export const categories = ['General','OBC','SC','ST','EWS'];

export const payrollData = [
  { empId:'EMP001', name:'Rajesh Kumar Patel', basic:45000, da:18000, hra:9000, ta:1500, gross:73500, pf:5400, tax:3200, net:64900, month:'March 2025', status:'Paid' },
  { empId:'EMP002', name:'Meena Sharma', basic:35000, da:14000, hra:7000, ta:1500, gross:57500, pf:4200, tax:1800, net:51500, month:'March 2025', status:'Paid' },
  { empId:'EMP003', name:'Amit Desai', basic:28000, da:11200, hra:5600, ta:1200, gross:46000, pf:3360, tax:800, net:41840, month:'March 2025', status:'Pending' },
  { empId:'EMP004', name:'Sunita Joshi', basic:55000, da:22000, hra:11000, ta:2000, gross:90000, pf:6600, tax:6500, net:76900, month:'March 2025', status:'Paid' },
  { empId:'EMP005', name:'Vikram Singh', basic:40000, da:16000, hra:8000, ta:1800, gross:65800, pf:4800, tax:2500, net:58500, month:'March 2025', status:'Paid' }
];

export const leaveData = [
  { id:'LV001', empId:'EMP001', name:'Rajesh Kumar Patel', type:'CL', from:'2025-03-10', to:'2025-03-12', days:3, reason:'Family Function', status:'Approved', approver:'HOD Education' },
  { id:'LV002', empId:'EMP003', name:'Amit Desai', type:'ML', from:'2025-03-01', to:'2025-03-31', days:30, reason:'Medical Treatment', status:'Approved', approver:'HOD Revenue' },
  { id:'LV003', empId:'EMP002', name:'Meena Sharma', type:'EL', from:'2025-04-05', to:'2025-04-10', days:6, reason:'Personal', status:'Pending', approver:'' },
  { id:'LV004', empId:'EMP005', name:'Vikram Singh', type:'CL', from:'2025-04-15', to:'2025-04-16', days:2, reason:'Personal work', status:'Pending', approver:'' }
];

export const leaveBalance = [
  { empId:'EMP001', name:'Rajesh Kumar Patel', cl:12, el:30, ml:0, used:3, balance:39 },
  { empId:'EMP002', name:'Meena Sharma', cl:12, el:30, ml:0, used:0, balance:42 },
  { empId:'EMP003', name:'Amit Desai', cl:9, el:24, ml:30, used:30, balance:33 },
  { empId:'EMP004', name:'Sunita Joshi', cl:12, el:30, ml:0, used:0, balance:42 },
  { empId:'EMP005', name:'Vikram Singh', cl:10, el:30, ml:0, used:2, balance:38 }
];

export const transfers = [
  { id:'TR001', empId:'EMP001', name:'Rajesh Kumar Patel', dept:'Education', from:'Mehsana', to:'Ahmedabad', type:'Admin Initiated', date:'2024-06-01', status:'Completed', orderNo:'EDU/TRF/2024/001' },
  { id:'TR002', empId:'EMP005', name:'Vikram Singh', dept:'Police', from:'Ahmedabad', to:'Bhavnagar', type:'Mutual', date:'2023-09-15', status:'Completed', orderNo:'POL/TRF/2023/045' },
  { id:'TR003', empId:'EMP002', name:'Meena Sharma', dept:'Health', from:'Ahmedabad', to:'Surat', type:'Request', date:'2025-03-01', status:'Pending Approval', orderNo:'' }
];

export const promotions = [
  { id:'PR001', empId:'EMP004', name:'Sunita Joshi', dept:'Education', from:'Teacher', to:'Headmaster', date:'2022-06-01', basis:'Seniority+DPC', payOld:'Level-8', payNew:'Level-10', status:'Completed' },
  { id:'PR002', empId:'EMP001', name:'Rajesh Kumar Patel', dept:'Education', from:'Junior Teacher', to:'Senior Teacher', date:'2025-04-01', basis:'DPC', payOld:'Level-6', payNew:'Level-8', status:'Pending DPC' }
];

export const aparData = [
  { id:'APR001', empId:'EMP001', name:'Rajesh Kumar Patel', year:'2023-24', selfGrade:'Very Good', reportingGrade:'Good', reviewingGrade:'Good', finalGrade:'Good', status:'Completed' },
  { id:'APR002', empId:'EMP004', name:'Sunita Joshi', year:'2023-24', selfGrade:'Outstanding', reportingGrade:'Outstanding', reviewingGrade:'Very Good', finalGrade:'Outstanding', status:'Completed' },
  { id:'APR003', empId:'EMP002', name:'Meena Sharma', year:'2024-25', selfGrade:'', reportingGrade:'', reviewingGrade:'', finalGrade:'', status:'Pending Self-Assessment' },
  { id:'APR004', empId:'EMP005', name:'Vikram Singh', year:'2024-25', selfGrade:'Good', reportingGrade:'', reviewingGrade:'', finalGrade:'', status:'Pending Reporting Officer' }
];

export const serviceBookEntries = {
  EMP001: [
    { date:'2023-03-15', event:'Joining', details:'Joined as Junior Teacher at Govt School Mehsana', by:'HOD Education' },
    { date:'2023-06-01', event:'Increment', details:'Annual Increment - Pay revised to Level-7 Step-2', by:'PAO' },
    { date:'2024-01-10', event:'Transfer', details:'Transferred to Ahmedabad - Order EDU/TRF/2024/001', by:'Dept Admin' },
    { date:'2024-06-01', event:'Increment', details:'Annual Increment - Pay revised to Level-8 Step-1', by:'PAO' },
    { date:'2025-01-15', event:'Training', details:'Completed DIKSHA Training - Cert: DK2025001', by:'Training Cell' }
  ],
  EMP004: [
    { date:'2015-06-01', event:'Joining', details:'Joined as Teacher at Govt School Mehsana', by:'HOD Education' },
    { date:'2016-06-01', event:'Increment', details:'Annual Increment', by:'PAO' },
    { date:'2018-04-01', event:'Promotion', details:'Promoted to Senior Teacher - DPC Order 2018', by:'DPC Committee' },
    { date:'2022-06-01', event:'Promotion', details:'Promoted to Headmaster - DPC Order 2022', by:'DPC Committee' },
    { date:'2024-06-01', event:'Increment', details:'Annual Increment - Pay revised to Level-10 Step-4', by:'PAO' }
  ]
};

export const trainings = [
  { id:'TRN001', title:'DIKSHA Digital Teaching', dept:'Education', startDate:'2025-03-10', endDate:'2025-03-15', venue:'GCERT Gandhinagar', capacity:50, enrolled:45, status:'Upcoming', mandatory:true },
  { id:'TRN002', title:'First Aid & Emergency Response', dept:'Health', startDate:'2025-04-01', endDate:'2025-04-03', venue:'Civil Hospital Ahmedabad', capacity:30, enrolled:28, status:'Upcoming', mandatory:true },
  { id:'TRN003', title:'Revenue Record Management', dept:'Revenue', startDate:'2025-02-10', endDate:'2025-02-14', venue:'Mantralaya Gandhinagar', capacity:40, enrolled:40, status:'Completed', mandatory:false },
  { id:'TRN004', title:'Cyber Crime Awareness', dept:'Police', startDate:'2025-05-05', endDate:'2025-05-07', venue:'Police Academy Karai', capacity:60, enrolled:12, status:'Upcoming', mandatory:true }
];

export const retirementList = [
  { empId:'EMP004', name:'Sunita Joshi', dept:'Education', dob:'1978-03-18', retirementDate:'2038-03-31', yearsLeft:13.1, gratuity:850000, gpf:320000, status:'Active' },
  { empId:'EMP003', name:'Amit Desai', dept:'Revenue', dob:'1988-07-30', retirementDate:'2048-07-31', yearsLeft:23.3, gratuity:450000, gpf:180000, status:'Active' }
];

export const grievances = [
  { id:'GRV001', empId:'EMP003', name:'Amit Desai', dept:'Revenue', type:'Service Matter', subject:'Increment not given for FY 2023-24', date:'2025-02-15', status:'Under Review', assignedTo:'HR Dept', priority:'High' },
  { id:'GRV002', empId:'EMP002', name:'Meena Sharma', dept:'Health', type:'Workplace Issue', subject:'Request for medical equipment at posting station', date:'2025-03-01', status:'Resolved', assignedTo:'HOD Health', priority:'Medium' },
  { id:'GRV003', empId:'EMP001', name:'Rajesh Kumar Patel', dept:'Education', type:'Transfer', subject:'Transfer to home district request', date:'2025-03-20', status:'Pending', assignedTo:'', priority:'Low' }
];

export const disciplinary = [
  { id:'DSC001', empId:'EMP003', name:'Amit Desai', dept:'Revenue', charge:'Unauthorized absence for 15 days', startDate:'2024-11-01', inquiryOfficer:'R.K. Mehta, IAS', status:'Inquiry Ongoing', penalty:'' }
];

export const onboardingRequests = [
  { id:'ONB001', candidateId:'RECT2024001', name:'Priya Mehta', post:'Junior Clerk', dept:'Finance', selectedDate:'2025-03-10', joiningDate:'2025-04-01', status:'Documents Verified', documentsSubmitted:true, medicalCleared:true, policeVerification:'Pending' },
  { id:'ONB002', candidateId:'RECT2024002', name:'Kamlesh Prajapati', post:'Teacher', dept:'Education', selectedDate:'2025-03-15', joiningDate:'2025-04-15', status:'Pending Documents', documentsSubmitted:false, medicalCleared:false, policeVerification:'Pending' },
  { id:'ONB003', candidateId:'RECT2024003', name:'Rekha Trivedi', post:'Staff Nurse', dept:'Health', selectedDate:'2025-03-20', joiningDate:'2025-05-01', status:'Joining Formalities', documentsSubmitted:true, medicalCleared:true, policeVerification:'Cleared' }
];

export const monthlyStats = [
  { month:'Oct', payroll:485000, headcount:47 },
  { month:'Nov', payroll:492000, headcount:48 },
  { month:'Dec', payroll:498000, headcount:48 },
  { month:'Jan', payroll:502000, headcount:49 },
  { month:'Feb', payroll:510000, headcount:50 },
  { month:'Mar', payroll:521000, headcount:50 }
];
