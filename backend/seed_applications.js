// Seed script: 25 realistic applications for Synersys (US staffing consultant, India)
// Run: node backend/seed_applications.js
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
  // ── SALES ────────────────────────────────────────────────────────────────────
  {
    full_name: 'Rohit Sharma',
    email: 'rohit.sharma.sales@gmail.com',
    phone: '9876543210',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'Business Development']),
    education: "Bachelor's Degree",
    years_of_experience: 2,
    salary_min: 250000, salary_max: 350000, salary_flexible: 0,
    status: 'applied',
    cover_letter: `Dear Hiring Team,\n\nI am applying for a Sales Executive role at Synersys. With 2 years of inside sales experience at a BPO handling US client accounts, I am fully comfortable working night shifts and US time zones (EST/PST). I have consistently exceeded monthly targets by 20% and am confident in cold calling, email outreach, and CRM management (Salesforce). I understand Synersys serves US staffing clients and I would be a strong addition to the sales team.\n\nMy expected CTC is 3 LPA and I am happy to work night shifts.\n\nThank you,\nRohit Sharma`,
  },
  {
    full_name: 'Priya Nair',
    email: 'priya.nair.bd@gmail.com',
    phone: '9845012345',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'US Staffing']),
    education: "Bachelor's Degree",
    years_of_experience: 3,
    salary_min: 280000, salary_max: 380000, salary_flexible: 0,
    status: 'shortlisted',
    cover_letter: `Dear Hiring Team,\n\nI bring 3 years of US staffing sales experience, having worked with a Hyderabad-based staffing firm supporting Fortune 500 clients. I am well-versed in the end-to-end sales cycle for IT and non-IT staffing, am fluent in American business communication, and am accustomed to working EST hours. I am seeking an opportunity to grow my career with Synersys.\n\nExpected CTC: 3 LPA. Night shift is perfectly fine.\n\nWarm regards,\nPriya Nair`,
  },
  {
    full_name: 'Karthik Rajan',
    email: 'karthik.rajan.sales@yahoo.com',
    phone: '9988776655',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'Business Development']),
    education: 'Diploma',
    years_of_experience: 1,
    salary_min: 220000, salary_max: 300000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Team,\n\nI am a fresher with 1 year of tele-sales experience in the education sector. Although I have not worked in US staffing specifically, I am a quick learner, fluent in English, and eager to transition into this domain. I am fully comfortable with night shifts. My expected salary is flexible around 2.5–3 LPA.\n\nThank you for considering my application.\nKarthik Rajan`,
  },
  {
    full_name: 'Sneha Kulkarni',
    email: 'sneha.kulkarni.exec@gmail.com',
    phone: '9123456789',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'Operations']),
    education: "Master's Degree",
    years_of_experience: 4,
    salary_min: 350000, salary_max: 450000, salary_flexible: 0,
    status: 'rejected',
    cover_letter: `Dear Hiring Team,\n\nWith 4 years in B2B sales and an MBA in Marketing, I have managed client relationships for mid-size US tech companies from India. I have strong negotiation skills, am experienced in staffing contract discussions, and have a proven track record of onboarding 15+ enterprise accounts. I am available for night shifts and expect 4 LPA CTC.\n\nRegards,\nSneha Kulkarni`,
  },
  {
    full_name: 'Aakash Verma',
    email: 'aakash.verma.biz@gmail.com',
    phone: '9871234567',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'US Staffing']),
    education: "Bachelor's Degree",
    years_of_experience: 2,
    salary_min: 250000, salary_max: 320000, salary_flexible: 0,
    status: 'final_selected',
    cover_letter: `Dear Synersys Team,\n\nI have 2 years of direct experience in US IT staffing sales, supporting a Bengaluru-based agency. I managed a pipeline of 40+ open requirements weekly, coordinating with delivery teams and US client managers. My communication is excellent, I have worked IST night shifts throughout, and my salary expectation is 3 LPA CTC.\n\nLooking forward to joining your team.\nAakash Verma`,
  },
  {
    full_name: 'Divya Menon',
    email: 'divya.menon.sales@gmail.com',
    phone: '9765432109',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'Business Development']),
    education: "Bachelor's Degree",
    years_of_experience: 1,
    salary_min: 240000, salary_max: 300000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Hiring Manager,\n\nI recently completed my graduation and have 1 year of inside-sales experience at a digital marketing agency handling US clients. I am comfortable with late-night calls, have strong verbal English skills, and am excited to enter the US staffing industry. Expected CTC: 2.5–3 LPA.\n\nThank you,\nDivya Menon`,
  },
  {
    full_name: 'Suresh Babu',
    email: 'suresh.babu.sr@gmail.com',
    phone: '9900112233',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'US Staffing']),
    education: "Bachelor's Degree",
    years_of_experience: 5,
    salary_min: 400000, salary_max: 500000, salary_flexible: 0,
    status: 'applied',
    cover_letter: `Dear Team,\n\nWith 5 years of senior sales experience in US non-IT staffing, I have led teams of 4 sales executives and consistently delivered 130% of quarterly revenue targets. I have strong networks in healthcare and administrative staffing verticals and am familiar with ATS tools like Bullhorn and Ceipal. I am seeking a senior-level opportunity and am open to night shifts. Expected CTC is 4.5 LPA.\n\nBest,\nSuresh Babu`,
  },
  {
    full_name: 'Ananya Pillai',
    email: 'ananya.pillai.exec@gmail.com',
    phone: '9654321098',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'Operations']),
    education: "Bachelor's Degree",
    years_of_experience: 2,
    salary_min: 260000, salary_max: 330000, salary_flexible: 0,
    status: 'shortlisted',
    cover_letter: `Dear Hiring Team,\n\nI am a sales professional with 2 years of experience in outbound sales for a US BPO. I have managed accounts in the healthcare staffing segment, am comfortable with American accents and time zones, and have experience using LinkedIn Sales Navigator for lead generation. My expected CTC is 3 LPA and night shifts are not an issue.\n\nWarm regards,\nAnanya Pillai`,
  },
  {
    full_name: 'Vivek Sinha',
    email: 'vivek.sinha.bd@outlook.com',
    phone: '9812345670',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Business Development', 'Sales']),
    education: "Master's Degree",
    years_of_experience: 3,
    salary_min: 300000, salary_max: 380000, salary_flexible: 0,
    status: 'another_round',
    cover_letter: `Dear Synersys,\n\nI hold an MBA and have 3 years of business development experience with a Pune-based US staffing company. I specialize in building relationships with US hiring managers and VMS portals. I have closed contracts worth $500K+ annually and am passionate about the staffing industry. Night shift is comfortable for me. Expected CTC: 3.5 LPA.\n\nSincerely,\nVivek Sinha`,
  },
  {
    full_name: 'Meenakshi Iyer',
    email: 'meenakshi.iyer.sales@gmail.com',
    phone: '9543210987',
    primary_role: 'Sales',
    preferred_domains: JSON.stringify(['Sales', 'Business Development']),
    education: "Bachelor's Degree",
    years_of_experience: 2,
    salary_min: 250000, salary_max: 320000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Hiring Manager,\n\nI am applying for a Sales Executive role at Synersys. Having worked 2 years in an international BPO handling US customer accounts, I am well-adapted to night shifts and American work culture. I am proficient in HubSpot CRM and have a track record of meeting and exceeding sales targets. Salary expectation is 3 LPA, flexible.\n\nThank you,\nMeenakshi Iyer`,
  },

  // ── HR / RECRUITING ───────────────────────────────────────────────────────────
  {
    full_name: 'Lavanya Krishnan',
    email: 'lavanya.krishnan.hr@gmail.com',
    phone: '9432109876',
    primary_role: 'HR',
    preferred_domains: JSON.stringify(['HR', 'US Staffing']),
    education: "Master's Degree",
    years_of_experience: 3,
    salary_min: 280000, salary_max: 360000, salary_flexible: 0,
    status: 'shortlisted',
    cover_letter: `Dear Hiring Team,\n\nI am an HR professional with 3 years of experience in US IT recruiting. I have sourced and placed candidates across Java, .NET, and Data Engineering roles using job boards like Dice, Monster, and LinkedIn. I am comfortable with full-cycle recruiting and have worked IST night shifts consistently. Expected CTC: 3 LPA.\n\nRegards,\nLavanya Krishnan`,
  },
  {
    full_name: 'Deepak Nambiar',
    email: 'deepak.nambiar.recruit@gmail.com',
    phone: '9321098765',
    primary_role: 'HR',
    preferred_domains: JSON.stringify(['HR', 'Talent Acquisition']),
    education: "Master's Degree",
    years_of_experience: 4,
    salary_min: 320000, salary_max: 400000, salary_flexible: 0,
    status: 'applied',
    cover_letter: `Dear Team,\n\nWith 4 years of talent acquisition experience in US non-IT staffing (Healthcare, Admin, Accounting), I am adept at sourcing passive candidates, conducting preliminary screening calls in US business hours, and managing ATS pipelines. I have worked night shifts for 4 years straight and consider it routine. Expected CTC: 3.5 LPA.\n\nBest regards,\nDeepak Nambiar`,
  },
  {
    full_name: 'Harini Balachandran',
    email: 'harini.b.hr@gmail.com',
    phone: '9210987654',
    primary_role: 'HR',
    preferred_domains: JSON.stringify(['HR', 'US Staffing']),
    education: "Bachelor's Degree",
    years_of_experience: 2,
    salary_min: 250000, salary_max: 300000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Hiring Manager,\n\nI am an HR generalist with 2 years of experience supporting US staffing operations from India. My responsibilities included job posting, candidate screening, coordinating interviews across EST/CST time zones, and onboarding documentation. I am eager to grow in a structured organization like Synersys. Expected CTC: 2.5–3 LPA, night shift is fine.\n\nThank you,\nHarini Balachandran`,
  },
  {
    full_name: 'Rajan Subramanian',
    email: 'rajan.sub.talent@gmail.com',
    phone: '9109876543',
    primary_role: 'HR',
    preferred_domains: JSON.stringify(['Talent Acquisition', 'HR']),
    education: "Master's Degree",
    years_of_experience: 6,
    salary_min: 450000, salary_max: 550000, salary_flexible: 0,
    status: 'rejected',
    cover_letter: `Dear Synersys,\n\nI am a senior recruiter with 6 years of experience exclusively in US IT staffing. I have managed teams of 5 junior recruiters, maintained vendor relationships with 20+ US clients, and have expertise in W2, C2C, and 1099 hiring models. My expected CTC is 5 LPA, which I understand may be on the higher end, but I am open to a discussion. Night shift is completely fine.\n\nSincerely,\nRajan Subramanian`,
  },
  {
    full_name: 'Swathi Reddy',
    email: 'swathi.reddy.hr@gmail.com',
    phone: '9098765432',
    primary_role: 'HR',
    preferred_domains: JSON.stringify(['HR', 'Operations']),
    education: "Bachelor's Degree",
    years_of_experience: 1,
    salary_min: 220000, salary_max: 280000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Hiring Team,\n\nI am a fresh MBA (HR) graduate with a 6-month internship at a US staffing company where I assisted senior recruiters in sourcing profiles for engineering roles. I am eager, coachable, and open to working night shifts. My expected CTC is around 2.5 LPA. I look forward to starting my career at Synersys.\n\nThank you,\nSwathi Reddy`,
  },

  // ── IT ────────────────────────────────────────────────────────────────────────
  {
    full_name: 'Nikhil Gupta',
    email: 'nikhil.gupta.dev@gmail.com',
    phone: '8987654321',
    primary_role: 'IT',
    preferred_domains: JSON.stringify(['IT', 'Software Development']),
    education: "Bachelor's Degree",
    years_of_experience: 3,
    salary_min: 400000, salary_max: 500000, salary_flexible: 0,
    status: 'applied',
    cover_letter: `Dear Team,\n\nI am a full-stack developer with 3 years of experience in React and Node.js. I have built internal tools for US-based clients and am comfortable with remote collaboration across time zones. I am applying for an IT role at Synersys to support internal systems or client portals. Expected CTC: 4.5 LPA. Night shift is manageable.\n\nThank you,\nNikhil Gupta`,
  },
  {
    full_name: 'Pooja Agarwal',
    email: 'pooja.agarwal.it@gmail.com',
    phone: '8876543210',
    primary_role: 'IT',
    preferred_domains: JSON.stringify(['IT', 'Data Analytics']),
    education: "Bachelor's Degree",
    years_of_experience: 2,
    salary_min: 350000, salary_max: 420000, salary_flexible: 0,
    status: 'shortlisted',
    cover_letter: `Dear Hiring Manager,\n\nI am a data analyst with 2 years of experience using Python, SQL, and Power BI to build dashboards for US clients in the staffing industry. I have built reports tracking candidate pipeline metrics and client billing. I am comfortable with US working hours. Expected CTC: 4 LPA.\n\nWarm regards,\nPooja Agarwal`,
  },
  {
    full_name: 'Rahul Desai',
    email: 'rahul.desai.support@gmail.com',
    phone: '8765432109',
    primary_role: 'IT',
    preferred_domains: JSON.stringify(['IT', 'Technical Support']),
    education: 'Diploma',
    years_of_experience: 2,
    salary_min: 280000, salary_max: 350000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Team,\n\nI am an IT support professional with 2 years of experience in L1/L2 helpdesk for a US-based company. I am experienced with ticketing systems (ServiceNow, Jira), remote desktop support, and have worked US EST night shifts throughout my career. I am applying for an IT support role at Synersys. Expected CTC: 3 LPA, flexible.\n\nThank you,\nRahul Desai`,
  },
  {
    full_name: 'Tanvi Shah',
    email: 'tanvi.shah.dev@gmail.com',
    phone: '8654321098',
    primary_role: 'IT',
    preferred_domains: JSON.stringify(['Software Development', 'IT']),
    education: "Bachelor's Degree",
    years_of_experience: 1,
    salary_min: 300000, salary_max: 380000, salary_flexible: 0,
    status: 'applied',
    cover_letter: `Dear Synersys,\n\nI am a junior software developer (React, Python) fresh from a 1-year training program at a tech institute. I have completed two freelance projects for US clients. I am looking for a stable full-time opportunity and am comfortable working night shifts. Expected CTC: 3.5 LPA.\n\nRegards,\nTanvi Shah`,
  },

  // ── OPERATIONS ────────────────────────────────────────────────────────────────
  {
    full_name: 'Manoj Pillai',
    email: 'manoj.pillai.ops@gmail.com',
    phone: '8543210987',
    primary_role: 'Operations',
    preferred_domains: JSON.stringify(['Operations', 'US Staffing']),
    education: "Bachelor's Degree",
    years_of_experience: 4,
    salary_min: 300000, salary_max: 380000, salary_flexible: 0,
    status: 'shortlisted',
    cover_letter: `Dear Hiring Manager,\n\nI have 4 years of operations experience supporting a US staffing company from Kochi. My responsibilities included managing candidate databases, coordinating between sales and delivery teams, preparing MIS reports, and handling client invoicing queries. I am well-versed in working night shifts and US processes. Expected CTC: 3.5 LPA.\n\nBest,\nManoj Pillai`,
  },
  {
    full_name: 'Nisha Joshi',
    email: 'nisha.joshi.ops@gmail.com',
    phone: '8432109876',
    primary_role: 'Operations',
    preferred_domains: JSON.stringify(['Operations', 'HR']),
    education: "Bachelor's Degree",
    years_of_experience: 2,
    salary_min: 250000, salary_max: 300000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Team,\n\nI am an operations executive with 2 years of experience in back-office support for a US healthcare staffing firm. I have handled onboarding documentation, compliance tracking, and coordination with US team members during night shifts. I am detail-oriented and organized. Expected CTC: 2.5–3 LPA.\n\nThank you,\nNisha Joshi`,
  },
  {
    full_name: 'Rajesh Kumar',
    email: 'rajesh.kumar.teamlead@gmail.com',
    phone: '8321098765',
    primary_role: 'Operations',
    preferred_domains: JSON.stringify(['Operations', 'Sales']),
    education: "Bachelor's Degree",
    years_of_experience: 5,
    salary_min: 380000, salary_max: 450000, salary_flexible: 0,
    status: 'another_round',
    cover_letter: `Dear Synersys,\n\nI am a team lead with 5 years of experience managing operations for a US-staffing back-office unit. I have led a team of 8 and am responsible for daily productivity tracking, SLA adherence, and weekly reporting to US stakeholders. I work EST hours routinely and am seeking a senior operations role. Expected CTC: 4 LPA.\n\nSincerely,\nRajesh Kumar`,
  },
  {
    full_name: 'Archana Rao',
    email: 'archana.rao.ops@gmail.com',
    phone: '8210987654',
    primary_role: 'Operations',
    preferred_domains: JSON.stringify(['Operations', 'Business Development']),
    education: "Bachelor's Degree",
    years_of_experience: 3,
    salary_min: 270000, salary_max: 340000, salary_flexible: 0,
    status: 'applied',
    cover_letter: `Dear Hiring Team,\n\nI have 3 years of experience in operations and vendor coordination for a US staffing firm. My work involved maintaining job order trackers, managing consultant timesheets, and following up with US vendors during night shifts. I am organized, proactive, and ready to contribute to Synersys. Expected CTC: 3 LPA.\n\nWarm regards,\nArchana Rao`,
  },
  {
    full_name: 'Santhosh Menon',
    email: 'santhosh.menon.ops@gmail.com',
    phone: '8109876543',
    primary_role: 'Operations',
    preferred_domains: JSON.stringify(['Operations', 'HR']),
    education: "Master's Degree",
    years_of_experience: 3,
    salary_min: 300000, salary_max: 360000, salary_flexible: 0,
    status: 'applied',
    cover_letter: `Dear Team,\n\nI hold an MBA in Operations Management and have 3 years of experience supporting US staffing operations from Chennai. My background includes process documentation, SOP development, quality audits, and workforce planning support. I am comfortable with IST night shifts and US holidays. Expected CTC: 3.2 LPA.\n\nThank you,\nSanthosh Menon`,
  },
  {
    full_name: 'Fathima Sultana',
    email: 'fathima.sultana.hr@gmail.com',
    phone: '8009876543',
    primary_role: 'HR',
    preferred_domains: JSON.stringify(['HR', 'US Staffing']),
    education: "Master's Degree",
    years_of_experience: 2,
    salary_min: 260000, salary_max: 320000, salary_flexible: 1,
    status: 'applied',
    cover_letter: `Dear Synersys,\n\nI am an HR professional with 2 years of end-to-end US IT recruiting experience. I have sourced candidates for cloud (AWS, Azure) and cybersecurity roles using Boolean search, LinkedIn Recruiter, and Dice. I am comfortable negotiating pay rates with contractors and working US hours from India. Expected CTC: 3 LPA, flexible.\n\nRegards,\nFathima Sultana`,
  },
];

async function seed() {
  console.log(`Seeding ${applications.length} applications...`);
  let inserted = 0;
  let skipped = 0;

  for (const app of applications) {
    try {
      await pool.query(
        `INSERT INTO applications
          (full_name, email, phone, primary_role, preferred_domains, education,
           years_of_experience, salary_min, salary_max, salary_flexible,
           status, cover_letter, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                 NOW() - (random() * interval '60 days'),
                 NOW() - (random() * interval '30 days'))`,
        [
          app.full_name, app.email, app.phone, app.primary_role,
          app.preferred_domains, app.education, app.years_of_experience,
          app.salary_min, app.salary_max, app.salary_flexible,
          app.status, app.cover_letter,
        ]
      );
      inserted++;
      console.log(`  ✓ ${app.full_name} (${app.primary_role}) — ${app.status}`);
    } catch (err) {
      if (err.code === '23505') {
        skipped++;
        console.log(`  ⚠ Skipped ${app.full_name} — email already exists`);
      } else {
        console.error(`  ✗ ${app.full_name}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped (duplicate): ${skipped}`);
  await pool.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
