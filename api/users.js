const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin password check via Authorization header
  // Expected: "Bearer <ADMIN_PASSWORD>"
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authorization required' });
  }

  const providedPassword = authHeader.split(' ')[1];
  if (providedPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Incorrect admin password' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Fetch all users with their latest exam + result + payment
    const users = await sql`
      SELECT
        u.id,
        u.student_id,
        u.name,
        u.age,
        u.phone,
        u.education,
        u.created_at AS registered_at,
        COALESCE(
          json_agg(
            json_build_object(
              'exam_id',    e.id,
              'exam_type',  e.exam_type,
              'level',      e.level,
              'score',      r.score,
              'total',      r.total,
              'exam_date',  e.created_at
            )
            ORDER BY e.created_at DESC
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) AS exams,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'payment_id',     p.id,
              'amount',         p.amount,
              'method',         p.method,
              'status',         p.status,
              'transaction_id', p.transaction_id,
              'payment_date',   p.created_at
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS payments
      FROM users u
      LEFT JOIN exams e ON e.user_id = u.id
      LEFT JOIN results r ON r.exam_id = e.id
      LEFT JOIN payments p ON p.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    // Summary stats
    const stats = await sql`
      SELECT
        (SELECT COUNT(*) FROM users)    AS total_users,
        (SELECT COUNT(*) FROM exams)    AS total_exams,
        (SELECT COUNT(*) FROM payments WHERE status = 'completed') AS completed_payments,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending')   AS pending_payments,
        (SELECT SUM(amount) FROM payments WHERE status = 'completed') AS total_revenue
    `;

    return res.status(200).json({
      success: true,
      stats: stats[0],
      users,
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
