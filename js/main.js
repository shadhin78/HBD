/**
 * main.js — Core logic for the Birthday Wishing PWA
 * Real-time sync via Firestore onSnapshot listeners
 * Interactive canvas celebrations, synth audio, candle interactions, and guestbook
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, collection, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQclePrRzsnvsZSPF9s3c2pqXzy8gJpNo",
  authDomain: "project-error-78.firebaseapp.com",
  projectId: "project-error-78",
  storageBucket: "project-error-78.firebasestorage.app",
  messagingSenderId: "757218203491",
  appId: "1:757218203491:web:554affe06c958656b7a556"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ═══════════════════════════════════════════════════════════════════
// Global State
// ═══════════════════════════════════════════════════════════════════
let userName = "Star";
let userAge = "21";
let userMsg = "Wishing you a day filled with laughter, love, cake, and endless magic. Happy Birthday!";
let activeTheme = "pastel";
let micEnabled = false;
let micStream = null;
let analyser = null;
let candleStates = { 1: true, 2: true, 3: true };

// ═══════════════════════════════════════════════════════════════════
// Canvas — Confetti, Balloons, Smoke
// ═══════════════════════════════════════════════════════════════════
const canvas = document.getElementById('celebration-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let balloons = [];
let smokeParticles = [];

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * (canvas ? canvas.width : 800);
    this.y = Math.random() * -(canvas ? canvas.height : 600);
    this.size = Math.random() * 8 + 4;
    this.color = `hsl(${Math.random() * 360}, 85%, 65%)`;
    this.speedY = Math.random() * 2.5 + 1.5;
    this.speedX = Math.random() * 1.5 - 0.75;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 2 - 1;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.rotation += this.rotationSpeed;
    if (canvas && this.y > canvas.height) {
      this.y = -20;
      this.x = Math.random() * canvas.width;
    }
  }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class Balloon {
  constructor() { this.reset(); this.y = (canvas ? canvas.height : 800) + Math.random() * 200; }
  reset() {
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 800;
    this.x = Math.random() * (w - 80) + 40;
    this.y = h + 100;
    this.radius = Math.random() * 20 + 20;
    this.speedY = Math.random() * 1.2 + 0.6;
    this.color = `hsl(${Math.random() * 360}, 75%, 60%)`;
    this.drift = Math.random() * 0.4 - 0.2;
    this.popped = false;
    this.popParticles = [];
  }
  update() {
    if (this.popped) {
      this.popParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 0.04; });
      this.popParticles = this.popParticles.filter(p => p.alpha > 0);
      if (this.popParticles.length === 0) this.reset();
      return;
    }
    this.y -= this.speedY;
    this.x += Math.sin(this.y / 30) * this.drift;
    const w = canvas ? canvas.width : 800;
    if (this.x - this.radius < 0) this.x = this.radius;
    if (this.x + this.radius > w) this.x = w - this.radius;
    if (this.y < -this.radius * 2) this.reset();
  }
  draw() {
    if (!ctx) return;
    if (this.popped) {
      this.popParticles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
        ctx.fill();
      });
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.8, this.radius, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.x - this.radius * 0.3, this.y - this.radius * 0.4, this.radius * 0.2, this.radius * 0.3, Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.radius);
    ctx.lineTo(this.x - 4, this.y + this.radius + 6);
    ctx.lineTo(this.x + 4, this.y + this.radius + 6);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.radius + 6);
    ctx.bezierCurveTo(this.x - 8, this.y + this.radius + 20, this.x + 8, this.y + this.radius + 35, this.x, this.y + this.radius + 50);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
  checkPop(mx, my) {
    if (this.popped) return false;
    const dist = Math.hypot(this.x - mx, this.y - my);
    if (dist < this.radius) {
      this.popped = true;
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1.5;
        this.popParticles.push({
          x: this.x, y: this.y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 1.5, alpha: 1.0,
          r: 200 + Math.random() * 55, g: 100 + Math.random() * 100, b: 150 + Math.random() * 100
        });
      }
      return true;
    }
    return false;
  }
}

class SmokeParticle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.size = Math.random() * 2.5 + 1.5;
    this.vx = Math.random() * 0.6 - 0.3;
    this.vy = -(Math.random() * 1.0 + 0.4);
    this.alpha = 1.0;
  }
  update() { this.x += this.vx; this.y += this.vy; this.alpha -= 0.012; }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180, 180, 180, 0.35)";
    ctx.fill();
    ctx.restore();
  }
}

function initCelebration() {
  particles = []; balloons = []; smokeParticles = [];
  for (let i = 0; i < 65; i++) particles.push(new ConfettiParticle());
  for (let i = 0; i < 7; i++) balloons.push(new Balloon());
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initCelebration();

function animate() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  balloons.forEach(b => { b.update(); b.draw(); });
  smokeParticles = smokeParticles.filter(sm => sm.alpha > 0);
  smokeParticles.forEach(sm => { sm.update(); sm.draw(); });
  requestAnimationFrame(animate);
}
animate();

// ═══════════════════════════════════════════════════════════════════
// Toast Notifications
// ═══════════════════════════════════════════════════════════════════
function showToast(message, colorClass = 'pink') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.style.cssText = `padding: 14px 18px; border-radius: 14px; color: #fff; backdrop-filter: blur(12px); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); transform: translateY(10px); opacity: 0; transition: all 0.4s ease;`;

  const bgColors = { pink: 'rgba(236,72,153,0.85)', purple: 'rgba(124,58,237,0.85)', amber: 'rgba(217,119,6,0.85)', green: 'rgba(16,185,129,0.85)' };
  toast.style.backgroundColor = bgColors[colorClass] || bgColors.pink;
  toast.innerHTML = `<span>✨</span> <b>${message}</b>`;
  container.appendChild(toast);

  setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 50);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'scale(0.9)'; setTimeout(() => toast.remove(), 400); }, 3500);
}

// ═══════════════════════════════════════════════════════════════════
// Balloon Pop Handler
// ═══════════════════════════════════════════════════════════════════
if (canvas) {
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    balloons.forEach(b => {
      if (b.checkPop(clickX, clickY)) {
        if (window.BirthdayAudio) {
          window.BirthdayAudio.playTone(523.25, 0.15, 'triangle', 0.1);
          setTimeout(() => window.BirthdayAudio.playTone(659.25, 0.1, 'sine', 0.08), 60);
        }
        showToast("🎈 POP! Unleash the celebration!", "pink");
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// Sparkle Trail
// ═══════════════════════════════════════════════════════════════════
window.addEventListener('mousemove', (e) => {
  const particle = document.createElement('div');
  particle.className = 'sparkle-particle';
  const size = Math.random() * 6 + 3;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.left = `${e.clientX - size / 2}px`;
  particle.style.top = `${e.clientY - size / 2 + window.scrollY}px`;
  document.body.appendChild(particle);
  particle.animate([
    { transform: 'scale(1) rotate(0deg)', opacity: 1 },
    { transform: 'scale(0) rotate(180deg)', opacity: 0 }
  ], { duration: 800, easing: 'ease-out' });
  setTimeout(() => particle.remove(), 800);
});

// ═══════════════════════════════════════════════════════════════════
// REAL-TIME FIRESTORE SYNC — Configuration Document
// ═══════════════════════════════════════════════════════════════════
function syncData() {
  const docRef = doc(db, "birthday_wishes", "global");
  
  onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      userName = data.name || "Star";
      userAge = data.age || "21";
      userMsg = data.hbdMessage || "Wishing you a day filled with laughter, love, cake, and endless magic. Happy Birthday!";
      activeTheme = data.gender || "pastel";

      // Update UI texts instantly
      const nameEl = document.getElementById('display-name');
      const ageEl = document.getElementById('display-age');
      const msgEl = document.getElementById('display-message');
      const wishNameEl = document.getElementById('wishes-for-name');

      if (nameEl) nameEl.textContent = userName;
      if (ageEl) ageEl.textContent = userAge;
      if (msgEl) msgEl.textContent = userMsg;
      if (wishNameEl) wishNameEl.textContent = userName;

      // Apply Visual Theme — smooth transition
      document.body.className = "active-theme-container min-h-screen relative overflow-x-hidden pb-12";
      if (activeTheme === 'male' || activeTheme === 'neon') {
        document.body.classList.add('theme-neon');
      } else if (activeTheme === 'gold') {
        document.body.classList.add('theme-gold');
      } else if (activeTheme === 'emerald') {
        document.body.classList.add('theme-emerald');
      } else {
        document.body.classList.add('theme-pastel');
      }

      // Apply Cake configuration
      const flavor = data.cakeFlavor || "strawberry";
      setCakeFrostingStyle(flavor);

      const sprinklesEl = document.getElementById('cake-sprinkles');
      if (sprinklesEl) sprinklesEl.style.display = (data.sprinkles !== false) ? 'flex' : 'none';

      const berryEls = document.querySelectorAll('.topping-berry');
      berryEls.forEach(el => { el.style.display = (data.berries !== false) ? 'flex' : 'none'; });
    }
  }, (error) => {
    console.error('Config sync listener error:', error);
  });

  // ── Guestbook Wishes — Real-time listener ───────────────────
  const wishesQuery = query(collection(db, "guestbook_wishes"), orderBy("timestamp", "asc"));
  onSnapshot(wishesQuery, (snapshot) => {
    const wallGrid = document.getElementById('wishes-wall-grid');
    if (!wallGrid) return;
    wallGrid.innerHTML = '';

    snapshot.forEach(docSnap => {
      const note = docSnap.data();
      const noteCard = document.createElement('div');

      // Determine color class from the stored color string
      let borderColor = 'rgba(113,113,122,0.3)';
      let textColor = 'rgba(255,255,255,0.9)';
      let shadowColor = 'rgba(0,0,0,0.1)';

      if (note.color) {
        if (note.color.includes('amber')) { borderColor = 'rgba(245,158,11,0.3)'; textColor = 'rgba(254,243,199,0.95)'; shadowColor = 'rgba(245,158,11,0.1)'; }
        else if (note.color.includes('pink')) { borderColor = 'rgba(236,72,153,0.3)'; textColor = 'rgba(252,231,243,0.95)'; shadowColor = 'rgba(236,72,153,0.1)'; }
        else if (note.color.includes('cyan')) { borderColor = 'rgba(6,182,212,0.3)'; textColor = 'rgba(207,250,254,0.95)'; shadowColor = 'rgba(6,182,212,0.1)'; }
        else if (note.color.includes('emerald')) { borderColor = 'rgba(16,185,129,0.3)'; textColor = 'rgba(209,250,229,0.95)'; shadowColor = 'rgba(16,185,129,0.1)'; }
        else if (note.color.includes('purple')) { borderColor = 'rgba(168,85,247,0.3)'; textColor = 'rgba(243,232,255,0.95)'; shadowColor = 'rgba(168,85,247,0.1)'; }
      }

      noteCard.style.cssText = `padding: 1.5rem; border-radius: 16px; border: 1px solid ${borderColor}; background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: ${textColor}; box-shadow: 0 4px 20px ${shadowColor}; transition: transform 0.3s ease;`;
      noteCard.onmouseenter = () => noteCard.style.transform = 'scale(1.02)';
      noteCard.onmouseleave = () => noteCard.style.transform = 'scale(1)';

      noteCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; font-family: 'Outfit', sans-serif;">
          <span style="font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em;">📌 ${note.author || 'Anonymous'}</span>
          <span style="font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.5;">Dedication</span>
        </div>
        <p style="font-size: 0.85rem; line-height: 1.6;">${note.text || ''}</p>
      `;
      wallGrid.appendChild(noteCard);
    });
  }, (error) => {
    console.error('Guestbook sync listener error:', error);
  });
}

// ═══════════════════════════════════════════════════════════════════
// Cake Frosting Style Setter
// ═══════════════════════════════════════════════════════════════════
function setCakeFrostingStyle(flavor) {
  const topLayer = document.getElementById('cake-layer-top');
  const toppings = document.getElementById('cake-toppings');
  if (!topLayer || !toppings) return;

  const styles = {
    chocolate: {
      top: 'linear-gradient(to right, #1c1917 0%, #292524 30%, #1c1917 70%, #292524 100%)',
      border: 'rgba(28,25,23,0.4)',
      topping: 'linear-gradient(to right, #292524, #3e3a39)'
    },
    matcha: {
      top: 'linear-gradient(to right, #022c22 0%, #065f46 30%, #022c22 70%, #065f46 100%)',
      border: 'rgba(2,44,34,0.4)',
      topping: 'linear-gradient(to right, #065f46, #0f766e)'
    },
    vanilla: {
      top: 'linear-gradient(to right, #fcfaf2 0%, #f4f1ea 30%, #fcfaf2 70%, #f4f1ea 100%)',
      border: 'rgba(212,163,115,0.3)',
      topping: 'linear-gradient(to right, #f4f1ea, #e9e5db)'
    },
    strawberry: {
      top: 'linear-gradient(to right, #db2777 0%, #e879f9 30%, #db2777 70%, #e879f9 100%)',
      border: 'rgba(219,39,119,0.4)',
      topping: 'linear-gradient(to right, #fce7f3, #fbcfe8)'
    }
  };

  const s = styles[flavor] || styles.strawberry;
  topLayer.style.background = s.top;
  topLayer.style.borderColor = s.border;
  toppings.style.background = s.topping;
}

// ═══════════════════════════════════════════════════════════════════
// Sound Controls
// ═══════════════════════════════════════════════════════════════════
const soundToggle = document.getElementById('sound-toggle-btn');
let synthMuted = true;

if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    synthMuted = !synthMuted;
    const icon = document.getElementById('sound-icon');
    const txt = soundToggle.querySelector('.text');
    if (!synthMuted) {
      if (icon) icon.textContent = '🔊';
      if (txt) txt.textContent = 'Music Playing';
      soundToggle.classList.add('playing');
      if (window.BirthdayAudio) window.BirthdayAudio.toggleMusic(true);
    } else {
      if (icon) icon.textContent = '🔇';
      if (txt) txt.textContent = 'Synth Sound';
      soundToggle.classList.remove('playing');
      if (window.BirthdayAudio) window.BirthdayAudio.toggleMusic(false);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// Piano Synthesis Pad
// ═══════════════════════════════════════════════════════════════════
const pianoKeys = document.querySelectorAll('.piano-key');
const freqMap = { 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25 };
pianoKeys.forEach(btn => {
  btn.addEventListener('click', () => {
    const note = btn.getAttribute('data-note');
    const freq = freqMap[note];
    if (window.BirthdayAudio && freq) {
      window.BirthdayAudio.playTone(freq, 0.6, 'triangle', 0.15);
      const display = document.getElementById('piano-key-display');
      if (display) display.textContent = `🎵 Active Note: ${note} (${freq} Hz)`;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Candle Interactions
// ═══════════════════════════════════════════════════════════════════
function playHappyBirthdayMelody() {
  const hbdNotes = [
    { freq: 261.63, delay: 0 }, { freq: 261.63, delay: 350 }, { freq: 293.66, delay: 700 },
    { freq: 261.63, delay: 1200 }, { freq: 349.23, delay: 1700 }, { freq: 329.63, delay: 2200 }
  ];
  hbdNotes.forEach(item => {
    setTimeout(() => {
      if (window.BirthdayAudio) window.BirthdayAudio.playTone(item.freq, 0.6, 'sine', 0.12);
    }, item.delay);
  });
}

function blowCandle(id) {
  if (!candleStates[id]) return;
  candleStates[id] = false;

  const flame = document.getElementById(`flame-${id}`);
  if (flame) { flame.style.opacity = '0'; flame.style.transform = 'scale(0)'; }

  if (window.BirthdayAudio) window.BirthdayAudio.playBlowOutSound();

  // Smoke puff
  const candleDiv = document.getElementById(`candle-${id}`);
  if (candleDiv) {
    const rect = candleDiv.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      smokeParticles.push(new SmokeParticle(rect.left + rect.width / 2, rect.top));
    }
  }

  const remaining = [1, 2, 3].filter(i => candleStates[i]);
  const statusMsg = document.getElementById('cake-status-msg');
  if (remaining.length > 0) {
    if (statusMsg) statusMsg.textContent = `🕯️ ${remaining.length} candle${remaining.length > 1 ? 's' : ''} waiting to be blown out!`;
  } else {
    if (statusMsg) statusMsg.textContent = `🎉 Hooray! Make your wish! 🥳`;
    showToast("🎉 All candles blown out! Celebration time!", "green");
    playHappyBirthdayMelody();
    for (let i = 0; i < 120; i++) particles.push(new ConfettiParticle());
  }
}

// Attach candle click handlers
[1, 2, 3].forEach(id => {
  const el = document.getElementById(`candle-${id}`);
  if (el) el.addEventListener('click', () => blowCandle(id));
});

// Reset Candles
const resetBtn = document.getElementById('reset-candles-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    candleStates = { 1: true, 2: true, 3: true };
    const statusMsg = document.getElementById('cake-status-msg');
    if (statusMsg) statusMsg.textContent = `🕯️ 3 candles waiting to be blown out!`;
    [1, 2, 3].forEach(id => {
      const flame = document.getElementById(`flame-${id}`);
      if (flame) { flame.style.opacity = '1'; flame.style.transform = 'scale(1)'; }
    });
    showToast("🔥 Candles Relit!", "amber");
  });
}

// ═══════════════════════════════════════════════════════════════════
// Microphone Blow Detection
// ═══════════════════════════════════════════════════════════════════
const micToggle = document.getElementById('mic-toggle-btn');
if (micToggle) {
  micToggle.addEventListener('click', async () => {
    if (micEnabled) { stopMic(); return; }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioCtx();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = actx.createMediaStreamSource(micStream);
      analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      micEnabled = true;
      micToggle.innerHTML = `<span>🎙️</span> Mic Blow: Active`;

      const micLevelContainer = document.getElementById('mic-level-container');
      if (micLevelContainer) micLevelContainer.classList.remove('hidden');
      showToast("🎙️ Mic active! Blow to extinguish candles!", "purple");

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const monitorMic = () => {
        if (!micEnabled) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        const micBar = document.getElementById('mic-level-bar');
        if (micBar) micBar.style.width = `${Math.min(100, average * 3.5)}%`;

        if (average > 40) {
          const active = [1, 2, 3].filter(id => candleStates[id]);
          if (active.length > 0) {
            const rand = active[Math.floor(Math.random() * active.length)];
            blowCandle(rand);
          }
        }
        requestAnimationFrame(monitorMic);
      };
      monitorMic();
    } catch (err) {
      showToast("⚠️ Microphone access denied. Use click mode!", "amber");
      console.error(err);
    }
  });
}

function stopMic() {
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  micEnabled = false;
  if (micToggle) micToggle.innerHTML = `<span>🎙️</span> Mic Blow: Off`;
  const micLevelContainer = document.getElementById('mic-level-container');
  if (micLevelContainer) micLevelContainer.classList.add('hidden');
  showToast("🎙️ Microphone disabled", "amber");
}

// ═══════════════════════════════════════════════════════════════════
// Gift Box Interaction
// ═══════════════════════════════════════════════════════════════════
const giftWrapper = document.getElementById('gift-box-wrapper');
const giftLid = document.getElementById('gift-lid');
const secretCard = document.getElementById('secret-card');

if (giftWrapper && giftLid && secretCard) {
  giftWrapper.addEventListener('click', () => {
    if (giftLid.classList.contains('lid-open')) return;
    giftLid.classList.add('lid-open');
    if (window.BirthdayAudio) window.BirthdayAudio.playMagicChimes();
    for (let i = 0; i < 100; i++) particles.push(new ConfettiParticle());

    setTimeout(() => {
      secretCard.classList.remove('hidden');
      const cardMsg = document.getElementById('card-personalized-msg');
      if (cardMsg) cardMsg.textContent = `"${userMsg}"`;
      setTimeout(() => {
        secretCard.classList.remove('scale-50', 'opacity-0');
        secretCard.classList.add('scale-100', 'opacity-100');
      }, 100);
    }, 1000);
  });

  const closeCardBtn = document.getElementById('close-card-btn');
  if (closeCardBtn) {
    closeCardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      secretCard.classList.add('scale-50', 'opacity-0');
      setTimeout(() => {
        secretCard.classList.add('hidden');
        giftLid.classList.remove('lid-open');
      }, 500);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// Guest Wish Posting Form
// ═══════════════════════════════════════════════════════════════════
const wishForm = document.getElementById('wish-form');
if (wishForm) {
  wishForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const authorEl = document.getElementById('wish-author');
    const textEl = document.getElementById('wish-text');
    const colorEl = document.getElementById('wish-color');

    const author = authorEl ? authorEl.value.trim() : 'Anonymous';
    const text = textEl ? textEl.value.trim() : '';
    const color = colorEl ? colorEl.value : '';

    if (!text) return;

    try {
      await addDoc(collection(db, "guestbook_wishes"), {
        author: author,
        text: text,
        color: color,
        timestamp: new Date()
      });
      showToast("📌 Posted your wish to the wall!", "green");
      wishForm.reset();
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to post wish.", "amber");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// Initialize Real-Time Sync
// ═══════════════════════════════════════════════════════════════════
syncData();
