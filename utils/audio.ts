// Simple synth engine to avoid external assets
let audioCtx: AudioContext | null = null;
let isMuted = false;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  if (!audioCtx || isMuted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const playShoot = (isPlayer: boolean = true) => {
  if (!audioCtx || isMuted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = isPlayer ? 'triangle' : 'sawtooth';
  
  if (isPlayer) {
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
  } else {
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
  }
  
  gain.gain.setValueAtTime(isPlayer ? 0.1 : 0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};

export const playLaserCharge = () => {
  if (!audioCtx || isMuted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 1.0);
  
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 1.0);
  gain.gain.setValueAtTime(0, audioCtx.currentTime + 1.0);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 1.0);
};

export const playExplosion = () => {
  if (!audioCtx || isMuted) return;
  const bufferSize = audioCtx.sampleRate * 0.4;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  filter.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.4);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
};

export const playCrash = () => {
  if (!audioCtx || isMuted) return;
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, audioCtx.currentTime);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
};

export const playBombThrow = () => {
    playTone(200, 'square', 0.3, 0.2);
};

export const playPowerUp = () => {
    playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(800, 'sine', 0.1, 0.1), 100);
    setTimeout(() => playTone(1200, 'sine', 0.2, 0.1), 200);
};

// BGM
let isPlayingBgm = false;
let tickCount = 0;
const bassLine = [110, 110, 110, 110, 130, 130, 98, 98]; 

export const startBGM = () => {
  if (isPlayingBgm || !audioCtx) return;
  isPlayingBgm = true;
  tickCount = 0;
  
  const tick = () => {
    if (!isPlayingBgm) return;
    
    // Driving bassline
    if (tickCount % 4 === 0) {
        const idx = Math.floor(tickCount / 16) % bassLine.length;
        playTone(bassLine[idx], 'sawtooth', 0.1, 0.15);
    }
    
    // High hats
    if (tickCount % 2 === 0) {
        playTone(1000 + Math.random()*500, 'triangle', 0.05, 0.02);
    }

    tickCount++;
    setTimeout(tick, 100); // Fast tempo
  };
  
  tick();
};

export const stopBGM = () => {
  isPlayingBgm = false;
};