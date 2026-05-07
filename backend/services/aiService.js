const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getModel(maxOutputTokens = 4096) {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens },
  });
}

function getMatchModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4096 },
  });
}

function parseJSON(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(cleaned); } catch {
    // Try full array/object extraction
    const arr = cleaned.match(/\[[\s\S]*\]/);
    if (arr) { try { return JSON.parse(arr[0]); } catch {} }
    const obj = cleaned.match(/\{[\s\S]*\}/);
    if (obj) { try { return JSON.parse(obj[0]); } catch {} }

    // Salvage partial array — extract all complete {...} objects from a truncated array
    const objects = [];
    const re = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
    let m;
    while ((m = re.exec(cleaned)) !== null) {
      try { objects.push(JSON.parse(m[0])); } catch {}
    }
    if (objects.length) return objects;

    throw new Error('AI returned non-JSON: ' + cleaned.slice(0, 200));
  }
}

function buildProfile(app) {
  const domains = app.preferred_domains
    ? (typeof app.preferred_domains === 'string'
        ? JSON.parse(app.preferred_domains)
        : app.preferred_domains
      ).join(', ')
    : 'Not specified';

  const salary = app.salary_flexible
    ? 'Flexible / Negotiable'
    : app.salary_min && app.salary_max
      ? `₹${(app.salary_min / 100000).toFixed(1)} LPA – ₹${(app.salary_max / 100000).toFixed(1)} LPA CTC`
      : 'Not specified';

  const nightShift = app.night_shift_preference || 'Not specified';

  return [
    `Name: ${app.full_name}`,
    `Primary Role: ${app.primary_role}`,
    `Experience: ${app.years_of_experience ?? 'N/A'} years`,
    `Education: ${app.education || 'Not provided'}`,
    `Preferred Domains: ${domains}`,
    `Salary Expectation: ${salary}`,
    `Night Shift Availability: ${nightShift}`,
    `Cover Letter:\n${app.cover_letter || 'Not provided'}`,
  ].join('\n');
}

// Night shift is mandatory at Synersys — hard-cap scores for "No" candidates
function applyNightShiftPenalty(score, nightShiftPref) {
  if (nightShiftPref === 'No') return Math.min(score, 15);
  if (nightShiftPref === 'Negotiable') return Math.min(score, score * 0.85);
  return score;
}

// ── Feature 1: Score & summarise a single application ────────────────────────

async function analyzeApplication(application) {
  const model = getModel();
  const prompt = `You are a senior HR recruitment analyst for Synersys, an Indian company that supports US recruiting & staffing. All roles require mandatory night shifts (US time zones EST/PST). Target salary is around 3 LPA CTC (max acceptable ~4 LPA). US staffing experience, strong English communication, and night-shift willingness are critical.

${buildProfile(application)}

Score out of 100:
- Cover letter quality & professionalism (25 pts)
- Relevance to applied role & US staffing context (25 pts)
- Education strength (15 pts)
- Communication & motivation (15 pts)
- Salary alignment (≤4 LPA = good; >4.5 LPA = concern) (10 pts)
- Night shift willingness — "Yes" = full marks, "Negotiable" = partial, "No" = 0 pts (10 pts)
- Completeness (5 pts - reduced if no cover letter)

IMPORTANT: If Night Shift Availability is "No", this is a near-disqualifying factor. Reflect this heavily in your score and recommendation.

Respond ONLY with valid JSON:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence professional summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areas_for_improvement": ["<area 1>", "<area 2>"],
  "recommendation": "<one concise sentence>"
}`;

  const result = await model.generateContent(prompt);
  const analysis = parseJSON(result.response.text());
  if (typeof analysis.score !== 'number') analysis.score = 50;
  const rawScore = Math.max(0, Math.min(100, Math.round(analysis.score)));
  analysis.score = Math.round(applyNightShiftPenalty(rawScore, application.night_shift_preference));
  return analysis;
}

// ── Feature 2: Match a job description against multiple candidates ────────────

const CONCURRENCY = 5; // parallel API calls at once

function compactProfile(c) {
  const cl = c.cover_letter
    ? c.cover_letter.slice(0, 180) + (c.cover_letter.length > 180 ? '…' : '')
    : 'Not provided';
  const salary = c.salary_flexible
    ? 'Flexible'
    : (c.salary_min && c.salary_max)
      ? `${(c.salary_min / 100000).toFixed(1)}-${(c.salary_max / 100000).toFixed(1)} LPA`
      : 'Not specified';
  return `Exp:${c.years_of_experience ?? '?'}yrs | Edu:${c.education || '?'} | Salary:${salary} | NightShift:${c.night_shift_preference || 'unknown'}\nCoverLetter:${cl}`;
}

async function scoreOneCandidate(jobDescription, candidate, domainContext) {
  const model = getMatchModel();
  const tierNote = candidate._tier === 2
    ? 'NOTE: This candidate is from a related domain (not exact match) — score based on JD fit.'
    : candidate._tier === 3
    ? 'NOTE: This candidate is a JD-keyword fallback — score purely on JD relevance.'
    : '';
  const prompt = `Synersys recruiter AI. Rate this candidate 0-100 for the job.
RULES: NightShift=No→max15. NightShift=Negotiable→max65. Salary>4.5LPA→-15. USstaffing/BPO→+15.${domainContext ? `\nTARGET DOMAIN: ${domainContext}` : ''}${tierNote ? `\n${tierNote}` : ''}
JOB: ${jobDescription}
CANDIDATE ID:${candidate.id}: ${compactProfile(candidate)}
Reply with ONLY this exact JSON object (no array, no markdown, no extra text):
{"application_id":${candidate.id},"match_score":0,"explanation":"one sentence max 20 words","key_matches":["a","b"],"gaps":["a"]}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const parsed = parseJSON(text);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

async function matchJobDescription(jobDescription, candidates, domainContext) {
  if (!candidates.length) return [];

  const nightShiftMap = {};
  candidates.forEach((c) => { nightShiftMap[c.id] = c.night_shift_preference; });

  // Score each candidate individually with controlled concurrency
  // One candidate per call = tiny response = guaranteed no truncation
  const allRaw = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const slice = candidates.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      slice.map((c) => scoreOneCandidate(jobDescription, c, domainContext))
    );
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value?.application_id != null) {
        allRaw.push(r.value);
      } else if (r.status === 'rejected') {
        console.error('Candidate scoring failed:', r.reason?.message);
      }
    }
  }

  return allRaw
    .map((r) => {
      const rawScore = Math.max(0, Math.min(100, Math.round(r.match_score ?? 0)));
      const finalScore = Math.round(applyNightShiftPenalty(rawScore, nightShiftMap[r.application_id]));
      const gaps = r.gaps || [];
      if (nightShiftMap[r.application_id] === 'No' && !gaps.some((g) => /night/i.test(g))) {
        gaps.unshift('Not available for night shift — mandatory for this role');
      }
      return {
        application_id: r.application_id,
        match_score: finalScore,
        explanation: r.explanation || '',
        key_matches: r.key_matches || [],
        gaps,
      };
    })
    ; // sorting by tier+score is done in the route after enrichment
}

// ── Feature 3: Summarise a single application for a recruiter ────────────────

async function summarizeApplication(application) {
  const model = getModel();
  const prompt = `You are an HR assistant. Summarize this job application into clear, concise key points for a recruiter.

${buildProfile(application)}

Respond ONLY with valid JSON:
{
  "overview": "<2 sentence professional overview of the candidate>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>", "<point 4>"],
  "skills_highlighted": ["<skill 1>", "<skill 2>"],
  "concerns": ["<concern 1>"]
}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

module.exports = { analyzeApplication, matchJobDescription, summarizeApplication };
