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

// Global States
let userName = "Star";
let userAge = "21";
let userMsg = "Wishing you a day filled with laughter, love, cake, and endless magic. Happy Birthday!";
let activeTheme = "pastel";
let synthEnabled = true;
let micEnabled = false;

// Audio context reference
let analyser = null;
let micStream = null;

// Cake candles state
let candleStates = { 1: true, 2: true, 3: true };

// Canvas setup
const canvas = document.getElementById('celebration-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let balloons = [];
let smokeParticles = [];

// HBD Melody Note sequence
const hbdNotes = [
  { note: 'C4', delay: 0 },
  { note: 'C4', delay: 350 },
  { note: 'D4', delay: 700 },
  { note: 'C4', delay: 1200 },
  { note: 'F4', delay: 1700 },
  { note: 'E4', delay: 2200 }
];

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * -canvas.height;
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
    if (this.y > canvas.height) {
      this.y = -20;
      this.x = Math.random() * canvas.width;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class Balloon {
  constructor() {
    this.reset();
    this.y = canvas.height + Math.random() * 200;
  }

  reset() {
    this.x = Math.random() * (canvas.width - 80) + 40;
    this.y = canvas.height + 100;
    this.radius = Math.random() * 20 + 20; // slightly smaller, more refined balloons
    this.speedY = Math.random() * 1.2 + 0.6;
    this.color = `hsl(${Math.random() * 360}, 75%, 60%)`;
    this.drift = Math.random() * 0.4 - 0.2;
    this.popped = false;
    this.popParticles = [];
  }

  update() {
    if (this.popped) {
      this.popParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;
      });
      this.popParticles = this.popParticles.filter(p => p.alpha > 0);
      if (this.popParticles.length === 0) {
        this.reset();
      }
      return;
    }

    this.y -= this.speedY;
    this.x += Math.sin(this.y / 30) * this.drift;

    if (this.x - this.radius < 0) this.x = this.radius;
    if (this.x + this.radius > canvas.width) this.x = canvas.width - this.radius;

    if (this.y < -this.radius * 2) {
      this.reset();
    }
  }

  draw() {
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
    ctx.ellipse(this.x - this.radius * 0.3, this.y - this.radius * 0.4, this.radius * 0.2, this.radius * 0.3, Math.PI/6, 0, Math.PI * 2);
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
      this.createPopParticles();
      return true;
    }
    return false;
  }

  createPopParticles() {
    const parser = document.createElement('div');
    parser.style.color = this.color;
    document.body.appendChild(parser);
    const rgb = window.getComputedStyle(parser).color;
    document.body.removeChild(parser);
    const match = rgb.match(/\d+/g);
    const r = match ? match[0] : 255;
    const g = match ? match[1] : 105;
    const b = match ? match[2] : 180;

    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1.5;
      this.popParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        alpha: 1.0,
        r: r,
        g: g,
        b: b
      });
    }
  }
}

class SmokeParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 2.5 + 1.5;
    this.vx = Math.random() * 0.6 - 0.3;
    this.vy = -(Math.random() * 1.0 + 0.4);
    this.alpha = 1.0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.012;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180, 180, 180, 0.35)";
    ctx.fill();
    ctx.restore();
  }
}

// Particle Loop Setup
function initCelebration() {
  particles = [];
  balloons = [];
  smokeParticles = [];
  for (let i = 0; i < 65; i++) {
    particles.push(new ConfettiParticle());
  }
  for (let i = 0; i < 7; i++) {
    balloons.push(new Balloon());
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initCelebration();

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  balloons.forEach(b => {
    b.update();
    b.draw();
  });

  smokeParticles.forEach((sm, i) => {
    sm.update();
    sm.draw();
    if (sm.alpha <= 0) {
      smokeParticles.splice(i, 1);
    }
  });

  requestAnimationFrame(animate);
}
animate();

// HBD Sound Chime Sequence
function playHappyBirthdayMelody() {
  hbdNotes.forEach(item => {
    setTimeout(() => {
      if (window.BirthdayAudio) {
        window.BirthdayAudio.playTone(window.BirthdayAudio.notes.find(n => n.f > 0).f, 0.6, 'sine', 0.12);
      }
    }, item.delay);
  });
}

// Sparkle Trail logic on mouse move
window.addEventListener('mousemove', (e) => {
  const particle = document.createElement('div');
  particle.className = 'sparkle-particle';
  const size = Math.random() * 6 + 3;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.left = `${e.clientX - size/2}px`;
  particle.style.top = `${e.clientY - size/2 + window.scrollY}px`;
  document.body.appendChild(particle);
  
  // Animate and delete
  particle.animate([
    { transform: 'scale(1) rotate(0deg)', opacity: 1 },
    { transform: 'scale(0) rotate(180deg)', opacity: 0 }
  ], { duration: 800, easing: 'ease-out' });
  setTimeout(() => particle.remove(), 800);
});

// Toast message helper
function showToast(message, colorClass = 'pink') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `p-4 rounded-xl shadow-lg border border-white/10 text-white backdrop-blur-md transition-all duration-500 translate-y-5 opacity-0 flex items-center gap-3 text-xs uppercase font-interface tracking-wider`;
  
  if (colorClass === 'pink') toast.style.backgroundColor = 'rgba(236, 72, 153, 0.85)';
  else if (colorClass === 'purple') toast.style.backgroundColor = 'rgba(124, 58, 237, 0.85)';
  else if (colorClass === 'amber') toast.style.backgroundColor = 'rgba(217, 119, 6, 0.85)';
  else toast.style.backgroundColor = 'rgba(16, 185, 129, 0.85)';

  toast.innerHTML = `<span>✨</span> <b>${message}</b>`;
  container.appendChild(toast);

  // Trigger Animation
  setTimeout(() => {
    toast.classList.remove('translate-y-5', 'opacity-0');
  }, 50);

  // Auto Dismiss
  setTimeout(() => {
    toast.classList.add('opacity-0', 'scale-90');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}

// Balloon Click Handler
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  balloons.forEach(b => {
    if (b.checkPop(clickX, clickY)) {
      if (window.BirthdayAudio) {
        window.BirthdayAudio.playTone(523.25, 0.15, 'triangle', 0.1); // C5
        setTimeout(() => window.BirthdayAudio.playTone(659.25, 0.1, 'sine', 0.08), 60); // E5
      }
      showToast("🎈 POP! Unleash the celebration!", "pink");
    }
  });
});

// Real-time Database Synchronization
function syncData() {
  const docRef = doc(db, "birthday_wishes", "global");
  onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      userName = data.name || "Star";
      userAge = data.age || "21";
      userMsg = data.hbdMessage || "Wishing you a day filled with laughter, love, cake, and endless magic. Happy Birthday!";
      activeTheme = data.gender || "pastel"; // mapping theme

      // Update UI texts
      document.getElementById('display-name').textContent = userName;
      document.getElementById('display-age').textContent = userAge;
      document.getElementById('display-message').textContent = userMsg;
      document.getElementById('wishes-for-name').textContent = userName;

      // Apply Visual Theme Class
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

      // Apply Cake configuration values
      const flavor = data.cakeFlavor || "strawberry";
      setCakeFrostingStyle(flavor);
      
      const sprinkles = data.sprinkles !== false;
      const berries = data.berries !== false;
      document.getElementById('cake-sprinkles').style.display = sprinkles ? 'flex' : 'none';
      
      const berrySpanList = document.querySelectorAll('.topping-berry');
      berrySpanList.forEach(el => {
        el.style.display = berries ? 'flex' : 'none';
      });
    }
  });

  // Setup guest wishes listener (translucent glassmorphic notes)
  const wishesQuery = query(collection(db, "guestbook_wishes"), orderBy("timestamp", "asc"));
  onSnapshot(wishesQuery, (snapshot) => {
    const wallGrid = document.getElementById('wishes-wall-grid');
    if (!wallGrid) return;
    wallGrid.innerHTML = '';
    snapshot.forEach(docSnap => {
      const note = docSnap.data();
      const noteCard = document.createElement('div');
      
      // Sophisticated glass card with matching glowing borders
      let colorClass = 'bg-white/5 border-zinc-700/30 text-white/90 shadow-sm';
      if (note.color) {
        if (note.color.includes('amber')) colorClass = 'bg-white/5 border-amber-500/30 text-amber-100 shadow-amber-500/5';
        else if (note.color.includes('pink')) colorClass = 'bg-white/5 border-pink-500/30 text-pink-100 shadow-pink-500/5';
        else if (note.color.includes('cyan')) colorClass = 'bg-white/5 border-cyan-500/30 text-cyan-100 shadow-cyan-500/5';
        else if (note.color.includes('emerald')) colorClass = 'bg-white/5 border-emerald-500/30 text-emerald-100 shadow-emerald-500/5';
        else if (note.color.includes('purple')) colorClass = 'bg-white/5 border-purple-500/30 text-purple-100 shadow-purple-500/5';
      }

      noteCard.className = `p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${colorClass}`;
      noteCard.innerHTML = `
        <div class="flex justify-between items-center mb-3 border-b border-white/10 pb-1.5 font-interface">
          <span class="font-bold text-2xs uppercase tracking-wider">📌 ${note.author}</span>
          <span class="text-[9px] uppercase tracking-wider font-semibold opacity-50">Dedication</span>
        </div>
        <p class="text-xs md:text-sm leading-relaxed">${note.text}</p>
      `;
      wallGrid.appendChild(noteCard);
    });
  });
}

function setCakeFrostingStyle(flavor) {
  const topLayer = document.getElementById('cake-layer-top');
  const toppings = document.getElementById('cake-toppings');
  if (!topLayer || !toppings) return;

  if (flavor === 'chocolate') {
    topLayer.style.background = 'linear-gradient(to right, #1c1917 0%, #292524 30%, #1c1917 70%, #292524 100%)';
    topLayer.style.borderColor = 'rgba(28, 25, 23, 0.4)';
    toppings.style.background = 'linear-gradient(to right, #292524, #3e3a39)';
  } else if (flavor === 'matcha') {
    topLayer.style.background = 'linear-gradient(to right, #022c22 0%, #065f46 30%, #022c22 70%, #065f46 100%)';
    topLayer.style.borderColor = 'rgba(2, 44, 34, 0.4)';
    toppings.style.background = 'linear-gradient(to right, #065f46, #0f766e)';
  } else if (flavor === 'vanilla') {
    topLayer.style.background = 'linear-gradient(to right, #fcfaf2 0%, #f4f1ea 30%, #fcfaf2 70%, #f4f1ea 100%)';
    topLayer.style.borderColor = 'rgba(212, 163, 115, 0.3)';
    toppings.style.background = 'linear-gradient(to right, #f4f1ea, #e9e5db)';
  } else {
    // strawberry matte rose
    topLayer.style.background = 'linear-gradient(to right, #db2777 0%, #e879f9 30%, #db2777 70%, #e879f9 100%)';
    topLayer.style.borderColor = 'rgba(219, 39, 119, 0.4)';
    toppings.style.background = 'linear-gradient(to right, #fce7f3, #fbcfe8)';
  }
}

// Sound controllers
const soundToggle = document.getElementById('sound-toggle-btn');
let synthMuted = true;
soundToggle.addEventListener('click', () => {
  synthMuted = !synthMuted;
  const icon = document.getElementById('sound-icon');
  const txt = soundToggle.querySelector('.text');
  if (!synthMuted) {
    icon.textContent = '🔊';
    txt.textContent = 'Music Playing';
    soundToggle.classList.add('playing');
    if (window.BirthdayAudio) window.BirthdayAudio.toggleMusic(true);
  } else {
    icon.textContent = '🔇';
    txt.textContent = 'Synth Sound';
    soundToggle.classList.remove('playing');
    if (window.BirthdayAudio) window.BirthdayAudio.toggleMusic(false);
  }
});

// Piano synthesis mapping
const pianoKeys = document.querySelectorAll('.piano-key');
pianoKeys.forEach(btn => {
  btn.addEventListener('click', () => {
    const note = btn.getAttribute('data-note');
    const freqMap = { 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25 };
    const freq = freqMap[note];
    if (window.BirthdayAudio) {
      window.BirthdayAudio.playTone(freq, 0.6, 'triangle', 0.15);
      const display = document.getElementById('piano-key-display');
      display.textContent = `🎵 Active Note: ${note} (${freq} Hz)`;
    }
  });
});

// Candle blowing interactions
function blowCandle(id) {
  if (!candleStates[id]) return;
  candleStates[id] = false;
  
  const flame = document.getElementById(`flame-${id}`);
  if (flame) {
    flame.style.opacity = '0';
    flame.style.transform = 'scale(0)';
  }

  // Chime blow sound
  if (window.BirthdayAudio) {
    window.BirthdayAudio.playBlowOutSound();
  }

  // Create smoke puff particles
  const candleDiv = document.getElementById(`candle-${id}`);
  if (candleDiv) {
    const rect = candleDiv.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      smokeParticles.push(new SmokeParticle(rect.left + rect.width / 2, rect.top));
    }
  }

  // Check if all candles blown out
  const remaining = [1, 2, 3].filter(i => candleStates[i]);
  const statusMsg = document.getElementById('cake-status-msg');
  if (remaining.length > 0) {
    statusMsg.textContent = `🕯️ ${remaining.length} candles waiting to be blown out!`;
  } else {
    statusMsg.textContent = `🎉 Hooray! Make your wish! 🥳`;
    showToast("🎉 Candles Blown out! Playing celebration music!", "green");
    playHappyBirthdayMelody();
    
    // Confetti explosion
    const explosionCount = 120;
    for (let i = 0; i < explosionCount; i++) {
      particles.push(new ConfettiParticle());
    }
  }
}

// Expose click events
document.getElementById('candle-1').addEventListener('click', () => blowCandle(1));
document.getElementById('candle-2').addEventListener('click', () => blowCandle(2));
document.getElementById('candle-3').addEventListener('click', () => blowCandle(3));

// Reset Candles
document.getElementById('reset-candles-btn').addEventListener('click', () => {
  candleStates = { 1: true, 2: true, 3: true };
  document.getElementById('cake-status-msg').textContent = `🕯️ 3 candles waiting to be blown out!`;
  [1, 2, 3].forEach(id => {
    const flame = document.getElementById(`flame-${id}`);
    if (flame) {
      flame.style.opacity = '1';
      flame.style.transform = 'scale(1)';
    }
  });
  showToast("🔥 Candles Relit!", "amber");
});

// Microphone Blow Detection
let blowCheckInterval = null;
const micToggle = document.getElementById('mic-toggle-btn');
micToggle.addEventListener('click', async () => {
  if (micEnabled) {
    stopMic();
    return;
  }

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
    micToggle.classList.add('bg-emerald-500/40', 'border-emerald-500');
    document.getElementById('mic-level-container').classList.remove('hidden');
    showToast("🎙️ Mic active! Blow directly onto your mic to extinguish candles!", "purple");

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const monitorMic = () => {
      if (!micEnabled) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      document.getElementById('mic-level-bar').style.width = `${Math.min(100, average * 3.5)}%`;

      if (average > 40) {
        // blow out random active candle
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

function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
  }
  micEnabled = false;
  micToggle.innerHTML = `<span>🎙️</span> Mic Blow: Off`;
  micToggle.classList.remove('bg-emerald-500/40', 'border-emerald-500');
  document.getElementById('mic-level-container').classList.add('hidden');
  showToast("🎙️ Microphone disabled", "amber");
}

// Gift Box Open logic
const giftWrapper = document.getElementById('gift-box-wrapper');
const giftLid = document.getElementById('gift-lid');
const secretCard = document.getElementById('secret-card');

giftWrapper.addEventListener('click', () => {
  if (giftLid.classList.contains('lid-open')) return;
  
  giftLid.classList.add('lid-open');
  
  if (window.BirthdayAudio) {
    window.BirthdayAudio.playMagicChimes();
  }

  // Trigger particles
  for (let i = 0; i < 100; i++) {
    particles.push(new ConfettiParticle());
  }

  // Slide open card
  setTimeout(() => {
    secretCard.classList.remove('hidden');
    // Read direct Firestore messages for the secret card
    document.getElementById('card-personalized-msg').textContent = `"${userMsg}"`;
    
    // Scale animations
    setTimeout(() => {
      secretCard.classList.remove('scale-50', 'opacity-0');
      secretCard.classList.add('scale-100', 'opacity-100');
    }, 100);
  }, 1000);
});

// Close card
document.getElementById('close-card-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  secretCard.classList.add('scale-50', 'opacity-0');
  setTimeout(() => {
    secretCard.classList.add('hidden');
    giftLid.classList.remove('lid-open');
  }, 500);
});

// Wish Posting sticky notes
const wishForm = document.getElementById('wish-form');
wishForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const author = document.getElementById('wish-author').value.trim();
  const text = document.getElementById('wish-text').value.trim();
  const color = document.getElementById('wish-color').value;

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

// Initialize real-time synchronization
syncData();
