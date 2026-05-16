const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const sql = neon(process.env.DATABASE_URL);

  // ── GET: fetch user profile ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const users = await sql`
        SELECT id, student_id, name, age, phone, education, created_at
        FROM users
        WHERE id = ${decoded.userId}
      `;
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ user: users[0] });
    } catch (error) {
      console.error('Profile GET error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── PATCH: update phone number only ─────────────────────────────────────
  if (req.method === 'PATCH') {
    try {
      const { phone } = req.body || {};
      if (!phone || phone.trim().length < 7) {
        return res.status(400).json({ error: 'A valid phone number is required (min 7 digits)' });
      }

      const result = await sql`
        UPDATE users
        SET phone = ${phone.trim()}
        WHERE id = ${decoded.userId}
        RETURNING id, student_id, name, age, phone, education, created_at
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ success: true, user: result[0] });
    } catch (error) {
      console.error('Profile PATCH error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
