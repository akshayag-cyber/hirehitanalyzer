const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'talentbridge',
});

async function check() {
  try {
    // Check applications count
    const apps = await pool.query('SELECT COUNT(*) as count FROM applications');
    console.log(`Applications in DB: ${apps.rows[0].count}`);
    
    // Check if data exists
    if (apps.rows[0].count > 0) {
      const sample = await pool.query('SELECT id, full_name, email, ai_score FROM applications LIMIT 3');
      console.log('\nSample applications:');
      sample.rows.forEach(row => {
        console.log(`  - ${row.full_name} (${row.email}) | AI Score: ${row.ai_score}`);
      });
    }
    
    // Check hr_users
    const users = await pool.query('SELECT * FROM hr_users');
    console.log(`\nHR Users in DB: ${users.rows.length}`);
    users.rows.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
