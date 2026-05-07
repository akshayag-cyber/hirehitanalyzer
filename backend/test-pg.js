const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres',
});

async function test() {
  try {
    console.log('Testing PostgreSQL connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✓ PostgreSQL is running and authenticated!');
    
    // Try to create the talentbridge database
    try {
      await pool.query('CREATE DATABASE talentbridge');
      console.log('✓ Created database "talentbridge"');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('✓ Database "talentbridge" already exists');
      } else {
        throw e;
      }
    }
    
    console.log('\n✓ Ready to migrate!');
    await pool.end();
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

test();
