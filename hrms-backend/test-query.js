const { pool } = require('./src/config/database');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'kpi_yearly_cycles'").then(res => { console.log(res.rows); process.exit(0); });
