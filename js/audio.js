/**
 * Web Audio API synthesizer for interactive SFX and ambient background music.
 * Avoids any external assets/mp3 requests to guarantee offline-capability and zero lag.
 */

class BirthdayAudioController {
  constructor() {
    this.ctx = null;
    this.bgMusicPlaying = false;
    this.musicTimeout = null;
    this.notes = [
      // Happy Birthday notes (Note name, duration)
      // C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88, C5=523.25
      { f: 261.63, d: 0.5 }, { f: 261.63, d: 0.5 }, { f: 293.66, d: 1 }, { f: 261.63, d: 1 }, { f: 349.23, d: 1 }, { f: 329.63, d: 2 },
      { f: 261.63, d: 0.5 }, { f: 261.63, d: 0.5 }, { f: 293.66, d: 1 }, { f: 261.63, d: 1 }, { f: 392.00, d: 1 }, { f: 349.23, d: 2 },
      { f: 261.63, d: 0.5 }, { f: 261.63, d: 0.5 }, { f: 523.25, d: 1 }, { f: 440.00, d: 1 }, { f: 349.23, d: 1 }, { f: 329.63, d: 1 }, { f: 293.66, d: 2 },
      { f: 466.16, d: 0.5 }, { f: 466.16, d: 0.5 }, { f: 440.00, d: 1 }, { f: 349.23, d: 1 }, { f: 392.00, d: 1 }, { f: 349.23, d: 2 }
    ];
    this.currentNoteIndex = 0;
  }

  // Initialize the audio context on user interaction
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toggle Background Music
  toggleMusic(on) {
    this.init();
    if (on) {
      if (!this.bgMusicPlaying) {
        this.bgMusicPlaying = true;
        this.playNextMusicNote();
      }
    } else {
      this.bgMusicPlaying = false;
      if (this.musicTimeout) {
        clearTimeout(this.musicTimeout);
        this.musicTimeout = null;
      }
    }
  }

  // Play background song note by note in a loop
  playNextMusicNote() {
    if (!this.bgMusicPlaying || !this.ctx) return;

    const note = this.notes[this.currentNoteIndex];
    const duration = note.d * 0.75; // speed multiplier

    this.playTone(note.f, duration, 'triangle', 0.08); // low-volume soft triangle wave

    this.currentNoteIndex = (this.currentNoteIndex + 1) % this.notes.length;
    
    // Add brief pause between notes
    const delay = (note.d * 750);
    this.musicTimeout = setTimeout(() => {
      this.playNextMusicNote();
    }, delay);
  }

  // Helper to play a single clean chime tone
  playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    
    // Apply soft attack and decay to remove clicks
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Synthesize a Candle Blow out (White noise + Low pitch sweep)
  playBlowOutSound() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // 1. Create a buffer of white noise
    const bufferSize = this.ctx.sampleRate * 0.4; // 0.4 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to simulate air movement
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    filter.Q.setValueAtTime(5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.4);

    // 2. Play a low base thud oscillator for the "puff" impact
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(20, now + 0.2);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Synthesize a Magical glissando / chimes sweep (when gift box opens)
  playMagicChimes() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98]; // C5, D5, E5, G5, A5, C6, D6, E6, G6

    notes.forEach((freq, idx) => {
      const noteDelay = idx * 0.08; // stagger note play
      const noteTime = now + noteDelay;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      
      // Vibrato effect
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 12; // Speed of vibrato
      lfoGain.gain.value = 8; // Depth
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(noteTime);
      osc.start(noteTime);
      
      lfo.stop(noteTime + 0.6);
      osc.stop(noteTime + 0.6);
    });
  }
}

// Attach globally
window.BirthdayAudio = new BirthdayAudioController();
