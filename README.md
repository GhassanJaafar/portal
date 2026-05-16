# Al Rabat University — English Testing Platform

A full-stack web application for Al Rabat National University that lets students register, take English proficiency exams, and pay for certificates — all in one flow.

**Live on Vercel · Database on Neon PostgreSQL · Payments via Stripe + Bankak**

---

## What the App Does

Students land on a login/register page, then choose one of three services:

| Service | Description | Price |
|---|---|---|
| **Placement Test** | 10-question mixed-level test that determines the student's level (A/B/C) | 3,500 SDG |
| **Level Exam** | Targeted exam for A1/A2, B1/B2, or C1/C2 | 4,000 SDG |
| **Certificate Replacement** | Re-issue a lost certificate (no exam) | 5,000 SDG |

After the exam the student sees their score, a per-question review, fills in their profile, pays (Bankak or Stripe card), and gets a video lesson matched to their level.

---

## File Structure

```
/Portal
├── api/
│   ├── register.js          # POST /api/register — create account
│   ├── login.js             # POST /api/login    — authenticate & issue JWT
│   ├── save.js              # POST /api/save     — save exam + result (JWT protected)
│   ├── payment.js           # POST /api/payment  — Bankak transaction ID (JWT protected)
│   ├── stripe-session.js    # POST /api/stripe-session — create Stripe PaymentIntent ⚠️ TODO
│   ├── stripe-webhook.js    # POST /api/stripe-webhook — Stripe webhook handler       ⚠️ TODO
│   └── users.js             # GET  /api/users    — admin panel data
├── index.html               # Single-page app (8 screens)
├── style.css                # Gold + white theme, dark mode, mobile-first
├── script.js                # All frontend logic (state, exam engine, payments)
├── questions.js             # Question bank + config constants
├── schema.sql               # Neon PostgreSQL schema (run once)
├── vercel.json              # Vercel routing config
├── package.json             # Node dependencies
├── .gitignore               # Excludes .env, node_modules, .vercel
└── .env                     # ⚠️ NOT committed — add values in Vercel Dashboard
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS (no framework) |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Neon PostgreSQL (`@neondatabase/serverless`) |
| Auth | `bcryptjs` (hashing) + `jsonwebtoken` (JWT, 8h expiry) |
| CAPTCHA | Cloudflare Turnstile (explicit render mode) |
| Payments | Stripe Elements (inline card) + Bankak (manual tx ID) |
| Hosting | Vercel |

---

## Environment Variables

Set these in the **Vercel Dashboard → Project → Settings → Environment Variables**.  
Never commit them — `.env` is already in `.gitignore`.

```env
DATABASE_URL=postgresql://...        # Neon connection string
JWT_SECRET=<long random string>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...   # Also hard-coded in script.js for frontend
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDFLARE_TURNSTILE_SECRET=...      # Secret key (backend only)
ADMIN_PASSWORD=<strong password>
```

---

## Database Setup

Run `schema.sql` once in your **Neon SQL editor**:

```sql
-- Creates 4 tables: users, exams, results, payments
-- Safe to re-run — uses CREATE TABLE IF NOT EXISTS
```

Tables:

- **users** — student_id (unique), hashed password, profile fields
- **exams** — links to user, stores exam_type + level
- **results** — links to exam, stores score + total
- **payments** — links to user, stores amount, method, status, transaction_id

---

## API Endpoints

### `POST /api/register`
Creates a new student account.
- Verifies Cloudflare Turnstile token
- Checks student_id is not already taken
- Hashes password with bcrypt (12 salt rounds)
- Validates: student_id 3–20 chars, password ≥ 6 chars

### `POST /api/login`
Authenticates a student and returns a JWT.
- Verifies Cloudflare Turnstile token
- Compares bcrypt hash
- Returns `{ token, user }` — token valid 8 hours
- Generic error message prevents user enumeration

### `POST /api/save` *(JWT required)*
Saves student profile + exam record + result in one call.
- Updates `users` with name/age/phone/education
- Inserts into `exams` and `results`
- Returns `user_id` and `exam_id` for the payment step

### `POST /api/payment` *(JWT required)*
Records a Bankak manual payment.
- Checks for duplicate `transaction_id` (unique constraint)
- Sets `status = 'pending'` — admin must verify manually
- Handles DB-level unique violation (error code `23505`)

### `POST /api/stripe-session` *(JWT required)* — ⚠️ TODO
Creates a Stripe PaymentIntent and returns `client_secret`.  
The frontend uses this to confirm the card payment inline (no redirect).

### `POST /api/stripe-webhook`
Handles `payment_intent.succeeded` events from Stripe.  
Updates payment `status` to `'completed'` in the DB.

### `GET /api/users` *(Admin password required)*
Returns all students with their exams, results, and payments.  
Also returns summary stats: total users, exams, paid count, pending count, revenue.

---

## User Flow (Step by Step)

```
1. Login / Register (with Turnstile CAPTCHA)
         ↓
2. Service Menu → choose: Placement / Level Exam / Certificate
         ↓
3a. Placement → 10 mixed questions, auto-determines level
3b. Level Exam → choose A/B/C → 10 targeted questions
3c. Certificate → skip exam, go straight to profile form
         ↓
4. Result screen → score, per-question review, level badge
         ↓
5. Student Info Form → name, age, phone, education
         ↓
6. Payment → Bankak tab (enter tx ID) or Stripe tab (card)
         ↓
7. Success screen → video lesson based on level
```

**Exam mechanics:**
- 20-second per-question timer with SVG ring countdown
- Timer turns red at ≤5 seconds
- Timeout = unanswered (no score)
- Correct/wrong highlighted for 900ms before advancing
- Progress bar at top of exam screen

---

## Frontend Screens

| Screen ID | Purpose |
|---|---|
| `screen-auth` | Login form + Turnstile CAPTCHA |
| `screen-menu` | 3 service cards with prices |
| `screen-level-select` | A/B/C level picker |
| `screen-exam` | Timer, progress bar, question + 3 options |
| `screen-result` | Score, level badge, full question review |
| `screen-info-form` | Name, age, phone, education |
| `screen-payment` | Bankak / Stripe tabs |
| `screen-success` | Confirmation + embedded video lesson |

Admin panel is a slide-in overlay, accessible via the `⚙` footer button or 5 quick clicks on the logo.

---

## questions.js Constants

```js
PLACEMENT_RANGES  // score 0-3 → A, 4-7 → B, 8-10 → C
PASS_SCORE = 6    // minimum to pass a level exam
PRICES            // placement: 3500, level: 4000, certificate: 5000 (SDG)
LESSON_VIDEOS     // YouTube embed URLs per level — replace before going live
```

---

## What Still Needs Doing

1. **`api/stripe-session.js`** — create this file (see below)
2. **`api/stripe-webhook.js`** — create this file (see below)
3. **Stripe publishable key in `script.js`** — line 13, replace `pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY`
4. **Bankak account details in `index.html`** — lines 370–375, replace `XXXX-XXXX-XXXX` and account name
5. **Video URLs in `questions.js`** — replace `REPLACE_WITH_*_VIDEO_ID` with real YouTube IDs

### Minimal `api/stripe-session.js`

```js
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET); }
  catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, exam_type } = req.body;
  if (!amount || !exam_type) return res.status(400).json({ error: 'Missing fields' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,   // Stripe uses smallest currency unit
    currency: 'usd',        // change to your currency
    metadata: { exam_type, user_id: String(decoded.userId) },
  });

  return res.status(200).json({ client_secret: paymentIntent.client_secret });
};
```

### Minimal `api/stripe-webhook.js`

```js
const Stripe = require('stripe');
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig    = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi  = event.data.object;
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO payments (user_id, amount, method, status, stripe_session_id)
      VALUES (
        ${pi.metadata.user_id},
        ${Math.round(pi.amount / 100)},
        'stripe', 'completed', ${pi.id}
      )
      ON CONFLICT (stripe_session_id) DO NOTHING
    `;
  }
  res.json({ received: true });
};
```

---

## Deploying to Vercel

```bash
# 1. Push to GitHub first
git init
git add .
git commit -m "Initial commit: Al Rabat English Platform"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# 2. Import in Vercel dashboard → deploy automatically
# 3. Add all environment variables in Vercel → Settings → Environment Variables
# 4. Set up Stripe webhook endpoint: https://your-app.vercel.app/api/stripe-webhook
```

---

## Changes & Improvements from the Original Brief

| Area | What Changed / Added |
|---|---|
| **Auth** | Login-only screen (registration removed from UI — done via API only or add a register tab if needed) |
| **CAPTCHA** | Turnstile rendered in *explicit* mode; re-renders on failed login to get a fresh token |
| **Password toggle** | 👁 button shows/hides password on login form |
| **Exam timer** | SVG ring countdown per question (not in original brief), turns red at ≤5s, timeout = unanswered |
| **Progress bar** | Live progress bar above questions |
| **Option feedback** | Correct (green) / wrong (red) highlight for 900ms before next question |
| **Result review** | Full per-question breakdown with your answer vs correct answer |
| **Stripe** | Inline card payment (no redirect) via `confirmCardPayment` — cleaner UX |
| **Bankak** | Duplicate tx ID check at both API and DB level (`UNIQUE` constraint) |
| **Admin panel** | Slide-in overlay (not a separate page), 5-stat summary + full table |
| **Admin access** | Hidden `⚙` footer button OR 5 quick logo clicks |
| **Dark mode** | Full CSS variable theming, persisted to localStorage, respects system preference |
| **schema.sql** | Uses `IF NOT EXISTS` (safe to re-run); `transaction_id VARCHAR(100)` (spec had 50) |
| **Error handling** | Inline field errors + form-level errors; generic auth error to prevent enumeration |
| **Session restore** | JWT + user stored in localStorage; page reload keeps you logged in |
| **Logo Easter egg** | 5 clicks on logo opens admin panel |

---

*Al Rabat National University © 2025*
