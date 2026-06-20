const rsvpForm = document.querySelector('.rsvp-panel form');
const eventsGrid = document.getElementById('events');
const signInButton = document.getElementById('signInButton');
const signInModal = document.getElementById('signInModal');
const modalClose = document.getElementById('modalClose');
const signInForm = document.getElementById('signInForm');
const userMenu = document.getElementById('userMenu');
const userDropdown = document.getElementById('userDropdown');
const signOutButton = document.getElementById('signOutButton');
const calendarAccessBtn = document.getElementById('calendarAccessBtn');
const calendarPanel = document.getElementById('calendar');
const captchaQuestion = document.getElementById('captchaQuestion');
const captchaInput = document.getElementById('captchaInput');
const verificationStep = document.getElementById('verificationStep');
const verificationMessage = document.getElementById('verificationMessage');
const verificationCodeInput = document.getElementById('verificationCodeInput');
const verifyCodeButton = document.getElementById('verifyCodeButton');

const state = {
  token: localStorage.getItem('eventGalaxyToken') || null,
  email: localStorage.getItem('eventGalaxyEmail') || null,
  captchaId: null
};

let currentAuthMode = 'signin';

const toastContainer = document.getElementById('toastContainer');
const signUpButton = document.getElementById('signUpButton');
const showSignInTab = document.getElementById('showSignInTab');
const showSignUpTab = document.getElementById('showSignUpTab');
const authModalTitle = document.getElementById('authModalTitle');
const authModalText = document.getElementById('authModalText');
const roleRow = document.getElementById('roleRow');
const roleSelect = document.getElementById('roleSelect');
const createEventBtn = document.getElementById('createEventBtn');
const createEventModal = document.getElementById('createEventModal');
const createClose = document.getElementById('createClose');
const createEventForm = document.getElementById('createEventForm');
const eventDetailModal = document.getElementById('eventDetailModal');
const detailClose = document.getElementById('detailClose');
const detailTitle = document.getElementById('detailTitle');
const detailDescription = document.getElementById('detailDescription');
const detailMeta = document.getElementById('detailMeta');
const refreshCaptchaBtn = document.getElementById('refreshCaptchaBtn');

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Request failed');
  }
  return json;
}

function updateUserMenu(email) {
  if (email) {
    signInButton.textContent = email;
    userMenu.classList.add('active');
    userDropdown.style.display = 'block';
    calendarAccessBtn.disabled = false;
    calendarAccessBtn.textContent = 'Access Calendar';
    calendarPanel.setAttribute('aria-hidden', 'false');
    updateCreateEventButton();
  } else {
    signInButton.textContent = 'Sign In';
    userMenu.classList.remove('active');
    userDropdown.style.display = 'none';
    calendarPanel.classList.remove('active');
    calendarAccessBtn.disabled = false;
    calendarAccessBtn.textContent = 'Access Calendar';
    calendarPanel.setAttribute('aria-hidden', 'true');
    createEventBtn.style.display = 'none';
  }
}

function updateCreateEventButton() {
  if (state.role === 'teacher' || state.role === 'admin') {
    createEventBtn.style.display = 'inline-block';
  } else {
    createEventBtn.style.display = 'none';
  }
}

function openModal() {
  signInModal.classList.add('active');
  // load fresh captcha when modal opens
  if (!state.captchaId) {
    loadCaptcha();
  }
}

function closeModal() {
  signInModal.classList.remove('active');
  signInForm.reset();
  captchaInput.value = '';
  verificationStep.classList.remove('active');
  verificationCodeInput.value = '';
  loadCaptcha();
}

function setAuth(token, email, role) {
  state.token = token;
  state.email = email;
  state.role = role || 'student';
  localStorage.setItem('eventGalaxyToken', token);
  localStorage.setItem('eventGalaxyEmail', email);
  localStorage.setItem('eventGalaxyRole', state.role);
  updateUserMenu(email);
}

function clearAuth() {
  state.token = null;
  state.email = null;
  localStorage.removeItem('eventGalaxyToken');
  localStorage.removeItem('eventGalaxyEmail');
  updateUserMenu(null);
}

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function loadCaptcha(retries = 0) {
  try {
    if (refreshCaptchaBtn) refreshCaptchaBtn.style.opacity = '0.5';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('/api/captcha', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data || !data.captchaId || !data.question) {
      throw new Error('Invalid captcha response from server');
    }
    
    state.captchaId = data.captchaId;
    captchaQuestion.textContent = data.question;
    captchaInput.value = '';
    captchaInput.style.display = 'block';
    captchaInput.placeholder = 'Your answer';
    
    if (refreshCaptchaBtn) refreshCaptchaBtn.style.opacity = '1';
    console.log('[CAPTCHA] Loaded:', state.captchaId);
  } catch (err) {
    console.error('[CAPTCHA LOAD ERROR]', err.message);
    state.captchaId = null;
    
    if (retries < 2) {
      captchaQuestion.textContent = `Loading... (attempt ${retries + 2}/3)`;
      captchaInput.placeholder = 'Loading...';
      await new Promise(r => setTimeout(r, 1000));
      return loadCaptcha(retries + 1);
    }
    
    captchaQuestion.textContent = 'Captcha unavailable. Click ↻ to retry.';
    captchaInput.placeholder = 'Click refresh ↻ button';
    
    if (refreshCaptchaBtn) refreshCaptchaBtn.style.opacity = '1';
  }
    
    if (refreshCaptchaBtn) refreshCaptchaBtn.style.opacity = '1';
  }
}

function renderEvents(events) {
  eventsGrid.innerHTML = events
    .map(event => `
      <article class="event-card">
        <img src="${event.image}" alt="${event.title}">
        <div class="event-content">
          <h2>${event.title}</h2>
          <p>${event.description}</p>
          <div class="event-meta">
            <span>${event.date}</span>
            <span>${event.location}</span>
          </div>
        </div>
      </article>
    `)
    .join('');
}

async function loadEvents() {
  try {
    const data = await fetchJson('/api/events');
    renderEvents(data.events);
  } catch (err) {
    console.error('Failed to load events:', err);
  }
}

async function loadCalendar() {
  try {
    const data = await fetchJson('/api/calendar', {
      headers: { 'Content-Type': 'application/json', ...authHeaders() }
    });

    const calendarList = calendarPanel.querySelector('.calendar-list');
    calendarList.innerHTML = data.calendar
      .map(item => `
        <li class="calendar-item">
          <strong>${item.title}</strong>
          <span>${item.time} — ${item.location}</span>
        </li>
      `)
      .join('');
    calendarPanel.classList.add('active');
    calendarPanel.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('[CALENDAR] Load failed:', err);
    // Don't block UI - just show message
    showToast('Calendar access requires login', 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5200);
}

function setAuthMode(mode) {
  currentAuthMode = mode;
  showSignInTab.classList.toggle('active', mode === 'signin');
  showSignUpTab.classList.toggle('active', mode === 'signup');
  authModalTitle.textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
  authModalText.textContent = mode === 'signin'
    ? 'Enter your email and password to access RSVP and calendar features.'
    : 'Create a new account. Choose your role (teachers can create events).';
  signInForm.querySelector('button').textContent = mode === 'signin' ? 'Send verification code' : 'Create account';
  // show role selector only for signup
  if (roleRow) roleRow.style.display = mode === 'signup' ? 'block' : 'none';
}

rsvpForm.addEventListener('submit', async event => {
  event.preventDefault();

  const name = rsvpForm.querySelector('input[type="text"]').value.trim();
  const email = rsvpForm.querySelector('input[type="email"]').value.trim();

  try {
    const data = await fetchJson('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });

    const message = document.createElement('p');
    message.className = 'rsvp-message';
    message.textContent = data.message;

    const existing = rsvpForm.querySelector('.rsvp-message');
    if (!existing) {
      rsvpForm.appendChild(message);
    } else {
      existing.textContent = data.message;
    }

    rsvpForm.reset();
  } catch (err) {
    alert(err.message);
  }
});

signInButton.addEventListener('click', () => {
  if (state.email) {
    userMenu.classList.toggle('active');
  } else {
    openModal();
  }
});

signUpButton.addEventListener('click', () => {
  openModal();
  setAuthMode('signup');
});

showSignInTab.addEventListener('click', () => setAuthMode('signin'));
showSignUpTab.addEventListener('click', () => setAuthMode('signup'));

modalClose.addEventListener('click', closeModal);
signInModal.addEventListener('click', event => {
  if (event.target === signInModal) {
    closeModal();
  }
});

calendarAccessBtn.addEventListener('click', async () => {
  if (state.token) {
    await loadCalendar();
  } else {
    openModal();
  }
});

signInForm.addEventListener('submit', async event => {
  event.preventDefault();

  const email = document.getElementById('signinEmail').value.trim();
  const password = document.getElementById('signinPassword').value.trim();
  const captchaAnswer = captchaInput.value.trim();

  console.log('[FORM] Submitting', { 
    mode: currentAuthMode, 
    email, 
    password: '***', 
    captchaAnswer, 
    captchaId: state.captchaId 
  });

  if (!email || !password) {
    showToast('Enter email and password.', 'error');
    return;
  }
  if (!captchaAnswer) {
    showToast('Please answer the captcha question.', 'error');
    return;
  }
  if (!state.captchaId) {
    showToast('Captcha failed to load. Click the ↻ button to refresh.', 'error');
    return;
  }

  try {
    const body = { email, password, captchaId: state.captchaId, captchaAnswer };
    if (currentAuthMode === 'signup' && roleSelect) body.role = roleSelect.value;
    
    const endpoint = currentAuthMode === 'signin' ? '/api/send-code' : '/api/signup';
    console.log('[API] Calling', endpoint, body);
    
    const data = await fetchJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('[API] Success:', data);
    
    verificationStep.classList.add('active');
    verificationMessage.textContent = `${data.message} Enter the code to proceed.`;
    if (data.debugCode) {
      verificationMessage.textContent += ` (Demo code: ${data.debugCode})`;
    }
    showToast('Verification code sent! Check console or use demo code.', 'success');
  } catch (err) {
    console.error('[API ERROR]', err);
    showToast(err.message || 'Failed to send verification code', 'error');
    await loadCaptcha();
  }
});

verifyCodeButton.addEventListener('click', async () => {
  const code = verificationCodeInput.value.trim();
  const email = document.getElementById('signinEmail').value.trim();

  console.log('[VERIFY] Submitting', { email, code });

  if (!email || !code) {
    showToast('Enter your email and verification code.', 'error');
    return;
  }

  try {
    const data = await fetchJson('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    console.log('[VERIFY] Success:', data);
    setAuth(data.token, data.email, data.role);
    showToast('Logged in successfully!', 'success');
    closeModal();
    await loadCalendar();
  } catch (err) {
    console.error('[VERIFY ERROR]', err);
    showToast(err.message || 'Verification failed', 'error');
  }
});

signOutButton.addEventListener('click', () => {
  clearAuth();
  showToast('You have been signed out.', 'info');
});

// Keyboard handler - ESC closes modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (signInModal.classList.contains('active')) closeModal();
    if (eventDetailModal.classList.contains('active')) eventDetailModal.classList.remove('active');
    if (createEventModal.classList.contains('active')) createEventModal.classList.remove('active');
  }
});

// create event modal handlers
if (createEventBtn) {
  createEventBtn.addEventListener('click', () => createEventModal.classList.add('active'));
}
if (createClose) createClose.addEventListener('click', () => createEventModal.classList.remove('active'));
if (createEventModal) createEventModal.addEventListener('click', e => { if (e.target === createEventModal) createEventModal.classList.remove('active'); });

createEventForm && createEventForm.addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('eventTitle').value.trim();
  const description = document.getElementById('eventDescription').value.trim();
  const date = document.getElementById('eventDate').value.trim();
  const location = document.getElementById('eventLocation').value.trim();
  const image = document.getElementById('eventImage').value.trim();
  if (!title || !description) return alert('Title and description required');
  try {
    const data = await fetchJson('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ title, description, date, location, image })
    });
    showToast('Event created', 'success');
    createEventModal.classList.remove('active');
    await loadEvents();
  } catch (err) {
    alert(err.message);
  }
});

// event detail modal
if (detailClose) detailClose.addEventListener('click', () => eventDetailModal.classList.remove('active'));
if (eventDetailModal) eventDetailModal.addEventListener('click', e => { if (e.target === eventDetailModal) eventDetailModal.classList.remove('active'); });
if (eventsGrid) eventsGrid.addEventListener('click', e => {
  const card = e.target.closest('.event-card');
  if (!card) return;
  const title = card.querySelector('h2')?.textContent || 'Event';
  const desc = card.querySelector('.event-content p')?.textContent || '';
  const meta = card.querySelector('.event-meta')?.textContent || '';
  detailTitle.textContent = title;
  detailDescription.textContent = desc;
  detailMeta.textContent = meta;
  eventDetailModal.classList.add('active');
});

// refresh captcha button
if (refreshCaptchaBtn) {
  refreshCaptchaBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    refreshCaptchaBtn.style.opacity = '0.6';
    await loadCaptcha();
    refreshCaptchaBtn.style.opacity = '1';
  });
}

// small galaxy sparkle on scroll
const sparkle = document.createElement('div');
sparkle.className = 'star-sparkle';
document.body.appendChild(sparkle);
let sparkleTimeout = null;
window.addEventListener('scroll', () => {
  sparkle.classList.add('show');
  clearTimeout(sparkleTimeout);
  sparkleTimeout = setTimeout(() => sparkle.classList.remove('show'), 400);
});

window.addEventListener('DOMContentLoaded', async () => {
  console.log('[INIT] Page loading');
  
  // Make sure modal is closed at start
  signInModal.classList.remove('active');
  eventDetailModal.classList.remove('active');
  createEventModal.classList.remove('active');
  
  if (state.email) {
    // restore role from storage if available
    state.role = localStorage.getItem('eventGalaxyRole') || 'student';
    updateUserMenu(state.email);
  }
  
  await Promise.all([loadCaptcha(), loadEvents()]);
  
  if (state.token) {
    try {
      await loadCalendar();
    } catch (err) {
      console.error('[INIT] Calendar load failed:', err);
    }
  }
  
  console.log('[INIT] Ready');
});
