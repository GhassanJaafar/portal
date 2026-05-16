const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

  // Validate required environment variables before doing anything
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set in Vercel dashboard');
    return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
  }
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is not set in Vercel dashboard');
    return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
  }

  try {
    const { student_id, password, turnstile_token } = req.body;

    // Validate required fields
    if (!student_id || !password || !turnstile_token) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Look up user by student_id
    const users = await sql`
      SELECT id, student_id, password_hash, name
      FROM users
      WHERE student_id = ${student_id.trim()}
    `;

    if (users.length === 0) {
      // Use a generic error to avoid user enumeration
      return res.status(401).json({ error: 'Invalid student ID or password' });
    }

    const user = users[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid student ID or password' });
    }

    // Issue JWT
    const token = jwt.sign(
      {
        userId: user.id,
        studentId: user.student_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        student_id: user.student_id,
        name: user.name || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message, '\nStack:', error.stack);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
};
