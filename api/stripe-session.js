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
    const { amount, exam_type, success_url, cancel_url } = req.body;

    if (!amount || isNaN(parseInt(amount, 10))) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }
    if (!success_url || !cancel_url) {
      return res.status(400).json({ error: 'Success and cancel URLs are required' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sql = neon(process.env.DATABASE_URL);

    // Fetch user info for the Stripe customer name
    const users = await sql`
      SELECT name, student_id FROM users WHERE id = ${decoded.userId}
    `;
    const user = users[0] || {};

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: parseInt(amount, 10) * 100, // Stripe expects cents
            product_data: {
              name: `Al Rabat University — English ${exam_type || 'Exam'} Fee`,
              description: `Student ID: ${user.student_id || decoded.studentId}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: undefined, // no email stored
      metadata: {
        user_id: String(decoded.userId),
        student_id: decoded.studentId,
        exam_type: exam_type || '',
      },
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url,
    });

    // Store pending payment record keyed on stripe_session_id
    await sql`
      INSERT INTO payments (user_id, amount, method, status, stripe_session_id, transaction_id)
      VALUES (
        ${decoded.userId},
        ${parseInt(amount, 10)},
        'stripe',
        'pending',
        ${session.id},
        ${session.id}
      )
      ON CONFLICT (transaction_id) DO NOTHING
    `;

    return res.status(200).json({
      success: true,
      session_id: session.id,
      checkout_url: session.url,
    });
  } catch (error) {
    console.error('Stripe session error:', error);
    return res.status(500).json({ error: 'Failed to create payment session' });
  }
};
