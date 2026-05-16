const Stripe = require('stripe');
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }

  try {
    const { amount, exam_type } = req.body;

    if (!amount || isNaN(parseInt(amount, 10))) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sql    = neon(process.env.DATABASE_URL);

    // Fetch student info for metadata
    const users = await sql`
      SELECT name, student_id FROM users WHERE id = ${decoded.userId}
    `;
    const user = users[0] || {};

    // Create a PaymentIntent — card is confirmed inline, no redirect needed
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   parseInt(amount, 10) * 100, // Stripe expects cents
      currency: 'usd',
      description: `Al Rabat University — English ${exam_type || 'Exam'} Fee`,
      metadata: {
        user_id:    String(decoded.userId),
        student_id: user.student_id || decoded.studentId || '',
        exam_type:  exam_type || '',
      },
    });

    // Store a pending payment record keyed on the PaymentIntent ID
    await sql`
      INSERT INTO payments (user_id, amount, method, status, stripe_session_id, transaction_id)
      VALUES (
        ${decoded.userId},
        ${parseInt(amount, 10)},
        'stripe',
        'pending',
        ${paymentIntent.id},
        ${paymentIntent.id}
      )
      ON CONFLICT (transaction_id) DO NOTHING
    `;

    // Return client_secret — frontend calls stripe.confirmCardPayment()
    return res.status(200).json({
      success:       true,
      client_secret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Stripe PaymentIntent error:', error);
    return res.status(500).json({ error: 'Failed to create payment session' });
  }
};
