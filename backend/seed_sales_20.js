// Seed: 20 Sales-only applications, status = 'applied', mixed night_shift_preference
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'talentbridge',
});

const applications = [
  {
    full_name: 'Arjun Mehta',
    email: 'arjun.mehta.s1@gmail.com',
    phone: '9701234560',
    night_shift: 'Yes',
    exp: 2, sal_min: 250000, sal_max: 320000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Synersys Team,\n\nWith 2 years of inside sales experience at a Pune-based US staffing company, I have consistently managed outbound calls to US clients in EST hours. I am fully comfortable with night shifts and thrive in a target-driven environment. My expected CTC is 3 LPA.\n\nRegards,\nArjun Mehta`,
  },
  {
    full_name: 'Bhavna Patel',
    email: 'bhavna.patel.sales@outlook.com',
    phone: '9712345601',
    night_shift: 'No',
    exp: 3, sal_min: 400000, sal_max: 500000,
    education: "Master's Degree",
    cover_letter: `Dear Hiring Manager,\n\nI have 3 years of B2B sales experience and hold an MBA in Marketing. I have worked day shifts my entire career and am not comfortable with night shifts. I am looking for a day-shift sales role. My expected CTC is 4.5 LPA.\n\nThank you,\nBhavna Patel`,
  },
  {
    full_name: 'Chetan Deshmukh',
    email: 'chetan.deshmukh.biz@gmail.com',
    phone: '9723456012',
    night_shift: 'Negotiable',
    exp: 1, sal_min: 220000, sal_max: 280000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Team,\n\nI am a fresher with 1 year of tele-sales experience and am eager to enter the US staffing industry. I am open to working late evenings but have some personal constraints for full night shifts — I would like to discuss. Expected CTC: 2.5 LPA.\n\nBest,\nChetan Deshmukh`,
  },
  {
    full_name: 'Deepika Joshi',
    email: 'deepika.joshi.sales@gmail.com',
    phone: '9734560123',
    night_shift: 'Yes',
    exp: 4, sal_min: 300000, sal_max: 380000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Synersys,\n\nI have 4 years of US staffing sales experience and have worked night shifts throughout my career without any issues. I have managed portfolios of 30+ open requisitions and am adept at cold calling US hiring managers in EST time zones. Expected CTC: 3.5 LPA.\n\nWarm regards,\nDeepika Joshi`,
  },
  {
    full_name: 'Eknath Kulkarni',
    email: 'eknath.kulkarni.exec@gmail.com',
    phone: '9745601234',
    night_shift: 'No',
    exp: 2, sal_min: 350000, sal_max: 420000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Hiring Team,\n\nI have 2 years of domestic sales experience in the insurance sector. I am a strong communicator and target-achiever, but I am not in a position to work night shifts due to health reasons. I am interested in a day-shift sales role. Expected CTC: 4 LPA.\n\nThank you,\nEknath Kulkarni`,
  },
  {
    full_name: 'Farida Shaikh',
    email: 'farida.shaikh.sales@gmail.com',
    phone: '9756012345',
    night_shift: 'Yes',
    exp: 3, sal_min: 270000, sal_max: 340000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Team,\n\nI bring 3 years of US staffing sales experience from a Hyderabad-based firm. I have worked exclusively on EST hours and have a strong record of qualifying and closing recruitment contracts with mid-size US IT companies. Night shifts are perfectly fine. Expected CTC: 3 LPA.\n\nRegards,\nFarida Shaikh`,
  },
  {
    full_name: 'Ganesh Nair',
    email: 'ganesh.nair.bd@gmail.com',
    phone: '9767123456',
    night_shift: 'Negotiable',
    exp: 5, sal_min: 380000, sal_max: 480000,
    education: "Master's Degree",
    cover_letter: `Dear Synersys,\n\nWith 5 years in business development for a US staffing and consulting firm, I have a strong track record in closing enterprise deals. I am somewhat flexible on shift timings but would prefer evening over full night shifts. My expected CTC is 4.5 LPA.\n\nSincerely,\nGanesh Nair`,
  },
  {
    full_name: 'Harsha Vardhan',
    email: 'harsha.vardhan.sales@gmail.com',
    phone: '9778234567',
    night_shift: 'Yes',
    exp: 1, sal_min: 230000, sal_max: 290000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Hiring Manager,\n\nI am a fresh graduate with 1 year of BPO experience handling US customer accounts during night shifts. I am familiar with American business culture and communication styles. I am excited to transition into US staffing sales. Expected CTC: 2.5–3 LPA.\n\nThank you,\nHarsha Vardhan`,
  },
  {
    full_name: 'Ishita Banerjee',
    email: 'ishita.banerjee.sales@gmail.com',
    phone: '9789345678',
    night_shift: 'No',
    exp: 4, sal_min: 450000, sal_max: 560000,
    education: "Master's Degree",
    cover_letter: `Dear Team,\n\nI hold an MBA and have 4 years of sales leadership experience in the FMCG sector. I am an excellent communicator and have consistently exceeded revenue targets. However, I am unable to commit to night shifts as I have family responsibilities. I am looking for a senior day-shift sales role. Expected CTC: 5 LPA.\n\nRegards,\nIshita Banerjee`,
  },
  {
    full_name: 'Jayesh Thakkar',
    email: 'jayesh.thakkar.exec@gmail.com',
    phone: '9790456789',
    night_shift: 'Yes',
    exp: 2, sal_min: 240000, sal_max: 310000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Synersys,\n\nI have 2 years of inside sales experience at a US staffing agency where I called hiring managers and sourced contract requirements from 8 PM to 5 AM IST daily. I am fully accustomed to the night-shift lifestyle and perform best in this schedule. Expected CTC: 3 LPA.\n\nBest,\nJayesh Thakkar`,
  },
  {
    full_name: 'Kavya Shetty',
    email: 'kavya.shetty.sales@gmail.com',
    phone: '9801567890',
    night_shift: 'Yes',
    exp: 3, sal_min: 260000, sal_max: 330000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Hiring Manager,\n\nWith 3 years of US non-IT staffing sales experience (healthcare and admin verticals), I have worked night shifts from Bangalore and have a solid understanding of US hiring cycles and VMS portals. My English communication is excellent and my expected CTC is 3 LPA.\n\nWarm regards,\nKavya Shetty`,
  },
  {
    full_name: 'Lokesh Choudhary',
    email: 'lokesh.choudhary.biz@gmail.com',
    phone: '9812678901',
    night_shift: 'Negotiable',
    exp: 2, sal_min: 280000, sal_max: 350000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Team,\n\nI have 2 years of outbound sales experience in an international BPO handling US clients. I have worked both evening and night shifts and am somewhat flexible, though I prefer evening hours (6 PM–2 AM IST) over full night shifts. Expected CTC: 3 LPA.\n\nThank you,\nLokesh Choudhary`,
  },
  {
    full_name: 'Mansi Tiwari',
    email: 'mansi.tiwari.sales@gmail.com',
    phone: '9823789012',
    night_shift: 'Yes',
    exp: 1, sal_min: 220000, sal_max: 270000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Synersys,\n\nI am a motivated fresher who completed a 6-month internship in a US staffing sales team where I handled lead generation and cold calling on EST schedule. Night shifts are comfortable for me. I am looking to start my career in US staffing sales. Expected CTC: 2.5 LPA.\n\nRegards,\nMansi Tiwari`,
  },
  {
    full_name: 'Naveen Kumar',
    email: 'naveen.kumar.s2@gmail.com',
    phone: '9834890123',
    night_shift: 'No',
    exp: 6, sal_min: 550000, sal_max: 650000,
    education: "Master's Degree",
    cover_letter: `Dear Hiring Manager,\n\nI am a senior sales professional with 6 years of experience and an MBA. I have led sales teams in the IT and staffing sector. I am not available for night shifts as I have other professional commitments in the morning. I am applying for any daytime sales leadership opportunities. Expected CTC: 6 LPA.\n\nSincerely,\nNaveen Kumar`,
  },
  {
    full_name: 'Omkar Bhosale',
    email: 'omkar.bhosale.sales@gmail.com',
    phone: '9845901234',
    night_shift: 'Yes',
    exp: 3, sal_min: 280000, sal_max: 360000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Team,\n\nI have 3 years of US IT staffing sales experience and have exclusively worked IST night shifts. I am experienced in sourcing requirements via LinkedIn, calling US clients, and maintaining relationships across multiple time zones. Expected CTC: 3.2 LPA.\n\nBest,\nOmkar Bhosale`,
  },
  {
    full_name: 'Preethi Ramamurthy',
    email: 'preethi.ram.sales@gmail.com',
    phone: '9856012345',
    night_shift: 'Negotiable',
    exp: 2, sal_min: 260000, sal_max: 320000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Synersys,\n\nI have 2 years of inside sales experience in a semi-international BPO. I have worked late evenings and am open to discussing shift timings. I am comfortable with US client communication and English is my primary working language. Expected CTC: 3 LPA.\n\nRegards,\nPreethi Ramamurthy`,
  },
  {
    full_name: 'Rahul Pandey',
    email: 'rahul.pandey.biz@gmail.com',
    phone: '9867123456',
    night_shift: 'Yes',
    exp: 4, sal_min: 320000, sal_max: 400000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Hiring Team,\n\nWith 4 years of dedicated US non-IT staffing sales experience, I have been working night shifts since day one of my career. I specialize in light industrial, admin, and finance staffing verticals and have developed strong relationships with US staffing managers. Expected CTC: 3.5 LPA.\n\nWarm regards,\nRahul Pandey`,
  },
  {
    full_name: 'Sangeeta Mishra',
    email: 'sangeeta.mishra.sales@gmail.com',
    phone: '9878234567',
    night_shift: 'No',
    exp: 3, sal_min: 380000, sal_max: 460000,
    education: "Master's Degree",
    cover_letter: `Dear Team,\n\nI have 3 years of sales experience in the EdTech sector and hold a postgraduate degree. I have strong communication and presentation skills, and am experienced in handling international (US and UK) clients. I prefer day or evening shifts due to personal commitments. Expected CTC: 4 LPA.\n\nThank you,\nSangeeta Mishra`,
  },
  {
    full_name: 'Tejas Ghosh',
    email: 'tejas.ghosh.exec@gmail.com',
    phone: '9889345678',
    night_shift: 'Yes',
    exp: 2, sal_min: 250000, sal_max: 300000,
    education: "Bachelor's Degree",
    cover_letter: `Dear Synersys,\n\nI have 2 years of experience in outbound US IT staffing sales with proven success in qualifying and closing contracts for Java and Cloud roles. I have worked 9 PM–6 AM IST daily and consider it my normal working hours. Expected CTC: 2.8 LPA.\n\nBest,\nTejas Ghosh`,
  },
  {
    full_name: 'Usha Rani',
    email: 'usha.rani.sales@gmail.com',
    phone: '9890456789',
    night_shift: 'Negotiable',
    exp: 1, sal_min: 200000, sal_max: 260000,
    education: 'Diploma',
    cover_letter: `Dear Hiring Manager,\n\nI am a determined fresher with a diploma and 1 year of tele-sales experience. I have handled US client calls in the evenings and am willing to adjust my schedule as needed. Night shifts are something I can manage with a transition period. Expected CTC: 2–2.5 LPA.\n\nThank you,\nUsha Rani`,
  },
];

async function seed() {
  console.log(`Seeding ${applications.length} Sales applications...`);
  let inserted = 0, skipped = 0;

  for (const app of applications) {
    try {
      await pool.query(
        `INSERT INTO applications
          (full_name, email, phone, primary_role, preferred_domains, education,
           years_of_experience, salary_min, salary_max, salary_flexible,
           status, cover_letter, night_shift_preference,
           created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                 NOW() - (random() * interval '45 days'),
                 NOW() - (random() * interval '20 days'))`,
        [
          app.full_name, app.email, app.phone,
          'Sales', JSON.stringify(['Sales', 'Business Development']),
          app.education, app.exp,
          app.sal_min, app.sal_max, 0,
          'applied', app.cover_letter, app.night_shift,
        ]
      );
      inserted++;
      console.log(`  ✓ ${app.full_name} — night shift: ${app.night_shift}`);
    } catch (err) {
      if (err.code === '23505') { skipped++; console.log(`  ⚠ Skipped ${app.full_name} (duplicate)`); }
      else console.error(`  ✗ ${app.full_name}: ${err.message}`);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await pool.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
