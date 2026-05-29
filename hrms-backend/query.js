const { query } = require('./src/config/database');
query("SELECT extracted_data FROM employee_documents WHERE doc_type='Aadhar'")
  .then(res => console.log(JSON.stringify(res.rows, null, 2)))
  .catch(console.error)
  .finally(() => process.exit(0));
