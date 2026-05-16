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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify JWT
  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }

  try {
    const { transaction_id, amount } = req.body;

    if (!transaction_id || !transaction_id.trim()) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    if (!amount || isNaN(parseInt(amount, 10))) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check transaction_id isn't already used
    const existing = await sql`
      SELECT id FROM payments WHERE transaction_id = ${transaction_id.trim()}
    `;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This transaction ID has already been submitted' });
    }

    // Insert payment record — status is 'pending' until manually verified
    const result = await sql`
      INSERT INTO payments (user_id, amount, method, status, transaction_id)
      VALUES (
        ${decoded.userId},
        ${parseInt(amount, 10)},
        'bankak',
        'pending',
        ${transaction_id.trim()}
      )
      RETURNING id, transaction_id, status, created_at
    `;

    return res.status(200).json({
      success: true,
      message: 'Payment submitted for verification. You will be contacted once confirmed.',
      payment: result[0],
    });
  } catch (error) {
    console.error('Payment error:', error);
    // Handle duplicate key violation gracefully
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This transaction ID has already been submitted' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
