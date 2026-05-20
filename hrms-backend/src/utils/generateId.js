const generateEmpId = async (db) => {
  const res = await db.query("SELECT COUNT(*) FROM employees");
  const num = parseInt(res.rows[0].count) + 1;
  return 'EMP' + String(num).padStart(5, '0');
};

const generateCode = (prefix, num) => prefix + String(num).padStart(4, '0');

module.exports = { generateEmpId, generateCode };