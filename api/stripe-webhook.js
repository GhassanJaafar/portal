const Stripe = require('stripe');
const { neon } = require('@neondatabase/serverless');

// Vercel disables body parsing for webhooks — we need the raw body
// This config export must use CommonJS to match the rest of the file
const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        await sql`
          UPDATE payments
          SET status = 'completed'
          WHERE stripe_session_id = ${pi.id}
        `;
        console.log(`PaymentIntent succeeded: ${pi.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await sql`
          UPDATE payments
          SET status = 'failed'
          WHERE stripe_session_id = ${pi.id}
        `;
        console.log(`PaymentIntent failed: ${pi.id}`);
        break;
      }

      default:
        // Unhandled event type — log and return 200 to acknowledge receipt
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Attach Vercel config so bodyParser is disabled (required for Stripe signature verification)
module.exports.config = config;
