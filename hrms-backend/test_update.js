const { query } = require('./src/config/database');
const jwt = require('jsonwebtoken');

(async () => {
  try {
    const token = jwt.sign(
      { id: 1, role: 'super_admin', emp_id: 'EMP00000', username: 'admin' }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '1h' }
    );
    
    const docRes = await query("SELECT id FROM employee_documents WHERE doc_type='Aadhar' LIMIT 1");
    if (!docRes.rows.length) return console.log('No document found');
    const docId = docRes.rows[0].id;

    const res = await fetch(`http://localhost:5000/api/v1/documents/${docId}/data`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: { name: 'Rajesh Kumar Patel', dob: '11/06/2003', gender: 'Male', aadhar_number: '934864701987' } })
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Success:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
