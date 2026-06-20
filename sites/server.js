const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});
app.use(express.static(path.join(__dirname)));

const events = [
  {
    title: 'Startup Networking Night',
    description: 'Meet founders, investors, and mentors in an evening of collaboration, new ideas, and fast-paced connections.',
    date: 'June 28 • 6:00 PM',
    location: 'Downtown Loft',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80'
  },
  {
    title: 'Design Thinking Workshop',
    description: 'Hands-on workshop to refine your product strategy with practical exercises and expert guidance.',
    date: 'July 3 • 10:00 AM',
    location: 'Studio 14',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'
  },
  {
    title: 'Creative Summit 2026',
    description: 'Join industry leaders for inspiring talks, practical sessions, and networking with creative professionals.',
    date: 'July 16 • 9:00 AM',
    location: 'Conference Center',
    image: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=900&q=80'
  }
];

const calendar = [
  {
    title: 'Launch Party: Starship Innovation',
    time: 'July 1 • 7:00 PM',
    location: 'Orbit Hall'
  },
  {
    title: 'Cosmic Networking Session',
    time: 'July 4 • 5:00 PM',
    location: 'Nebula Lounge'
  },
  {
    title: 'Interstellar Design Workshop',
    time: 'July 10 • 11:00 AM',
    location: 'Command Deck'
  }
];

const captchas = new Map();
const verificationCodes = new Map();
const authTokens = new Map();
const rsvps = [];
const users = new Map(); // email -> { passwordHash, role }
// seed an admin user for convenience (password: adminpass)
const adminEmail = 'admin@example.com';
users.set(adminEmail, { passwordHash: crypto.createHash('sha256').update('adminpass').digest('hex'), role: 'admin' });

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function createCaptcha() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  return {
    question: `What is ${a} + ${b}?`,
    answer: String(a + b)
  };
}

app.get('/api/events', (req, res) => {
  res.json({ events });
});

app.get('/api/captcha', (req, res) => {
  try {
    const captchaId = generateId();
    const captcha = createCaptcha();
    if (!captchaId || !captcha || !captcha.question || !captcha.answer) {
      return res.status(500).json({ error: 'Failed to generate captcha' });
    }
    captchas.set(captchaId, captcha.answer);
    console.log(`[CAPTCHA] Generated ${captchaId}: ${captcha.question}`);
    res.json({ captchaId, question: captcha.question });
  } catch (err) {
    console.error('[CAPTCHA ERROR]', err);
    res.status(500).json({ error: 'Failed to generate captcha', details: err.message });
  }
});

app.post('/api/send-code', (req, res) => {
  const { email, password, captchaId, captchaAnswer } = req.body;

  console.log('[SEND-CODE] Request:', { email, password: '***', captchaId, captchaAnswer });

  if (!email || !password || !captchaId || !captchaAnswer) {
    console.log('[SEND-CODE] Missing fields');
    return res.status(400).json({ error: 'Email, password and captcha are required.' });
  }

  const expectedAnswer = captchas.get(captchaId);
  console.log('[SEND-CODE] Captcha check:', { expectedAnswer, provided: captchaAnswer });
  
  if (!expectedAnswer || String(captchaAnswer).trim() !== expectedAnswer) {
    console.log('[SEND-CODE] Captcha validation failed');
    return res.status(400).json({ error: 'Captcha validation failed.' });
  }

  captchas.delete(captchaId);
  
  // signing in: user must exist and password match
  const user = users.get(email);
  console.log('[SEND-CODE] User lookup:', { email, found: !!user });
  
  if (!user) {
    console.log('[SEND-CODE] User not found');
    return res.status(400).json({ error: 'No account found for this email. Please sign up.' });
  }
  
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  console.log('[SEND-CODE] Password check:', { storedHash: user.passwordHash, providedHash: hash, match: user.passwordHash === hash });
  
  if (user.passwordHash !== hash) {
    console.log('[SEND-CODE] Password mismatch');
    return res.status(400).json({ error: 'Incorrect password.' });
  }

  const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  verificationCodes.set(email, verificationCode);
  console.log('[SEND-CODE] Success - code generated:', verificationCode);

  res.json({
    message: 'Verification code sent to your email.',
    debugCode: verificationCode
  });
});

app.post('/api/signup', (req, res) => {
  const { email, password, captchaId, captchaAnswer, role } = req.body;
  
  console.log('[SIGNUP] Request:', { email, password: '***', captchaId, captchaAnswer, role });
  
  if (!email || !password || !captchaId || !captchaAnswer) {
    console.log('[SIGNUP] Missing fields');
    return res.status(400).json({ error: 'Email, password and captcha are required.' });
  }

  const expectedAnswer = captchas.get(captchaId);
  console.log('[SIGNUP] Captcha check:', { expectedAnswer, provided: captchaAnswer });
  
  if (!expectedAnswer || String(captchaAnswer).trim() !== expectedAnswer) {
    console.log('[SIGNUP] Captcha validation failed');
    return res.status(400).json({ error: 'Captcha validation failed.' });
  }

  captchas.delete(captchaId);
  
  if (users.has(email)) {
    console.log('[SIGNUP] Account already exists');
    return res.status(400).json({ error: 'Account already exists. Please sign in.' });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const assignedRole = (role === 'teacher' || role === 'student') ? role : 'student';
  users.set(email, { passwordHash, role: assignedRole });
  console.log('[SIGNUP] User created:', { email, role: assignedRole });

  const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  verificationCodes.set(email, verificationCode);
  console.log('[SIGNUP] Success - code generated:', verificationCode);
  
  res.json({ message: 'Account created. Verification code sent to your email.', debugCode: verificationCode });
});

app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;
  
  console.log('[VERIFY-CODE] Request:', { email, code });
  
  const expectedCode = verificationCodes.get(email);
  console.log('[VERIFY-CODE] Code check:', { expectedCode, provided: code, match: String(code).trim() === expectedCode });

  if (!expectedCode || String(code).trim() !== expectedCode) {
    console.log('[VERIFY-CODE] Code validation failed');
    return res.status(400).json({ error: 'Verification code is invalid.' });
  }

  verificationCodes.delete(email);
  const token = generateId();
  const user = users.get(email) || { role: 'student' };
  authTokens.set(token, { email, role: user.role, createdAt: Date.now() });
  console.log('[VERIFY-CODE] Success - token created:', { email, role: user.role });

  res.json({ token, email, role: user.role });
});

app.get('/api/calendar', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');

  if (!authTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({ calendar });
});

// create a new event (teachers and admins only)
app.post('/api/events', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!authTokens.has(token)) return res.status(401).json({ error: 'Unauthorized' });
  const user = authTokens.get(token);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return res.status(403).json({ error: 'Forbidden' });

  const { title, description, date, location, image } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required.' });

  const newEvent = { id: generateId(), title, description, date: date || '', location: location || '', image: image || '' };
  events.push(newEvent);
  res.json({ message: 'Event created', event: newEvent });
});

// get event details
app.get('/api/events/:id', (req, res) => {
  const id = req.params.id;
  const ev = events.find(e => e.id === id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  res.json({ event: ev });
});

app.post('/api/rsvp', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  rsvps.push({ name, email, createdAt: new Date().toISOString() });
  res.json({ message: `Thanks, ${name}! Your RSVP has been saved.` });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'mocksite.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', captchasActive: captchas.size });
});

app.listen(PORT, () => {
  console.log(`✓ Event Galaxy backend running at http://localhost:${PORT}`);
  console.log(`✓ Frontend: http://localhost:${PORT}`);
  console.log(`✓ Captcha endpoint: http://localhost:${PORT}/api/captcha`);
});
