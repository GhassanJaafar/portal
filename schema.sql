-- ─────────────────────────────────────────────────────────────────────────────
-- schema.sql — Al Rabat English Platform
-- Run this once in your Neon SQL editor to create all tables.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  student_id    VARCHAR(20)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(50),
  age           INT,
  phone         VARCHAR(20),
  education     VARCHAR(50),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  exam_type  VARCHAR(20),
  level      VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
  id         SERIAL PRIMARY KEY,
  exam_id    INT REFERENCES exams(id) ON DELETE CASCADE,
  score      INT,
  total      INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  user_id           INT REFERENCES users(id) ON DELETE CASCADE,
  amount            INT,
  method            VARCHAR(20),
  status            VARCHAR(20),
  transaction_id    VARCHAR(100) UNIQUE,
  stripe_session_id VARCHAR(100),
  created_at        TIMESTAMP DEFAULT NOW()
);
