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
    const {
      // User profile info
      name,
      age,
      phone,
      education,
      // Exam info
      exam_type,  // 'placement' | 'level' | 'certificate'
      level,      // 'A1/A2' | 'B1/B2' | 'C1/C2' | null for placement
      // Result
      score,
      total,
    } = req.body;

    // Validate required fields
    if (!exam_type || score === undefined || total === undefined) {
      return res.status(400).json({ error: 'Missing required exam data' });
    }

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const validExamTypes = ['placement', 'level', 'certificate'];
    if (!validExamTypes.includes(exam_type)) {
      return res.status(400).json({ error: 'Invalid exam type' });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Update user profile info (they may not have filled it in at registration)
    await sql`
      UPDATE users
      SET
        name = ${name.trim()},
        age = ${age ? parseInt(age, 10) : null},
        phone = ${phone.trim()},
        education = ${education ? education.trim() : null}
      WHERE id = ${decoded.userId}
    `;

    // Insert exam record
    const examResult = await sql`
      INSERT INTO exams (user_id, exam_type, level)
      VALUES (${decoded.userId}, ${exam_type}, ${level || null})
      RETURNING id
    `;
    const exam_id = examResult[0].id;

    // Insert result
    await sql`
      INSERT INTO results (exam_id, score, total)
      VALUES (${exam_id}, ${parseInt(score, 10)}, ${parseInt(total, 10)})
    `;

    return res.status(200).json({
      success: true,
      user_id: decoded.userId,
      exam_id,
    });
  } catch (error) {
    console.error('Save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
