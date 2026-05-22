const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const { year, status } = req.query;
  // Default to 2024-25 (active appraisal cycle) if no year specified
  const fy = year || '2024-25';
  const conditions = ['a.financial_year=$1'], params = [fy];
  let idx = 2;
  if (status) { conditions.push(`a.status=$${idx++}`); params.push(status); }
  if (req.user.role==='employee') { conditions.push(`a.emp_id=$${idx++}`); params.push(req.user.emp_id); }
  if (req.user.role==='dept_head') { conditions.push(`e.dept_id=$${idx++}`); params.push(req.user.dept_id); }
  try {
    const result = await query(
      `SELECT a.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
       FROM apar_records a JOIN employees e ON e.emp_id=a.emp_id
       JOIN departments d ON d.id=e.dept_id
       WHERE ${conditions.join(' AND ')} ORDER BY e.first_name`, params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.initiate = async (req, res) => {
  const { emp_id, financial_year } = req.body;
  if (!emp_id||!financial_year) return error(res,'emp_id and financial_year required.',400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }
    const result = await query(
      `INSERT INTO apar_records(emp_id,financial_year) VALUES($1,$2)
       ON CONFLICT(emp_id,financial_year) DO NOTHING RETURNING *`,
      [emp_id, financial_year]
    );
    return success(res, result.rows[0]||null, 'APAR initiated', 201);
  } catch (err) { return error(res, err.message); }
};

const statusAfterFill = (self, reporting, reviewing) => {
  if (reviewing) return 'Completed';
  if (reporting) return 'Pending Reviewing Officer';
  if (self) return 'Pending Reporting Officer';
  return 'Pending Self-Assessment';
};

exports.fillSelf = async (req, res) => {
  const { id } = req.params;
  const { self_grade, self_remarks } = req.body;
  if (!self_grade) return error(res,'self_grade required.',400);
  try {
    const cur = await query('SELECT * FROM apar_records WHERE id=$1',[id]);
    if (!cur.rows.length) return error(res,'APAR not found.',404);
    const r = cur.rows[0];
    const status = statusAfterFill(self_grade, r.reporting_grade, r.reviewing_grade);
    const result = await query(
      `UPDATE apar_records SET self_grade=$1, self_remarks=$2, self_date=CURRENT_DATE, status=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [self_grade, self_remarks||null, status, id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.fillReporting = async (req, res) => {
  const { id } = req.params;
  const { reporting_grade, reporting_remarks } = req.body;
  if (!reporting_grade) return error(res,'reporting_grade required.',400);
  try {
    const cur = await query('SELECT * FROM apar_records WHERE id=$1',[id]);
    if (!cur.rows.length) return error(res,'APAR not found.',404);
    const r = cur.rows[0];
    const status = statusAfterFill(r.self_grade, reporting_grade, r.reviewing_grade);
    const result = await query(
      `UPDATE apar_records SET reporting_grade=$1, reporting_remarks=$2, reporting_date=CURRENT_DATE,
       reporting_officer_id=$3, status=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [reporting_grade, reporting_remarks||null, req.user.id, status, id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.fillReviewing = async (req, res) => {
  const { id } = req.params;
  const { reviewing_grade, reviewing_remarks, final_grade, final_remarks } = req.body;
  if (!reviewing_grade||!final_grade) return error(res,'reviewing_grade and final_grade required.',400);
  try {
    const result = await query(
      `UPDATE apar_records SET reviewing_grade=$1, reviewing_remarks=$2, reviewing_date=CURRENT_DATE,
       reviewing_officer_id=$3, final_grade=$4, final_remarks=$5, status='Completed', updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [reviewing_grade, reviewing_remarks||null, req.user.id, final_grade, final_remarks||null, id]
    );
    return success(res, result.rows[0]);
  } catch (err) { return error(res, err.message); }
};

exports.generateAIInsights = async (req, res) => {
  const { id } = req.params;
  try {
    const cur = await query(
      `SELECT a.*, e.first_name || ' ' || e.last_name as emp_name, d.name as dept_name
       FROM apar_records a
       JOIN employees e ON e.emp_id = a.emp_id
       JOIN departments d ON d.id = e.dept_id
       WHERE a.id = $1`,
      [id]
    );
    if (!cur.rows.length) return error(res, 'APAR not found.', 404);
    
    const record = cur.rows[0];
    const remarks = record.self_remarks || 'No remarks provided.';
    const grade = record.self_grade || 'None';
    const empName = record.emp_name;
    const deptName = record.dept_name;
    const financialYear = record.financial_year;
    
    let insights = null;
    
    if (process.env.GROQ_API_KEY) {
      try {
        const prompt = `
Employee: ${empName}
Department: ${deptName}
Financial Year: ${financialYear}
Self-Assessment Grade: ${grade}
Self-Remarks: "${remarks}"
Reporting Officer Grade: ${record.reporting_grade || 'Not reviewed yet'}
Reporting Officer Remarks: "${record.reporting_remarks || 'No remarks yet'}"
`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are an AI-driven Government HRMS assistant specializing in performance evaluation and KPI tracking. 
Analyze the provided employee performance data and self-assessment remarks.
Generate a structured performance evaluation and KPI tracking alignment in JSON format.
The JSON must contain exactly these 5 keys (do not add additional root keys, markdown code blocks, or extra text):
{
  "summary": "A concise professional summary of the performance self-assessment, including sentiment and consistency.",
  "kpi_alignment": "An analysis of the alignment of the employee's self-remarks with department goals and KPIs (e.g., expressed as a percentage or descriptive rating).",
  "recommendation": "Suggested action points, training requirements, or next steps for development.",
  "key_strengths": ["strength1", "strength2"],
  "areas_for_improvement": ["area1"]
}`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' }
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content;
          if (content) {
            // Sanitize in case markdown blocks are present
            content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            insights = JSON.parse(content);
          }
        } else {
          console.error(`Groq API returned error status: ${response.status}`);
        }
      } catch (apiErr) {
        console.error('Error invoking Groq API:', apiErr.message);
      }
    }
    
    // Fallback if API key is not configured or request fails
    if (!insights) {
      const sentiment = remarks.length > 20 ? 'Positive/Proactive' : 'Neutral/Brief';
      const suggestedGrade = grade === 'None' ? 'Good' : grade;
      insights = {
        summary: `[Simulated] The employee ${empName} highlights achievements matching a ${suggestedGrade} performance level in the ${deptName} department.`,
        kpi_alignment: '85% alignment with department goals (Simulated).',
        recommendation: `Recommended Grade: ${suggestedGrade}. Consider focusing on leadership training for the next cycle.`,
        key_strengths: ['Task completion', 'Punctuality'],
        areas_for_improvement: ['Cross-functional communication']
      };
    }
    
    return success(res, insights, 'AI insights generated successfully');
  } catch (err) { return error(res, err.message); }
};