const { query } = require('../config/database');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  const { year, status } = req.query;
  const cycle = year || '2026';
  
  const conditions = [];
  const params = [];
  let idx = 1;
  
  if (cycle.startsWith('Q')) {
    conditions.push(`a.cycle_name=$${idx++}`);
    params.push(cycle);
  } else {
    conditions.push(`a.cycle_name LIKE $${idx++}`);
    params.push(`%${cycle}%`);
  }
  
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
  const { emp_id, cycle_name } = req.body;
  if (!emp_id||!cycle_name) return error(res,'emp_id and cycle_name required.',400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id = $1', [emp_id]);
    if (!empCheck.rows.length) {
      return error(res, `Employee with ID '${emp_id}' does not exist.`, 404);
    }
    const result = await query(
      `INSERT INTO apar_records(emp_id,cycle_name,status) VALUES($1,$2,'Pending Reporting Officer')
       ON CONFLICT(emp_id,cycle_name) DO NOTHING RETURNING *`,
      [emp_id, cycle_name]
    );
    return success(res, result.rows[0]||null, 'APAR initiated', 201);
  } catch (err) { return error(res, err.message); }
};

const statusAfterFill = (reporting, reviewing) => {
  if (reviewing) return 'Completed';
  if (reporting) return 'Pending Reviewing Officer';
  return 'Pending Reporting Officer';
};



exports.fillReporting = async (req, res) => {
  const { id } = req.params;
  const { reporting_grade, reporting_remarks } = req.body;
  if (!reporting_grade) return error(res,'reporting_grade required.',400);
  try {
    const cur = await query('SELECT * FROM apar_records WHERE id=$1',[id]);
    if (!cur.rows.length) return error(res,'APAR not found.',404);
    const r = cur.rows[0];
    const status = statusAfterFill(reporting_grade, r.reviewing_grade);
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
    const remarks = record.reporting_remarks || 'No remarks provided.';
    const grade = record.reporting_grade || 'None';
    const empName = record.emp_name;
    const deptName = record.dept_name;
    const cycleName = record.cycle_name;
    
    let insights = null;
    
    if (process.env.GROQ_API_KEY) {
      try {
        const prompt = `
Employee: ${empName}
Department: ${deptName}
Cycle: ${cycleName}
Reporting Officer Grade: ${grade}
Reporting Officer Remarks: "${remarks}"
Reviewing Officer Grade: ${record.reviewing_grade || 'Not reviewed yet'}
Reviewing Officer Remarks: "${record.reviewing_remarks || 'No remarks yet'}"
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
Analyze the provided employee performance data and reporting officer remarks.
Generate a structured performance evaluation and KPI tracking alignment in JSON format.
The JSON must contain exactly these 5 keys (do not add additional root keys, markdown code blocks, or extra text):
{
  "summary": "A concise professional summary of the performance evaluation by the manager, including sentiment and consistency.",
  "kpi_alignment": "An analysis of the alignment of the manager's remarks with department goals and KPIs (e.g., expressed as a percentage or descriptive rating).",
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
      const suggestedGrade = grade === 'None' ? 'Good' : grade;
      insights = {
        summary: `[Simulated] The manager has highlighted achievements matching a ${suggestedGrade} performance level for ${empName} in the ${deptName} department.`,
        kpi_alignment: '85% alignment with department goals (Simulated).',
        recommendation: `Recommended Grade: ${suggestedGrade}. Consider focusing on leadership training for the next cycle.`,
        key_strengths: ['Task completion', 'Punctuality'],
        areas_for_improvement: ['Cross-functional communication']
      };
    }
    
    return success(res, insights, 'AI insights generated successfully');
  } catch (err) { return error(res, err.message); }
};

exports.getYearlyReport = async (req, res) => {
  const { emp_id, year } = req.query;
  if (!emp_id || !year) return error(res, 'emp_id and year are required.', 400);
  if (req.user.role === 'employee' && req.user.emp_id !== emp_id) return error(res, 'Access denied.', 403);

  try {
    const records = await query(`
      SELECT a.*, e.first_name||' '||e.last_name as emp_name, d.name as dept_name
      FROM apar_records a
      JOIN employees e ON e.emp_id = a.emp_id
      JOIN departments d ON d.id = e.dept_id
      WHERE a.emp_id = $1 AND a.cycle_name LIKE $2
      ORDER BY a.cycle_name ASC
    `, [emp_id, `%${year}`]);

    return success(res, records.rows, 'Yearly report records fetched successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.generateYearlyReportAI = async (req, res) => {
  const { emp_id, year, manual } = req.query;
  if (!emp_id || !year) return error(res, 'emp_id and year are required.', 400);
  if (req.user.role === 'employee' && req.user.emp_id !== emp_id) return error(res, 'Access denied.', 403);

  try {
    const existing = await query(`SELECT final_remarks FROM apar_records WHERE emp_id = $1 AND cycle_name = $2`, [emp_id, year.toString()]);
    if (existing.rows.length > 0 && existing.rows[0].final_remarks) {
      try {
        const savedInsights = JSON.parse(existing.rows[0].final_remarks);
        return success(res, savedInsights, 'Yearly report retrieved from records');
      } catch (e) {}
    }

    const records = await query(`
      SELECT r.overall_score, r.manager_remarks, c.name as cycle_name,
             e.first_name||' '||e.last_name as emp_name, d.name as dept_name
      FROM kpi_reports r
      JOIN kpi_cycles c ON c.id = r.cycle_id
      JOIN employees e ON e.emp_id = r.emp_id
      JOIN departments d ON d.id = e.dept_id
      WHERE r.emp_id = $1 AND c.year = $2
      ORDER BY c.quarter ASC
    `, [emp_id, parseInt(year) || 2026]);

    if (!records.rows.length) {
      return error(res, 'No KPI reports found for this employee in the specified year.', 404);
    }

    const empName = records.rows[0].emp_name;
    const deptName = records.rows[0].dept_name;

    let totalScore = 0;
    let validQuarters = 0;
    
    let prompt = `Generate an Annual Performance Summary for employee ${empName} (Department: ${deptName}) for the year ${year}.
Here are the quarterly KPI performance records:\n`;

    let quarterlyData = [];

    records.rows.forEach(r => {
      const score = parseFloat(r.overall_score) || 0;
      totalScore += score;
      validQuarters++;
      
      let grade = 'Poor';
      if (score > 90) grade = 'Outstanding';
      else if (score > 80) grade = 'Very Good';
      else if (score > 70) grade = 'Good';
      else if (score > 50) grade = 'Average';
      
      quarterlyData.push({ quarter: r.cycle_name, score: score, grade: grade });

      prompt += `\nQuarter: ${r.cycle_name}
KPI Score: ${score}/100
Quarterly Grade: ${grade}
Manager Remarks: ${r.manager_remarks || 'None'}\n`;
    });

    let averageGrade = 'Good';
    let averagePercentage = 0;
    
    if (validQuarters > 0) {
      averagePercentage = Math.round(totalScore / validQuarters);
      if (averagePercentage > 90) averageGrade = 'Outstanding';
      else if (averagePercentage > 80) averageGrade = 'Very Good';
      else if (averagePercentage > 70) averageGrade = 'Good';
      else if (averagePercentage > 50) averageGrade = 'Average';
      else averageGrade = 'Poor';
    }

    prompt += `\nCRITICAL INSTRUCTION: The mathematically calculated average annual score is ${averagePercentage}/100, which corresponds to the grade "${averageGrade}". You MUST use "${averageGrade}" as the suggested_annual_grade.`;

    let insights = null;
    if (manual !== 'true' && process.env.GROQ_API_KEY) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are an AI-driven Government HRMS assistant.
Generate a detailed Annual Performance Summary based on the provided quarterly records.
Output exactly a JSON object with these 5 keys (no markdown code blocks):
{
  "annual_summary": "A detailed, multi-paragraph professional summary of the employee's performance over the entire year, evaluating their strengths, weaknesses, and overall impact.",
  "overall_trajectory": "A detailed sentence analyzing if performance improved, declined, or remained consistent.",
  "suggested_annual_grade": "Based on the 4 quarters, suggest a final annual grade (e.g., Outstanding, Very Good, Good, Average, Poor). Must match the calculated average grade.",
  "key_annual_strengths": ["strength1", "strength2"],
  "annual_development_areas": ["area1"]
}`
              },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content;
          if (content) {
            content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            insights = JSON.parse(content);
            // Force override to guarantee math average is used
            insights.suggested_annual_grade = averageGrade;
            insights.average_percentage = averagePercentage;
            insights.quarterly_data = quarterlyData;
          }
        }
      } catch (e) {
        console.error('Error invoking Groq API:', e.message);
      }
    }

    if (!insights) {
      insights = {
        annual_summary: manual === 'true' 
          ? `${empName}'s performance in ${year} resulted in an average mathematical score of ${averagePercentage}/100, corresponding to an overall annual grade of ${averageGrade}. This summary was generated instantly using basic data aggregation.`
          : `[Simulated] Over the year ${year}, ${empName} showed performance averaging out to ${averageGrade}.`,
        overall_trajectory: "Consistent performance across quarters.",
        suggested_annual_grade: averageGrade,
        average_percentage: averagePercentage,
        quarterly_data: quarterlyData,
        key_annual_strengths: ["Consistency", "Score Aggregation"],
        annual_development_areas: ["N/A"]
      };
    }

    // Save the generated report to apar_records
    await query(`
      INSERT INTO apar_records (emp_id, cycle_name, final_grade, final_remarks, status)
      VALUES ($1, $2, $3, $4, 'Completed')
      ON CONFLICT (emp_id, cycle_name)
      DO UPDATE SET final_grade = EXCLUDED.final_grade, final_remarks = EXCLUDED.final_remarks, status = 'Completed', updated_at = NOW()
    `, [emp_id, year.toString(), insights.suggested_annual_grade, JSON.stringify(insights)]);

    return success(res, insights, 'Yearly AI report generated and saved successfully');
  } catch (err) {
    return error(res, err.message);
  }
};