const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// ─── Cycles ──────────────────────────────────────────────────────────────────

exports.listCycles = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM kpi_cycles ORDER BY year DESC, quarter DESC`);
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.createCycle = async (req, res) => {
  const { name, quarter, year, start_date, end_date } = req.body;
  if (!quarter || !year || !start_date || !end_date)
    return error(res, 'quarter, year, start_date, end_date are required.', 400);
  const cycleName = name || `Q${quarter}-${year}`;
  try {
    const result = await query(
      `INSERT INTO kpi_cycles(name, quarter, year, start_date, end_date, created_by)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(quarter,year) DO UPDATE
         SET name=$1, start_date=$4, end_date=$5
       RETURNING *`,
      [cycleName, quarter, year, start_date, end_date, req.user.id]
    );
    return success(res, result.rows[0], 'Cycle created', 201);
  } catch (err) { return error(res, err.message); }
};


// ─── Reports ─────────────────────────────────────────────────────────────────

exports.listReports = async (req, res) => {
  const { cycle_id, emp_id, status } = req.query;
  const conditions = [], params = [];
  let idx = 1;

  if (cycle_id)  { conditions.push(`kr.cycle_id=$${idx++}`);  params.push(cycle_id); }
  if (emp_id)    { conditions.push(`kr.emp_id=$${idx++}`);    params.push(emp_id); }
  if (status)    { conditions.push(`kr.status=$${idx++}`);    params.push(status); }

  // Role-based scoping
  if (req.user.role === 'employee') {
    conditions.push(`kr.emp_id=$${idx++}`);
    params.push(req.user.emp_id);
    conditions.push(`kr.status='Published'`);
  } else if (req.user.role === 'dept_head') {
    conditions.push(`kr.manager_id=$${idx++}`);
    params.push(req.user.id);
  }
  // hr_manager (CPO) and super_admin (COO/MD) see all

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const result = await query(
      `SELECT kr.*,
              e.first_name||' '||e.last_name AS emp_name,
              d.name AS dept_name,
              u.username AS manager_username,
              c.name AS cycle_name, c.quarter, c.year,
              (SELECT json_agg(ka ORDER BY ka.approver_role)
               FROM kpi_approvals ka WHERE ka.report_id = kr.id) AS approvals
       FROM kpi_reports kr
       JOIN employees e ON e.emp_id = kr.emp_id
       JOIN departments d ON d.id = e.dept_id
       JOIN users u ON u.id = kr.manager_id
       JOIN kpi_cycles c ON c.id = kr.cycle_id
       ${where} ORDER BY kr.updated_at DESC`,
      params
    );
    return success(res, result.rows);
  } catch (err) { return error(res, err.message); }
};

exports.createReport = async (req, res) => {
  const { cycle_id, emp_id } = req.body;
  if (!cycle_id || !emp_id) return error(res, 'cycle_id and emp_id are required.', 400);
  try {
    const empCheck = await query('SELECT 1 FROM employees WHERE emp_id=$1', [emp_id]);
    if (!empCheck.rows.length) return error(res, `Employee '${emp_id}' does not exist.`, 404);
    const cycleCheck = await query('SELECT 1 FROM kpi_cycles WHERE id=$1', [cycle_id]);
    if (!cycleCheck.rows.length) return error(res, 'Cycle not found.', 404);

    const result = await query(
      `INSERT INTO kpi_reports(cycle_id, emp_id, manager_id)
       VALUES($1,$2,$3)
       ON CONFLICT(cycle_id, emp_id) DO NOTHING RETURNING *`,
      [cycle_id, emp_id, req.user.id]
    );
    if (!result.rows.length) return error(res, 'A report for this employee in this cycle already exists.', 409);
    return success(res, result.rows[0], 'KPI report created', 201);
  } catch (err) { return error(res, err.message); }
};

exports.getReport = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query(
      `SELECT kr.*,
              e.first_name||' '||e.last_name AS emp_name,
              d.name AS dept_name,
              u.username AS manager_username,
              c.name AS cycle_name, c.quarter, c.year
       FROM kpi_reports kr
       JOIN employees e ON e.emp_id = kr.emp_id
       JOIN departments d ON d.id = e.dept_id
       JOIN users u ON u.id = kr.manager_id
       JOIN kpi_cycles c ON c.id = kr.cycle_id
       WHERE kr.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);

    const itemsRes = await query(
      `SELECT * FROM kpi_items WHERE report_id=$1 ORDER BY sort_order, id`, [id]
    );
    const approvalsRes = await query(
      `SELECT ka.*, u.username AS approver_username, u.email AS approver_email
       FROM kpi_approvals ka
       LEFT JOIN users u ON u.id = ka.approver_id
       WHERE ka.report_id=$1
       ORDER BY CASE ka.approver_role WHEN 'cpo' THEN 1 WHEN 'coo' THEN 2 WHEN 'md' THEN 3 END`,
      [id]
    );

    return success(res, {
      ...reportRes.rows[0],
      items: itemsRes.rows,
      approvals: approvalsRes.rows,
    });
  } catch (err) { return error(res, err.message); }
};

// ─── Items ────────────────────────────────────────────────────────────────────

exports.saveItems = async (req, res) => {
  const { id } = req.params;
  const { items, manager_remarks } = req.body;
  if (!Array.isArray(items)) return error(res, 'items must be an array.', 400);

  try {
    const reportRes = await query('SELECT * FROM kpi_reports WHERE id=$1', [id]);
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    if (!['Draft', 'Returned'].includes(reportRes.rows[0].status))
      return error(res, 'Items can only be edited on Draft or Returned reports.', 403);

    // Delete existing items and re-insert
    await query('DELETE FROM kpi_items WHERE report_id=$1', [id]);
    let totalScoreSum = 0;
    for (let i = 0; i < items.length; i++) {
      const { item_name, description, target, score, manager_remarks: ir } = items[i];
      totalScoreSum += parseFloat(score || 0);
      await query(
        `INSERT INTO kpi_items(report_id, item_name, description, weightage, target, score, manager_remarks, sort_order)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, item_name, description || null, '100', target || null, score || 0, ir || null, i]
      );
    }

    let overallScore = items.length > 0 ? (totalScoreSum / items.length) : 0;

    await query(
      `UPDATE kpi_reports SET overall_score=$1, manager_remarks=$2, updated_at=NOW() WHERE id=$3`,
      [overallScore.toFixed(2), manager_remarks || null, id]
    );
    return success(res, { overall_score: overallScore.toFixed(2) }, 'KPI items saved');
  } catch (err) { return error(res, err.message); }
};

// ─── Submit ───────────────────────────────────────────────────────────────────

exports.submitReport = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query('SELECT * FROM kpi_reports WHERE id=$1', [id]);
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    if (!['Draft', 'Returned'].includes(reportRes.rows[0].status))
      return error(res, 'Only Draft or Returned reports can be submitted.', 400);

    const itemsCount = await query('SELECT COUNT(*) FROM kpi_items WHERE report_id=$1', [id]);
    if (parseInt(itemsCount.rows[0].count) === 0)
      return error(res, 'Add at least one KPI item before submitting.', 400);

    // Update status
    await query(
      `UPDATE kpi_reports SET status='CPO/COO Review', submitted_at=NOW(), updated_at=NOW() WHERE id=$1`, [id]
    );

    // Create the approval tree rows — CPO + COO in parallel, MD waiting
    await query(
      `INSERT INTO kpi_approvals(report_id, approver_role, status)
       VALUES($1,'cpo','Pending'),($1,'coo','Pending'),($1,'md','Waiting')
       ON CONFLICT(report_id, approver_role) DO UPDATE SET status=EXCLUDED.status, acted_at=NULL, remarks=NULL`,
      [id]
    );

    return success(res, null, 'KPI report submitted for review');
  } catch (err) { return error(res, err.message); }
};

// ─── Approval Actions ─────────────────────────────────────────────────────────

const advanceWorkflow = async (reportId) => {
  // Check if both CPO and COO have approved
  const results = await query(
    `SELECT approver_role, status FROM kpi_approvals WHERE report_id=$1 AND approver_role IN ('cpo','coo')`,
    [reportId]
  );
  const cpo = results.rows.find(r => r.approver_role === 'cpo');
  const coo = results.rows.find(r => r.approver_role === 'coo');

  if (cpo?.status === 'Approved' && coo?.status === 'Approved') {
    // Both approved — activate MD stage
    await query(
      `UPDATE kpi_approvals SET status='Pending' WHERE report_id=$1 AND approver_role='md'`,
      [reportId]
    );
    await query(
      `UPDATE kpi_reports SET status='MD Review', updated_at=NOW() WHERE id=$1`, [reportId]
    );
  }
};

exports.cpoAction = async (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body; // action: 'approve' | 'return'
  if (!['approve', 'return'].includes(action))
    return error(res, "action must be 'approve' or 'return'.", 400);
  try {
    const approvalRes = await query(
      `SELECT * FROM kpi_approvals WHERE report_id=$1 AND approver_role='cpo'`, [id]
    );
    if (!approvalRes.rows.length) return error(res, 'CPO approval row not found.', 404);
    if (!['Pending'].includes(approvalRes.rows[0].status))
      return error(res, 'This report is not pending CPO review.', 400);

    const newStatus = action === 'approve' ? 'Approved' : 'Returned';
    await query(
      `UPDATE kpi_approvals SET status=$1, approver_id=$2, remarks=$3, acted_at=NOW()
       WHERE report_id=$4 AND approver_role='cpo'`,
      [newStatus, req.user.id, remarks || null, id]
    );

    if (action === 'return') {
      await query(
        `UPDATE kpi_reports SET status='Returned', updated_at=NOW() WHERE id=$1`, [id]
      );
      await query(
        `UPDATE kpi_approvals SET status='Waiting', acted_at=NULL, remarks=NULL
         WHERE report_id=$1 AND approver_role IN ('coo','md')`, [id]
      );
    } else {
      await advanceWorkflow(id);
    }
    return success(res, null, `CPO ${action}d the KPI report`);
  } catch (err) { return error(res, err.message); }
};

exports.cooAction = async (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body;
  if (!['approve', 'return'].includes(action))
    return error(res, "action must be 'approve' or 'return'.", 400);
  try {
    const approvalRes = await query(
      `SELECT * FROM kpi_approvals WHERE report_id=$1 AND approver_role='coo'`, [id]
    );
    if (!approvalRes.rows.length) return error(res, 'COO approval row not found.', 404);
    if (!['Pending'].includes(approvalRes.rows[0].status))
      return error(res, 'This report is not pending COO review.', 400);

    const newStatus = action === 'approve' ? 'Approved' : 'Returned';
    await query(
      `UPDATE kpi_approvals SET status=$1, approver_id=$2, remarks=$3, acted_at=NOW()
       WHERE report_id=$4 AND approver_role='coo'`,
      [newStatus, req.user.id, remarks || null, id]
    );

    if (action === 'return') {
      await query(
        `UPDATE kpi_reports SET status='Returned', updated_at=NOW() WHERE id=$1`, [id]
      );
      await query(
        `UPDATE kpi_approvals SET status='Waiting', acted_at=NULL, remarks=NULL
         WHERE report_id=$1 AND approver_role IN ('cpo','md')`, [id]
      );
    } else {
      await advanceWorkflow(id);
    }
    return success(res, null, `COO ${action}d the KPI report`);
  } catch (err) { return error(res, err.message); }
};

exports.mdAction = async (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body;
  if (!['approve', 'return'].includes(action))
    return error(res, "action must be 'approve' or 'return'.", 400);
  try {
    const approvalRes = await query(
      `SELECT * FROM kpi_approvals WHERE report_id=$1 AND approver_role='md'`, [id]
    );
    if (!approvalRes.rows.length) return error(res, 'MD approval row not found.', 404);
    if (approvalRes.rows[0].status !== 'Pending')
      return error(res, 'Report is not at MD review stage yet.', 400);

    const newStatus = action === 'approve' ? 'Approved' : 'Returned';
    await query(
      `UPDATE kpi_approvals SET status=$1, approver_id=$2, remarks=$3, acted_at=NOW()
       WHERE report_id=$4 AND approver_role='md'`,
      [newStatus, req.user.id, remarks || null, id]
    );

    if (action === 'return') {
      await query(
        `UPDATE kpi_reports SET status='Returned', updated_at=NOW() WHERE id=$1`, [id]
      );
      await query(
        `UPDATE kpi_approvals SET status='Waiting', acted_at=NULL, remarks=NULL
         WHERE report_id=$1 AND approver_role IN ('cpo','coo')`, [id]
      );
    } else {
      await query(
        `UPDATE kpi_reports SET status='Approved', updated_at=NOW() WHERE id=$1`, [id]
      );
    }
    return success(res, null, `MD ${action}d the KPI report`);
  } catch (err) { return error(res, err.message); }
};

exports.publishReport = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query('SELECT status FROM kpi_reports WHERE id=$1', [id]);
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    if (reportRes.rows[0].status !== 'Approved')
      return error(res, 'Only Approved reports can be published.', 400);
    await query(
      `UPDATE kpi_reports SET status='Published', published_at=NOW(), updated_at=NOW() WHERE id=$1`, [id]
    );
    return success(res, null, 'KPI report published');
  } catch (err) { return error(res, err.message); }
};

// ─── AI Insights ──────────────────────────────────────────────────────────────

exports.generateAIInsights = async (req, res) => {
  const { id } = req.params;
  try {
    const reportRes = await query(
      `SELECT kr.*, e.first_name||' '||e.last_name AS emp_name, d.name AS dept_name,
              c.name AS cycle_name
       FROM kpi_reports kr
       JOIN employees e ON e.emp_id = kr.emp_id
       JOIN departments d ON d.id = e.dept_id
       JOIN kpi_cycles c ON c.id = kr.cycle_id
       WHERE kr.id=$1`, [id]
    );
    if (!reportRes.rows.length) return error(res, 'Report not found.', 404);
    const report = reportRes.rows[0];

    const itemsRes = await query(
      `SELECT item_name, weightage, score, weighted_score, manager_remarks FROM kpi_items WHERE report_id=$1 ORDER BY sort_order`, [id]
    );
    const items = itemsRes.rows;

    const approvalsRes = await query(
      `SELECT ka.approver_role, ka.status, ka.remarks FROM kpi_approvals ka WHERE ka.report_id=$1`, [id]
    );
    const approvals = approvalsRes.rows;

    let insights = null;

    if (process.env.GROQ_API_KEY) {
      try {
        const itemsText = items.map(i =>
          `- ${i.item_name}: Weight=${i.weightage}%, Score=${i.score}/100, Weighted=${parseFloat(i.weighted_score).toFixed(1)} pts. Remarks: "${i.manager_remarks || 'None'}"`
        ).join('\n');
        const approvalText = approvals.map(a =>
          `${a.approver_role.toUpperCase()}: ${a.status}. Remarks: "${a.remarks || 'None'}"`
        ).join('\n');

        const prompt = `
Employee: ${report.emp_name}
Department: ${report.dept_name}
KPI Cycle: ${report.cycle_name}
Overall Weighted Score: ${report.overall_score}/100
Manager Overall Remarks: "${report.manager_remarks || 'None'}"

KPI Items:
${itemsText}

Approval Remarks:
${approvalText}
`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are an AI HR performance analyst. Analyze quarterly KPI data and generate a structured JSON report.
Return exactly this JSON shape (no extra keys, no markdown):
{
  "summary": "Professional 2-3 sentence performance summary.",
  "overall_rating": "Outstanding | Exceeds Expectations | Meets Expectations | Needs Improvement | Unsatisfactory",
  "kpi_highlights": ["top performing KPI 1", "top performing KPI 2"],
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "areas_for_improvement": ["area 1", "area 2"],
  "recommendation": "Actionable development recommendation for next quarter.",
  "score_analysis": "Brief analysis of the score distribution across KPI items."
}`,
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content;
          if (content) {
            content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            insights = JSON.parse(content);
          }
        }
      } catch (apiErr) {
        console.error('Groq API error:', apiErr.message);
      }
    }

    // Fallback
    if (!insights) {
      const score = parseFloat(report.overall_score);
      const rating = score >= 90 ? 'Outstanding' : score >= 75 ? 'Exceeds Expectations' : score >= 60 ? 'Meets Expectations' : 'Needs Improvement';
      const topItems = [...items].sort((a, b) => parseFloat(b.weighted_score) - parseFloat(a.weighted_score)).slice(0, 2);
      insights = {
        summary: `[Simulated] ${report.emp_name} achieved an overall KPI score of ${score}/100 in ${report.cycle_name}, reflecting ${rating.toLowerCase()} performance in the ${report.dept_name} department.`,
        overall_rating: rating,
        kpi_highlights: topItems.map(i => i.item_name),
        key_strengths: ['Consistent task delivery', 'Departmental goal alignment'],
        areas_for_improvement: ['Cross-functional collaboration', 'Documentation quality'],
        recommendation: `Focus on improving lower-scoring KPI items in the next quarter and consider targeted training programs.`,
        score_analysis: `Score of ${score} out of 100 across ${items.length} KPI items with varying weightages.`,
      };
    }

    // Cache the insights on the report
    await query(`UPDATE kpi_reports SET ai_insights=$1, updated_at=NOW() WHERE id=$2`, [JSON.stringify(insights), id]);

    return success(res, insights, 'AI insights generated');
  } catch (err) { return error(res, err.message); }
};
