const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

async function verifyTurnstile(token, ip) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.CLOUDFLARE_TURNSTILE_SECRET,
      response: token,
      remoteip: ip,
    }),
  });
  const data = await response.json();
  return data.success === true;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { student_id, password, turnstile_token } = req.body;

    // Validate required fields
    if (!student_id || !password || !turnstile_token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (student_id.trim().length < 3 || student_id.trim().length > 20) {
      return res.status(400).json({ error: 'Student ID must be 3–20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify Turnstile CAPTCHA
    const clientIp =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress;

    const captchaValid = await verifyTurnstile(turnstile_token, clientIp);
    if (!captchaValid) {
      return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }

    // Connect to DB
    const sql = neon(process.env.DATABASE_URL);

    // Check if student_id already exists
    const existing = await sql`
      SELECT id FROM users WHERE student_id = ${student_id.trim()}
    `;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A student with this ID already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await sql`
      INSERT INTO users (student_id, password_hash)
      VALUES (${student_id.trim()}, ${password_hash})
      RETURNING id, student_id, created_at
    `;

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result[0].id,
        student_id: result[0].student_id,
        created_at: result[0].created_at,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
