// ─────────────────────────────────────────────────────────────────────────────
// script.js — Al Rabat University English Testing Platform
// ─────────────────────────────────────────────────────────────────────────────

// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_BASE = '';

// TODO: Replace with your real Cloudflare Turnstile site key before deploying.
// Test key '1x00000000000000000000AA' always passes — safe for development.
const TURNSTILE_SITE_KEY = '0x4AAAAAADQlJXZd_LAtWNnw';

// TODO: Replace with your real Stripe publishable key (starts with pk_test_ or pk_live_).
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51TWGHZLhj7Sizz7QVmBaS2auR6f494TB8s5Sza4doH1ITTFOIOpqbOUaO5my0wffCN3343YKtUQySctBMjxf3zA400oiWfWOQJ';

const TIMER_SECONDS = 20;
const CIRCUMFERENCE = 2 * Math.PI * 19; // ≈ 119.38 (matches SVG r="19")

// ── SVG ICON LIBRARY ──────────────────────────────────────────────────────────
const ICONS = {
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,

  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,

  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--success)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,

  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,

  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--warning)"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,

  graduationCap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,

  check: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,

  x: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

// ── STRIPE ────────────────────────────────────────────────────────────────────
let stripeInstance = null;
let cardElement    = null;

// ── STATE ─────────────────────────────────────────────────────────────────────
let state = {
  token:              null,
  user:               null,
  examType:           null,   // 'placement' | 'level' | 'certificate'
  level:              null,   // 'A' | 'B' | 'C'
  determinedLevel:    null,   // set after placement test
  questions:          [],
  currentQ:           0,
  answers:            [],     // { chosen: number|null, correct: number }[]
  score:              0,
  timerInterval:      null,
  timeLeft:           TIMER_SECONDS,
  userId:             null,
  examId:             null,
  turnstileTokenLogin:    null,
  turnstileTokenRegister: null,
  profilePrevScreen:  'menu', // track where to go back from profile
  infoFormPrevScreen: 'result', // track where to go back from info-form
};

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getSavedTheme());
  initAuth();

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Profile button
  document.getElementById('profile-btn').addEventListener('click', openProfile);

  // Profile back button
  document.getElementById('profile-back-btn').addEventListener('click', closeProfile);

  // Info form back button
  document.getElementById('info-form-back-btn').addEventListener('click', () => {
    if (state.infoFormPrevScreen === 'menu') {
      showScreen('menu');
    } else {
      showScreen('result');
    }
  });

  // Profile phone edit controls
  document.getElementById('profile-phone-edit-btn').addEventListener('click', () => {
    const form = document.getElementById('profile-phone-form');
    form.classList.remove('hidden');
    const currentPhone = document.getElementById('profile-phone').textContent;
    document.getElementById('profile-phone-input').value =
      currentPhone === '—' ? '' : currentPhone;
    document.getElementById('profile-phone-input').focus();
  });

  document.getElementById('profile-phone-cancel-btn').addEventListener('click', () => {
    document.getElementById('profile-phone-form').classList.add('hidden');
    document.getElementById('profile-phone-error').textContent = '';
  });

  document.getElementById('profile-phone-save-btn').addEventListener('click', saveProfilePhone);

  // Logo: 5 quick clicks opens admin
  let logoClicks = 0, logoTimer;
  document.getElementById('logo-area').addEventListener('click', () => {
    logoClicks++;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; }, 1500);
    if (logoClicks >= 5) { logoClicks = 0; openAdmin(); }
  });
});

// ── THEME ─────────────────────────────────────────────────────────────────────
function getSavedTheme() {
  return localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-toggle').innerHTML =
    theme === 'dark' ? ICONS.sun : ICONS.moon;
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

// ── SCREEN MANAGEMENT ─────────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  // Show/hide header
  const noHeader = ['auth'];
  const header = document.getElementById('app-header');
  if (noHeader.includes(name)) {
    header.classList.add('hidden');
  } else {
    header.classList.remove('hidden');
    if (state.user) {
      document.getElementById('header-student-id').textContent = state.user.student_id;
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── LOADING ───────────────────────────────────────────────────────────────────
function setLoading(on) {
  const overlay = document.getElementById('loading-overlay');
  if (on) overlay.classList.add('active');
  else     overlay.classList.remove('active');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── API HELPER ────────────────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── FIELD ERRORS ──────────────────────────────────────────────────────────────
function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearFieldErrors(...ids) {
  ids.forEach(id => setFieldError(id, ''));
}
function setFormError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function initAuth() {
  // Restore session
  const saved = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  if (saved && savedUser) {
    state.token = saved;
    state.user  = JSON.parse(savedUser);
    showScreen('menu');
    return;
  }

  // Password toggle for login
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Login form submission
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Render Turnstile after the script is ready
  waitForTurnstile(() => {
    renderTurnstile('turnstile-login', token => { state.turnstileTokenLogin = token; });
  });

  showScreen('auth');
}

// Turnstile helpers
function waitForTurnstile(cb, retries = 20) {
  if (window.turnstile) { cb(); return; }
  if (retries <= 0) return;
  setTimeout(() => waitForTurnstile(cb, retries - 1), 300);
}

function renderTurnstile(containerId, onSuccess) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  window.turnstile.render('#' + containerId, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: onSuccess,
    'expired-callback': () => {
      if (containerId === 'turnstile-login')    state.turnstileTokenLogin    = null;
      if (containerId === 'turnstile-register') state.turnstileTokenRegister = null;
    },
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  });
}

async function handleLogin(e) {
  e.preventDefault();
  clearFieldErrors('login-student-id-error','login-password-error','login-captcha-error');
  setFormError('login-form-error', '');

  const studentId = document.getElementById('login-student-id').value.trim();
  const password  = document.getElementById('login-password').value;

  let valid = true;
  if (!studentId) { setFieldError('login-student-id-error', 'Student ID is required'); valid = false; }
  if (!password)  { setFieldError('login-password-error',   'Password is required');   valid = false; }
  if (!state.turnstileTokenLogin) {
    setFieldError('login-captcha-error', 'Please complete the CAPTCHA'); valid = false;
  }
  if (!valid) return;

  setLoading(true);
  try {
    const data = await apiCall('/api/login', 'POST', {
      student_id:      studentId,
      password,
      turnstile_token: state.turnstileTokenLogin,
    });
    state.token = data.token;
    state.user  = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    showScreen('menu');
  } catch (err) {
    setFormError('login-form-error', err.message);
    renderTurnstile('turnstile-login', token => { state.turnstileTokenLogin = token; });
  } finally {
    setLoading(false);
  }
}

function logout() {
  stopTimer();
  state = {
    ...state,
    token: null, user: null,
    examType: null, level: null, determinedLevel: null,
    questions: [], currentQ: 0, answers: [], score: 0,
    userId: null, examId: null,
    turnstileTokenLogin: null, turnstileTokenRegister: null,
  };
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();
  showScreen('auth');
  // Re-init auth (re-render Turnstile)
  initAuth();
}

// ── SERVICE MENU ──────────────────────────────────────────────────────────────
function selectService(type) {
  state.examType        = type;
  state.level           = null;
  state.determinedLevel = null;
  state.answers         = [];
  state.score           = 0;
  state.currentQ        = 0;

  if (type === 'certificate') {
    state.infoFormPrevScreen = 'menu';
    showScreen('info-form');
  } else if (type === 'level') {
    showScreen('level-select');
  } else {
    // placement
    state.questions = QUESTIONS.placement;
    startExam();
  }
}

function selectLevel(level) {
  state.level     = level;
  state.questions = QUESTIONS[level];
  startExam();
}

// ── EXAM ──────────────────────────────────────────────────────────────────────
function startExam() {
  state.currentQ = 0;
  state.answers  = [];
  state.score    = 0;

  // Set badge label
  const badgeLabels = {
    placement: 'Placement Test',
    level:     state.level ? `Level ${state.level}1/${state.level}2 Exam` : 'Level Exam',
  };
  document.getElementById('exam-type-badge').textContent =
    badgeLabels[state.examType] || 'Exam';

  showScreen('exam');
  renderQuestion();
}

function exitExam() {
  if (!confirm('Exit exam? Your progress will be lost.')) return;
  stopTimer();
  if (state.examType === 'level') {
    showScreen('level-select');
  } else {
    showScreen('menu');
  }
}

function renderQuestion() {
  const q    = state.questions[state.currentQ];
  const total = state.questions.length;

  // Counter
  document.getElementById('exam-counter').textContent =
    `Question ${state.currentQ + 1} of ${total}`;

  // Progress bar
  const pct = (state.currentQ / total) * 100;
  const pb  = document.getElementById('progress-bar');
  pb.style.width = pct + '%';
  pb.parentElement.setAttribute('aria-valuenow', state.currentQ);

  // Question text
  document.getElementById('question-text').textContent = q.text;

  // Options
  const list = document.getElementById('options-list');
  list.innerHTML = '';
  ['A','B','C'].forEach((label, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <span class="option-label">${label}</span>
      <span class="option-text">${q.options[i]}</span>`;
    btn.addEventListener('click', () => selectOption(i));
    list.appendChild(btn);
  });

  // Timer
  startTimer();
}

function startTimer() {
  stopTimer();
  state.timeLeft = TIMER_SECONDS;
  updateTimerUI(TIMER_SECONDS);

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerUI(state.timeLeft);
    if (state.timeLeft <= 0) {
      stopTimer();
      recordAnswer(null);
      showFeedbackThenAdvance(null);
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerUI(seconds) {
  const ring = document.getElementById('timer-ring');
  const text = document.getElementById('timer-text');
  if (!ring || !text) return;

  const offset = ((TIMER_SECONDS - seconds) / TIMER_SECONDS) * CIRCUMFERENCE;
  ring.style.strokeDashoffset = offset;
  text.textContent = seconds;

  if (seconds <= 5) ring.classList.add('urgent');
  else              ring.classList.remove('urgent');
}

function selectOption(chosen) {
  stopTimer();
  const q = state.questions[state.currentQ];
  recordAnswer(chosen);
  showFeedbackThenAdvance(chosen, q.answer);
}

function recordAnswer(chosen) {
  const q = state.questions[state.currentQ];
  const isCorrect = chosen === q.answer;
  state.answers.push({ chosen, correct: q.answer });
  if (isCorrect) state.score++;
}

function showFeedbackThenAdvance(chosen, correctIndex) {
  const buttons = document.querySelectorAll('.option-btn');
  const q = state.questions[state.currentQ];

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)  btn.classList.add('correct');
    if (chosen !== null && i === chosen && chosen !== q.answer) btn.classList.add('wrong');
  });

  setTimeout(advanceQuestion, 900);
}

function advanceQuestion() {
  state.currentQ++;
  if (state.currentQ >= state.questions.length) {
    endExam();
  } else {
    renderQuestion();
  }
}

function endExam() {
  stopTimer();
  if (state.examType === 'placement') {
    const range = PLACEMENT_RANGES.find(
      r => state.score >= r.min && state.score <= r.max
    );
    state.determinedLevel = range ? range.level : 'A';
  }
  showResult();
}

// ── RESULT ────────────────────────────────────────────────────────────────────
function showResult() {
  showScreen('result');

  const total = state.questions.length;
  const passed = state.score >= PASS_SCORE;

  // Icon & title
  const iconEl = document.getElementById('result-icon');
  iconEl.innerHTML = passed ? ICONS.checkCircle : ICONS.fileText;

  document.getElementById('score-num').textContent = state.score;

  const capSvg = ICONS.graduationCap;

  if (state.examType === 'placement') {
    const range = PLACEMENT_RANGES.find(r => r.level === state.determinedLevel);
    document.getElementById('result-title').textContent   = 'Placement Complete';
    document.getElementById('result-level-badge').innerHTML =
      `<div class="result-level-wrap">${capSvg} Your level: <strong>${range ? range.label : ''}</strong></div>`;
    document.getElementById('result-message').textContent =
      `Based on your score of ${state.score}/${total}, your English level is ${range ? range.description : ''}.`;
  } else {
    const levelLabels = { A: 'A1/A2', B: 'B1/B2', C: 'C1/C2' };
    document.getElementById('result-title').textContent = passed ? 'Exam Passed!' : 'Exam Complete';
    document.getElementById('result-level-badge').innerHTML = passed
      ? `<div class="result-level-wrap">${capSvg} Passed — ${levelLabels[state.level] || ''}</div>`
      : `<div class="result-level-wrap" style="background:var(--error-bg);color:var(--error)">${ICONS.x} Not passed — ${levelLabels[state.level] || ''}</div>`;
    document.getElementById('result-message').textContent = passed
      ? `Congratulations! You scored ${state.score}/${total}. Your certificate will be issued upon payment.`
      : `You scored ${state.score}/${total}. A score of ${PASS_SCORE} or higher is required to pass. You may still proceed to payment for your record.`;
  }

  // Review list
  const reviewList = document.getElementById('review-list');
  reviewList.innerHTML = '';
  state.questions.forEach((q, i) => {
    const ans     = state.answers[i];
    const isRight = ans && ans.chosen === ans.correct;
    const div     = document.createElement('div');
    div.className = `review-item ${isRight ? 'correct-item' : 'wrong-item'}`;
    div.innerHTML = `
      <div class="review-q">
        <span class="review-q-num">${i + 1}.</span>
        <span>${q.text}</span>
      </div>
      <div class="review-answers">
        ${isRight
          ? `<span class="review-correct-mark">${ICONS.check} ${q.options[ans.correct]}</span>`
          : `<span class="review-your">${ICONS.x} Your answer: ${ans && ans.chosen !== null ? q.options[ans.chosen] : 'No answer (timed out)'}</span>
             <span class="review-correct">${ICONS.check} Correct: ${q.options[ans.correct]}</span>`
        }
      </div>`;
    reviewList.appendChild(div);
  });
}

function goToInfoForm() {
  state.infoFormPrevScreen = 'result';
  showScreen('info-form');
}

// ── INFO FORM ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('info-form').addEventListener('submit', handleInfoSubmit);
});

async function handleInfoSubmit(e) {
  e.preventDefault();
  clearFieldErrors('info-name-error','info-age-error','info-phone-error','info-education-error');
  setFormError('info-form-error', '');

  const name      = document.getElementById('info-name').value.trim();
  const age       = document.getElementById('info-age').value;
  const phone     = document.getElementById('info-phone').value.trim();
  const education = document.getElementById('info-education').value;

  let valid = true;
  if (!name)  { setFieldError('info-name-error',      'Full name is required');       valid = false; }
  if (!age || +age < 16 || +age > 99) {
    setFieldError('info-age-error', 'Please enter a valid age (16–99)'); valid = false;
  }
  if (!phone) { setFieldError('info-phone-error',     'Phone number is required');    valid = false; }
  if (!education) { setFieldError('info-education-error', 'Please select your education level'); valid = false; }
  if (!valid) return;

  setLoading(true);
  try {
    const isCert = state.examType === 'certificate';
    const data = await apiCall('/api/save', 'POST', {
      name, age: +age, phone, education,
      exam_type: state.examType,
      level:     state.determinedLevel || state.level || null,
      score:     isCert ? 0 : state.score,
      total:     isCert ? 0 : state.questions.length,
    }, true);

    state.userId = data.user_id;
    state.examId = data.exam_id;
    showScreen('payment');
    renderPaymentScreen();
  } catch (err) {
    setFormError('info-form-error', err.message);
  } finally {
    setLoading(false);
  }
}

// ── PAYMENT ───────────────────────────────────────────────────────────────────
function renderPaymentScreen() {
  const serviceNames = {
    placement:   'Placement Test',
    level:       'Level Exam',
    certificate: 'Certificate Replacement',
  };
  const price = PRICES[state.examType] || 0;

  document.getElementById('payment-service-name').textContent =
    serviceNames[state.examType] || 'Service';
  document.getElementById('payment-amount-display').textContent =
    price.toLocaleString() + ' SDG';

  const bankakForm = document.getElementById('bankak-form');
  bankakForm.removeEventListener('submit', handleBankakPayment);
  bankakForm.addEventListener('submit', handleBankakPayment);
}

function switchPayTab(tab) {
  const bankakBtn   = document.getElementById('pay-tab-bankak');
  const stripeBtn   = document.getElementById('pay-tab-stripe');
  const bankakPanel = document.getElementById('pay-panel-bankak');
  const stripePanel = document.getElementById('pay-panel-stripe');

  if (tab === 'bankak') {
    bankakBtn.classList.add('active');
    stripeBtn.classList.remove('active');
    bankakPanel.classList.remove('hidden');
    stripePanel.classList.add('hidden');
  } else {
    stripeBtn.classList.add('active');
    bankakBtn.classList.remove('active');
    stripePanel.classList.remove('hidden');
    bankakPanel.classList.add('hidden');
    setTimeout(initStripeElements, 50);
  }
}

async function handleBankakPayment(e) {
  e.preventDefault();
  clearFieldErrors('transaction-id-error');
  setFormError('bankak-form-error', '');

  const txId = document.getElementById('transaction-id').value.trim();
  if (!txId) {
    setFieldError('transaction-id-error', 'Transaction ID is required');
    return;
  }

  setLoading(true);
  try {
    await apiCall('/api/payment', 'POST', {
      transaction_id: txId,
      amount: PRICES[state.examType],
    }, true);
    showSuccess('bankak');
  } catch (err) {
    setFormError('bankak-form-error', err.message);
  } finally {
    setLoading(false);
  }
}

// ── STRIPE ELEMENTS (inline card payment) ─────────────────────────────────────
function initStripeElements() {
  if (stripeInstance) return;

  stripeInstance = Stripe(STRIPE_PUBLISHABLE_KEY);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const elements = stripeInstance.elements({
    fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&display=swap' }],
  });

  cardElement = elements.create('card', {
    style: {
      base: {
        fontFamily: '"Cairo", sans-serif',
        fontSize: '15px',
        color:   isDark ? '#f9fafb' : '#1c1c1e',
        '::placeholder': { color: isDark ? '#6b7280' : '#9ca3af' },
        iconColor: '#d48b1f',
      },
      invalid: { color: '#dc2626', iconColor: '#dc2626' },
    },
  });
  cardElement.mount('#card-element');

  const wrap = document.getElementById('card-element-wrap');
  cardElement.on('focus', () => wrap && wrap.classList.add('focused'));
  cardElement.on('blur',  () => wrap && wrap.classList.remove('focused'));
  cardElement.on('change', evt => {
    const errEl = document.getElementById('card-errors');
    if (errEl) errEl.textContent = evt.error ? evt.error.message : '';
  });
}

async function handleStripePayment() {
  setFormError('stripe-form-error', '');

  if (!stripeInstance || !cardElement) {
    setFormError('stripe-form-error', 'Card form not ready. Please wait a moment.');
    return;
  }

  const btn = document.getElementById('stripe-pay-btn');
  btn.disabled = true;
  setLoading(true);

  try {
    const data = await apiCall('/api/stripe-session', 'POST', {
      amount:    PRICES[state.examType],
      exam_type: state.examType,
    }, true);

    const { error, paymentIntent } = await stripeInstance.confirmCardPayment(
      data.client_secret,
      { payment_method: { card: cardElement } }
    );

    if (error) {
      setFormError('stripe-form-error', error.message);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      showSuccess('stripe');
    }
  } catch (err) {
    setFormError('stripe-form-error', err.message);
  } finally {
    btn.disabled = false;
    setLoading(false);
  }
}

// ── SUCCESS ───────────────────────────────────────────────────────────────────
function showSuccess(method) {
  showScreen('success');

  const iconEl = document.getElementById('success-icon');

  if (method === 'bankak') {
    iconEl.innerHTML = ICONS.clock;
    document.getElementById('success-title').textContent  = 'Payment Submitted';
    document.getElementById('success-message').textContent =
      'Your Bankak transaction has been received and is pending verification. ' +
      'You will be contacted once confirmed.';
  } else {
    iconEl.innerHTML = ICONS.checkCircle;
    document.getElementById('success-title').textContent  = 'Payment Complete';
    document.getElementById('success-message').textContent =
      'Your card payment was successful. Your certificate will be issued shortly.';
  }

  // Level badge
  const finalLevel = state.determinedLevel || state.level;
  const levelLabels = { A: 'A1/A2', B: 'B1/B2', C: 'C1/C2' };
  const badgeEl = document.getElementById('success-level-badge');
  if (finalLevel) {
    badgeEl.innerHTML =
      `<div class="result-level-wrap" style="margin: .75rem auto;">
        ${ICONS.graduationCap} Level: <strong>${levelLabels[finalLevel] || finalLevel}</strong>
      </div>`;
  } else {
    badgeEl.innerHTML = '';
  }

  // Video lesson
  const videoKey    = finalLevel || 'certificate';
  const videoUrl    = LESSON_VIDEOS[videoKey];
  const videoEl     = document.getElementById('lesson-video');
  const videoSection = document.getElementById('video-section');

  if (videoUrl && !videoUrl.includes('REPLACE_WITH')) {
    videoEl.src     = videoUrl;
    videoSection.classList.remove('hidden');
  } else {
    videoSection.classList.add('hidden');
  }
}

function goHome() {
  state.examType        = null;
  state.level           = null;
  state.determinedLevel = null;
  state.questions       = [];
  state.currentQ        = 0;
  state.answers         = [];
  state.score           = 0;

  document.getElementById('lesson-video').src = '';
  showScreen('menu');
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function openProfile() {
  // Remember which screen to return to
  const screens = ['menu','level-select','result','info-form','payment','success'];
  for (const s of screens) {
    const el = document.getElementById(`screen-${s}`);
    if (el && el.classList.contains('active')) {
      state.profilePrevScreen = s;
      break;
    }
  }
  showScreen('profile');
  loadProfile();
}

function closeProfile() {
  showScreen(state.profilePrevScreen || 'menu');
}

async function loadProfile() {
  const loadingEl  = document.getElementById('profile-loading');
  const dataEl     = document.getElementById('profile-data');
  const errorEl    = document.getElementById('profile-fetch-error');

  loadingEl.classList.remove('hidden');
  dataEl.classList.add('hidden');
  errorEl.textContent = '';

  try {
    const data = await apiCall('/api/profile', 'GET', null, true);
    const u = data.user;

    document.getElementById('profile-student-id').textContent  = u.student_id || '—';
    document.getElementById('profile-name').textContent        = u.name      || '—';
    document.getElementById('profile-age').textContent         = u.age       || '—';
    document.getElementById('profile-education').textContent   = u.education || '—';
    document.getElementById('profile-phone').textContent       = u.phone     || '—';
    document.getElementById('profile-created-at').textContent  =
      u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';

    loadingEl.classList.add('hidden');
    dataEl.classList.remove('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = err.message;
  }
}

async function saveProfilePhone() {
  const phone   = document.getElementById('profile-phone-input').value.trim();
  const errorEl = document.getElementById('profile-phone-error');
  errorEl.textContent = '';

  if (!phone || phone.length < 7) {
    errorEl.textContent = 'Please enter a valid phone number';
    return;
  }

  setLoading(true);
  try {
    const data = await apiCall('/api/profile', 'PATCH', { phone }, true);
    document.getElementById('profile-phone').textContent = data.user.phone;
    document.getElementById('profile-phone-form').classList.add('hidden');
    showToast('Phone number updated', 'success');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    setLoading(false);
  }
}

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
function openAdmin() {
  document.getElementById('admin-overlay').classList.remove('hidden');
  document.getElementById('admin-login-section').classList.remove('hidden');
  document.getElementById('admin-data-section').classList.add('hidden');
  document.getElementById('admin-password').value = '';
  setFieldError('admin-pw-error', '');

  document.getElementById('admin-login-form').addEventListener('submit', handleAdminLogin, { once: true });
}

function closeAdmin() {
  document.getElementById('admin-overlay').classList.add('hidden');
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('admin-password').value;
  if (!pw) { setFieldError('admin-pw-error', 'Password is required'); return; }

  setLoading(true);
  try {
    const data = await fetch(API_BASE + '/api/users', {
      headers: { Authorization: `Bearer ${pw}` },
    }).then(async res => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invalid password');
      return json;
    });

    document.getElementById('admin-login-section').classList.add('hidden');
    document.getElementById('admin-data-section').classList.remove('hidden');
    renderAdminPanel(data);
  } catch (err) {
    setFieldError('admin-pw-error', err.message);
    document.getElementById('admin-login-form')
      .addEventListener('submit', handleAdminLogin, { once: true });
  } finally {
    setLoading(false);
  }
}

function renderAdminPanel({ stats, users }) {
  const statsEl = document.getElementById('admin-stats');
  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Users</div>
      <div class="stat-value">${stats.total_users || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Exams</div>
      <div class="stat-value">${stats.total_exams || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Paid</div>
      <div class="stat-value">${stats.completed_payments || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending</div>
      <div class="stat-value">${stats.pending_payments || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Revenue</div>
      <div class="stat-value">${Number(stats.total_revenue || 0).toLocaleString()} SDG</div>
    </div>`;

  const tbody = document.getElementById('admin-table-body');
  tbody.innerHTML = '';

  users.forEach(u => {
    const latestExam    = u.exams    && u.exams[0];
    const latestPayment = u.payments && u.payments[0];
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${u.student_id}</td>
      <td>${u.name || '—'}</td>
      <td>${u.phone || '—'}</td>
      <td>${latestExam ? `${latestExam.exam_type}${latestExam.level ? ' / ' + latestExam.level : ''}` : '—'}</td>
      <td>${latestExam && latestExam.score != null ? `${latestExam.score} / ${latestExam.total}` : '—'}</td>
      <td>${latestPayment
        ? `<span class="status-pill status-${latestPayment.status}">${latestPayment.status}</span>`
        : '—'}</td>
      <td>${new Date(u.registered_at).toLocaleDateString()}</td>`;
    tbody.appendChild(row);
  });

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No students registered yet.</td></tr>';
  }
}
