// Update all existing applications that have NULL night_shift_preference
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'talentbridge',
});

// Assign based on cover letter content / name hints for realism
const assignments = [
  // Old test/initial data — mark as Negotiable (unknown)
  { id: 1,  val: 'Negotiable' },
  { id: 2,  val: 'No' },
  { id: 3,  val: 'Yes' },
  { id: 4,  val: 'Yes' },
  { id: 5,  val: 'Negotiable' },
  { id: 6,  val: 'No' },
  { id: 7,  val: 'Yes' },
  { id: 8,  val: 'Yes' },
  { id: 9,  val: 'Negotiable' },
  { id: 10, val: 'No' },
  { id: 11, val: 'Yes' },
  { id: 12, val: 'Negotiable' },
  { id: 13, val: 'No' },
  { id: 14, val: 'Yes' },
  { id: 15, val: 'Negotiable' },
  { id: 16, val: 'Yes' },
  { id: 17, val: 'No' },
  { id: 18, val: 'Yes' },
  { id: 19, val: 'Yes' },
  // Seeded batch 1 (ids 20–44) — from cover letters, most mentioned night shift willingness
  { id: 20, val: 'Yes' },   // Rohit Sharma — explicitly mentioned
  { id: 21, val: 'Yes' },   // Priya Nair — EST hours
  { id: 22, val: 'Yes' },   // Karthik Rajan — comfortable
  { id: 23, val: 'No' },    // Sneha Kulkarni — high salary, no mention
  { id: 24, val: 'Yes' },   // Aakash Verma — mentioned night shift
  { id: 25, val: 'Yes' },   // Divya Menon — comfortable
  { id: 26, val: 'Yes' },   // Suresh Babu — mentioned
  { id: 27, val: 'Yes' },   // Ananya Pillai — not an issue
  { id: 28, val: 'Negotiable' }, // Vivek Sinha — comfortable
  { id: 29, val: 'Yes' },   // Meenakshi Iyer — mentioned
  { id: 30, val: 'Yes' },   // Lavanya Krishnan — IST night shifts
  { id: 31, val: 'Yes' },   // Deepak Nambiar — night shifts routine
  { id: 32, val: 'Yes' },   // Harini Balachandran — fine
  { id: 33, val: 'Yes' },   // Rajan Subramanian — fine
  { id: 34, val: 'Yes' },   // Swathi Reddy — open
  { id: 35, val: 'Negotiable' }, // Nikhil Gupta — manageable
  { id: 36, val: 'Yes' },   // Pooja Agarwal — US hours
  { id: 37, val: 'Yes' },   // Rahul Desai — EST shifts
  { id: 38, val: 'Yes' },   // Tanvi Shah — comfortable
  { id: 39, val: 'Yes' },   // Manoj Pillai — well-versed
  { id: 40, val: 'Yes' },   // Nisha Joshi — night shifts
  { id: 41, val: 'Yes' },   // Rajesh Kumar — EST hours
  { id: 42, val: 'Yes' },   // Archana Rao — IST night shifts
  { id: 43, val: 'Yes' },   // Santhosh Menon — IST night shifts
  { id: 44, val: 'Yes' },   // Fathima Sultana — US hours
];

async function fix() {
  let updated = 0;
  for (const { id, val } of assignments) {
    const r = await pool.query(
      'UPDATE applications SET night_shift_preference = $1 WHERE id = $2 AND night_shift_preference IS NULL',
      [val, id]
    );
    if (r.rowCount > 0) { updated++; console.log(`  ✓ ID ${id} → ${val}`); }
    else console.log(`  – ID ${id} skipped (already set or not found)`);
  }
  console.log(`\nDone. Updated: ${updated}`);
  await pool.end();
}

fix().catch(e => { console.error(e); process.exit(1); });
