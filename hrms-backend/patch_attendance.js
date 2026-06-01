const fs = require('fs');

let content = fs.readFileSync('src/controllers/attendance.controller.js', 'utf8');

if (!content.includes("require('fs')")) {
  content = content.replace("const { query } = require('../config/database');", "const { query } = require('../config/database');\nconst fs = require('fs');\nconst path = require('path');");
}

const syncBody = `exports.syncBiometrics = async (req, res) => {
  try {
    const emp_id = req.user.role === 'employee' ? req.user.emp_id : (req.body.emp_id || req.user.emp_id);
    if (!emp_id) return error(res, 'Employee ID is required', 400);

    const { location, photo } = req.body;
    let photoUrl = null;
    let locStr = null;
    if (location) locStr = typeof location === 'string' ? location : JSON.stringify(location);
    
    if (photo) {
      const base64Data = photo.replace(/^data:image\\/\\w+;base64,/, "");
      const filename = \`punch_\${emp_id}_\${Date.now()}.webp\`;
      const uploadsDir = path.join(__dirname, '../../public/uploads/attendance');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, filename), base64Data, 'base64');
      photoUrl = \`/uploads/attendance/\${filename}\`;
    }

    const today = new Date();
    const todayStr = \`\${today.getFullYear()}-\${String(today.getMonth()+1).padStart(2,'0')}-\${String(today.getDate()).padStart(2,'0')}\`;
    const existing = await query(\`SELECT * FROM attendance_records WHERE emp_id = $1 AND date = $2\`, [emp_id, todayStr]);

    if (existing.rows.length > 0) {
      if (!existing.rows[0].punch_out) {
        if (!existing.rows[0].punch_in) {
          const result = await query(
            \`UPDATE attendance_records SET punch_in = CURRENT_TIME, status = 'Present', biometric_sync = true, location = COALESCE($2, location), photo_url = COALESCE($3, photo_url), updated_at = NOW() WHERE id = $1 RETURNING *\`,
            [existing.rows[0].id, locStr, photoUrl]
          );
          return success(res, result.rows[0], 'Biometric sync: Punched in successfully');
        }
        const punchOut = await query(\`SELECT CURRENT_TIME as t\`);
        const outTime = punchOut.rows[0].t;
        const inTime = existing.rows[0].punch_in;
        const hrs = await query(
          \`SELECT EXTRACT(EPOCH FROM ($1::TIME - $2::TIME)) / 3600.0 as hours\`,
          [outTime, inTime]
        );
        const workingHours = Math.max(0, parseFloat(hrs.rows[0].hours));
        const outStatus = workingHours < 9 ? 'Half Day' : 'Present';

        const result = await query(
          \`UPDATE attendance_records SET punch_out = $1, working_hours = $2, status = $3, location = COALESCE($5, location), photo_url = COALESCE($6, photo_url), updated_at = NOW() WHERE id = $4 RETURNING *\`,
          [outTime, workingHours.toFixed(1), outStatus, existing.rows[0].id, locStr, photoUrl]
        );
        return success(res, result.rows[0], 'Biometric sync: Punched out successfully');
      }
      return success(res, existing.rows[0], 'Biometric sync: Already punched out today');
    }

    const result = await query(
      \`INSERT INTO attendance_records (emp_id, date, punch_in, status, biometric_sync, location, photo_url)
       VALUES ($1, $2, CURRENT_TIME, 'Present', true, $3, $4) RETURNING *\`,
      [emp_id, todayStr, locStr, photoUrl]
    );
    return success(res, result.rows[0], 'Biometric sync: Punched in successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};`;

content = content.replace(/exports\.syncBiometrics = async \(req, res\) => \{[\s\S]*?(?=\nexports\.punch = async)/, syncBody);

fs.writeFileSync('src/controllers/attendance.controller.js', content);
console.log('patched attendance controller');
