/**
 * ===================================================================
 * 3D COUNTDOWN REVEAL SYSTEM (15-DAY CHARACTER THEMES)
 * ===================================================================
 * Features:
 * - 15 Unique Character Themes (Ninja, Shooter, Doraemon, Thor, etc.)
 * - 3D Perspective CSS Transforms & Hardware Acceleration
 * - Custom SVG Vector Art for zero-latency loading
 * - Native Web Audio API Sound Synthesizer (No external mp3 dependencies)
 * - Canvas Particle Physics (Sparks, Smoke, Glass Cracks, Stardust)
 * - Interactive Controls: Replay (🎬), Theme Preview Selector, Sound Toggle
 * ===================================================================
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
  let audioCtx = null;
  let isMuted = localStorage.getItem('cd_sound_muted') === 'true';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'slash') {
        // High-speed whoosh / slice
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'shot') {
        // Gunshot / punchy crack
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'sparkle') {
        // Magical chime / Doraemon gadget
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'boom') {
        // Explosion / Thunder
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'laser') {
        // Futuristic laser zap
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'fanfare') {
        // Celebration chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (_) {}
  }

  // --- CANVAS PARTICLE SYSTEM ---
  function createParticleEngine(canvas) {
    if (!canvas) return { burst: () => {}, clear: () => {} };
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId = null;

    function resize() {
      canvas.width = canvas.offsetWidth || 500;
      canvas.height = canvas.offsetHeight || 180;
    }
    resize();

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0.15;
        p.alpha -= p.fade || 0.02;
        p.rotation = (p.rotation || 0) + (p.vRot || 0.05);

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'star') {
          drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        animId = requestAnimationFrame(update);
      } else {
        animId = null;
      }
    }

    function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    }

    return {
      burst: (x, y, count = 30, colorArr = ['#ef4444', '#f59e0b', '#3b82f6', '#ffffff'], shape = 'circle') => {
        resize();
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 6;
          particles.push({
            x: x !== undefined ? x : canvas.width / 2,
            y: y !== undefined ? y : canvas.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            size: 2 + Math.random() * 5,
            color: colorArr[Math.floor(Math.random() * colorArr.length)],
            alpha: 1,
            fade: 0.015 + Math.random() * 0.02,
            gravity: 0.12,
            shape: shape,
            vRot: (Math.random() - 0.5) * 0.2
          });
        }
        if (!animId) update();
      },
      clear: () => {
        particles = [];
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }

  // --- 15 UNIQUE THEMES DEFINITIONS ---
  const THEMES = [
    {
      id: 15,
      name: "Ninja Katana Slash",
      icon: "🥷",
      badge: "Day 15: Ninja Slash",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5"/>
          <!-- Ninja Mask -->
          <ellipse cx="50" cy="48" rx="28" ry="24" fill="#0f172a"/>
          <!-- Headband -->
          <rect x="22" y="32" width="56" height="8" rx="3" fill="#dc2626"/>
          <!-- Fierce Eyes Opening -->
          <rect x="32" y="44" width="36" height="10" rx="3" fill="#f8fafc"/>
          <ellipse cx="42" cy="49" rx="3" ry="2.5" fill="#0f172a"/>
          <ellipse cx="58" cy="49" rx="3" ry="2.5" fill="#0f172a"/>
          <!-- Sword on back -->
          <line x1="20" y1="20" x2="80" y2="80" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
          <rect x="15" y="15" width="10" height="8" rx="2" transform="rotate(45 15 15)" fill="#e2e8f0"/>
          <!-- Katana Gleam -->
          <circle cx="28" cy="28" r="2.5" fill="#ffffff"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const actor = stage.querySelector('.cd-character-actor');
        const slash = stage.querySelector('.cd-slash-beam');
        const cover = stage.querySelector('.cd-reveal-cover');

        actor.style.left = '-120px';
        actor.style.top = '15%';
        actor.style.opacity = '1';
        actor.style.transform = 'scale(0.8) rotate(-15deg)';

        // 1. Dash across
        setTimeout(() => {
          actor.style.transform = 'translate3d(260px, 10px, 50px) scale(1.15) rotate(10deg)';
          playSound('slash');
        }, 100);

        // 2. Sword slash beam
        setTimeout(() => {
          if (slash) slash.classList.add('cd-slash-active');
          stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 40, ['#ffffff', '#38bdf8', '#93c5fd'], 'star');
        }, 320);

        // 3. Cut halves fall away in 3D
        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
          actor.style.transform = 'translate3d(600px, -20px, 80px) scale(0.7) rotate(25deg)';
          actor.style.opacity = '0';
        }, 500);

        setTimeout(onDone, 950);
      }
    },
    {
      id: 14,
      name: "Tactical Sniper Shot",
      icon: "🎯",
      badge: "Day 14: Sniper Shot",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="44" fill="#0f172a" stroke="#ef4444" stroke-width="3"/>
          <line x1="50" y1="12" x2="50" y2="88" stroke="#ef4444" stroke-width="2"/>
          <line x1="12" y1="50" x2="88" y2="50" stroke="#ef4444" stroke-width="2"/>
          <circle cx="50" cy="50" r="22" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2"/>
          <circle cx="50" cy="50" r="5" fill="#ef4444"/>
          <text x="65" y="32" fill="#ef4444" font-size="9" font-family="monospace" font-weight="bold">LOCK ON</text>
        </svg>
      `,
      run: (stage, onDone) => {
        const crosshair = stage.querySelector('.cd-crosshair');
        const cover = stage.querySelector('.cd-reveal-cover');

        if (crosshair) {
          crosshair.style.opacity = '1';
          crosshair.style.left = '30%';
          crosshair.style.top = '50%';
          crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
        }

        // Shot 1
        setTimeout(() => {
          if (crosshair) { crosshair.style.left = '45%'; crosshair.style.top = '40%'; }
          playSound('shot');
          spawnBulletHole(stage, 0.45, 0.4);
          stage.engine.burst(stage.offsetWidth * 0.45, stage.offsetHeight * 0.4, 20, ['#ef4444', '#f59e0b', '#ffffff']);
        }, 300);

        // Shot 2
        setTimeout(() => {
          if (crosshair) { crosshair.style.left = '58%'; crosshair.style.top = '60%'; }
          playSound('shot');
          spawnBulletHole(stage, 0.58, 0.6);
          stage.engine.burst(stage.offsetWidth * 0.58, stage.offsetHeight * 0.6, 25, ['#ef4444', '#f59e0b', '#ffffff']);
        }, 550);

        // Shot 3 & Glass Shatter
        setTimeout(() => {
          playSound('shot');
          playSound('boom');
          if (crosshair) crosshair.style.opacity = '0';
          stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 50, ['#ffffff', '#94a3b8', '#cbd5e1'], 'rect');
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 800);

        setTimeout(onDone, 1200);
      }
    },
    {
      id: 13,
      name: "Doraemon 4D Pocket",
      icon: "🐱",
      badge: "Day 13: Doraemon Pocket",
      actorSvg: `
        <svg width="130" height="130" viewBox="0 0 120 120" fill="none">
          <!-- Doraemon Head -->
          <circle cx="60" cy="52" r="42" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
          <ellipse cx="60" cy="58" rx="34" ry="30" fill="#ffffff"/>
          <!-- Eyes -->
          <ellipse cx="50" cy="34" rx="8" ry="12" fill="#ffffff" stroke="#0f172a" stroke-width="1.5"/>
          <ellipse cx="70" cy="34" rx="8" ry="12" fill="#ffffff" stroke="#0f172a" stroke-width="1.5"/>
          <circle cx="53" cy="36" r="3" fill="#0f172a"/>
          <circle cx="67" cy="36" r="3" fill="#0f172a"/>
          <!-- Nose & Whiskers -->
          <circle cx="60" cy="46" r="5" fill="#ef4444"/>
          <line x1="60" y1="51" x2="60" y2="68" stroke="#0f172a" stroke-width="1.5"/>
          <path d="M42 68 Q60 82 78 68" stroke="#0f172a" stroke-width="2" fill="none"/>
          <line x1="30" y1="50" x2="48" y2="52" stroke="#0f172a" stroke-width="1.5"/>
          <line x1="28" y1="60" x2="46" y2="60" stroke="#0f172a" stroke-width="1.5"/>
          <line x1="30" y1="70" x2="48" y2="68" stroke="#0f172a" stroke-width="1.5"/>
          <line x1="72" y1="52" x2="90" y2="50" stroke="#0f172a" stroke-width="1.5"/>
          <line x1="74" y1="60" x2="92" y2="60" stroke="#0f172a" stroke-width="1.5"/>
          <line x1="72" y1="68" x2="90" y2="70" stroke="#0f172a" stroke-width="1.5"/>
          <!-- Collar & Bell -->
          <rect x="36" y="86" width="48" height="8" rx="4" fill="#dc2626"/>
          <circle cx="60" cy="95" r="7" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
          <!-- 4D Pocket (Semi Circle) -->
          <path d="M40 102 Q60 120 80 102 Z" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const actor = stage.querySelector('.cd-character-actor');
        const cover = stage.querySelector('.cd-reveal-cover');

        actor.style.left = '50%';
        actor.style.top = '-140px';
        actor.style.opacity = '1';
        actor.style.transform = 'translate(-50%, 0) scale(0.6)';

        // 1. Doraemon pops down smiling
        setTimeout(() => {
          actor.style.transform = 'translate(-50%, 150px) scale(1.1)';
          playSound('sparkle');
        }, 100);

        // 2. Doraemon reaches into 4D pocket, pulling gadget out
        setTimeout(() => {
          stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight * 0.65, 35, ['#facc15', '#38bdf8', '#ec4899', '#ffffff'], 'star');
          playSound('fanfare');
        }, 550);

        // 3. Cover slides open magically
        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
          actor.style.transform = 'translate(-50%, -160px) scale(0.7)';
          actor.style.opacity = '0';
        }, 850);

        setTimeout(onDone, 1250);
      }
    },
    {
      id: 12,
      name: "Thor's Thunder Hammer",
      icon: "⚡",
      badge: "Day 12: Thor Lightning",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <!-- Lightning Bolt Background -->
          <polygon points="55,5 30,55 50,55 42,95 75,45 54,45" fill="#facc15" opacity="0.4"/>
          <!-- Mjolnir Hammer Head -->
          <rect x="25" y="30" width="50" height="30" rx="6" fill="#94a3b8" stroke="#cbd5e1" stroke-width="2"/>
          <line x1="30" y1="35" x2="30" y2="55" stroke="#64748b" stroke-width="2"/>
          <line x1="70" y1="35" x2="70" y2="55" stroke="#64748b" stroke-width="2"/>
          <!-- Handle -->
          <rect x="46" y="60" width="8" height="35" rx="3" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
          <line x1="46" y1="70" x2="54" y2="70" stroke="#fef3c7" stroke-width="1.5"/>
          <line x1="46" y1="80" x2="54" y2="80" stroke="#fef3c7" stroke-width="1.5"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const actor = stage.querySelector('.cd-character-actor');
        const cover = stage.querySelector('.cd-reveal-cover');

        actor.style.left = '50%';
        actor.style.top = '-120px';
        actor.style.opacity = '1';
        actor.style.transform = 'translate(-50%, 0) rotate(45deg) scale(0.8)';

        setTimeout(() => {
          actor.style.transform = 'translate(-50%, 140px) rotate(0deg) scale(1.2)';
        }, 100);

        setTimeout(() => {
          playSound('boom');
          stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight * 0.5, 45, ['#facc15', '#ffffff', '#60a5fa'], 'star');
          if (cover) cover.classList.add('cd-cover-sliced');
          actor.style.opacity = '0';
        }, 450);

        setTimeout(onDone, 950);
      }
    },
    {
      id: 11,
      name: "Dragon Fire Breath",
      icon: "🐉",
      badge: "Day 11: Dragon Fire",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" fill="#7f1d1d" stroke="#f97316" stroke-width="2"/>
          <!-- Dragon Head -->
          <path d="M25 65 Q45 25 75 40 Q85 55 65 75 Z" fill="#dc2626"/>
          <circle cx="62" cy="48" r="4" fill="#facc15"/>
          <polygon points="75,40 92,48 70,55" fill="#f97316"/>
          <!-- Horns -->
          <path d="M35 40 Q25 15 15 25" stroke="#facc15" stroke-width="4" stroke-linecap="round" fill="none"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const actor = stage.querySelector('.cd-character-actor');
        const cover = stage.querySelector('.cd-reveal-cover');

        actor.style.left = '-120px';
        actor.style.top = '20%';
        actor.style.opacity = '1';

        setTimeout(() => {
          actor.style.transform = 'translate3d(180px, 0, 0) scale(1.1)';
        }, 100);

        setTimeout(() => {
          playSound('boom');
          stage.engine.burst(stage.offsetWidth * 0.5, stage.offsetHeight * 0.5, 50, ['#ef4444', '#f97316', '#facc15']);
          if (cover) cover.classList.add('cd-cover-sliced');
          actor.style.transform = 'translate3d(-100px, 0, 0)';
          actor.style.opacity = '0';
        }, 450);

        setTimeout(onDone, 950);
      }
    },
    {
      id: 10,
      name: "Cyberpunk Hologram",
      icon: "🤖",
      badge: "Day 10: Cyber Laser",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <rect x="25" y="25" width="50" height="50" rx="10" fill="#0f172a" stroke="#06b6d4" stroke-width="2.5"/>
          <circle cx="40" cy="45" r="5" fill="#06b6d4"/>
          <circle cx="60" cy="45" r="5" fill="#06b6d4"/>
          <rect x="35" y="60" width="30" height="5" rx="2" fill="#06b6d4"/>
          <!-- Antenna -->
          <line x1="50" y1="25" x2="50" y2="10" stroke="#06b6d4" stroke-width="2"/>
          <circle cx="50" cy="10" r="3" fill="#22d3ee"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('laser');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 35, ['#06b6d4', '#3b82f6', '#ffffff'], 'star');

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 300);

        setTimeout(onDone, 800);
      }
    },
    {
      id: 9,
      name: "Karate Master Kick",
      icon: "🥋",
      badge: "Day 9: Karate Break",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
          <!-- Black Belt -->
          <rect x="20" y="55" width="60" height="8" rx="2" fill="#0f172a"/>
          <!-- Karate Fist -->
          <circle cx="50" cy="40" r="14" fill="#fbcfe8"/>
          <rect x="42" y="32" width="16" height="12" rx="3" fill="#f43f5e"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('shot');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 40, ['#f43f5e', '#ffffff', '#fb7185'], 'rect');

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 200);

        setTimeout(onDone, 800);
      }
    },
    {
      id: 8,
      name: "Space Rocket Thruster",
      icon: "🚀",
      badge: "Day 8: Rocket Blast",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <path d="M50 15 Q65 40 65 65 L35 65 Q35 40 50 15 Z" fill="#e2e8f0" stroke="#0284c7" stroke-width="2"/>
          <circle cx="50" cy="40" r="6" fill="#38bdf8"/>
          <!-- Thruster fire -->
          <polygon points="40,65 50,88 60,65" fill="#f97316"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('boom');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight * 0.7, 40, ['#f97316', '#facc15', '#ffffff']);

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 300);

        setTimeout(onDone, 850);
      }
    },
    {
      id: 7,
      name: "Speed Drift Racer",
      icon: "🏎️",
      badge: "Day 7: Speed Drift",
      actorSvg: `
        <svg width="130" height="90" viewBox="0 0 100 70" fill="none">
          <path d="M10 40 L30 25 L70 25 L90 40 L90 55 L10 55 Z" fill="#ef4444"/>
          <circle cx="30" cy="55" r="9" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
          <circle cx="75" cy="55" r="9" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('slash');
        stage.engine.burst(stage.offsetWidth * 0.4, stage.offsetHeight * 0.5, 30, ['#94a3b8', '#cbd5e1', '#ffffff']);

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 250);

        setTimeout(onDone, 800);
      }
    },
    {
      id: 6,
      name: "TNT Time Bomb",
      icon: "💣",
      badge: "Day 6: TNT Bomb",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="55" r="32" fill="#0f172a"/>
          <!-- Fuse -->
          <path d="M50 23 Q60 12 70 15" stroke="#d97706" stroke-width="3" fill="none"/>
          <circle cx="70" cy="15" r="4" fill="#ef4444"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('boom');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 50, ['#ef4444', '#f59e0b', '#facc15', '#ffffff'], 'star');

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 250);

        setTimeout(onDone, 800);
      }
    },
    {
      id: 5,
      name: "Arcane Magic Wand",
      icon: "🧙‍♂️",
      badge: "Day 5: Wizard Magic",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <polygon points="50,15 55,35 75,35 60,48 65,70 50,55 35,70 40,48 25,35 45,35" fill="#facc15"/>
          <line x1="50" y1="55" x2="25" y2="90" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('sparkle');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 40, ['#c084fc', '#facc15', '#38bdf8'], 'star');

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 300);

        setTimeout(onDone, 850);
      }
    },
    {
      id: 4,
      name: "Heat Vision Laser",
      icon: "🦸",
      badge: "Day 4: Eye Lasers",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="40" fill="#1e3a8a"/>
          <circle cx="40" cy="45" r="6" fill="#ef4444"/>
          <circle cx="60" cy="45" r="6" fill="#ef4444"/>
          <line x1="40" y1="45" x2="10" y2="90" stroke="#ef4444" stroke-width="3"/>
          <line x1="60" y1="45" x2="90" y2="90" stroke="#ef4444" stroke-width="3"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('laser');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 35, ['#ef4444', '#f97316', '#ffffff']);

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 250);

        setTimeout(onDone, 800);
      }
    },
    {
      id: 3,
      name: "Detective Mystery",
      icon: "🔍",
      badge: "Day 3: Detective Lens",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="45" cy="45" r="28" stroke="#f59e0b" stroke-width="6" fill="rgba(245,158,11,0.15)"/>
          <line x1="65" y1="65" x2="90" y2="90" stroke="#78350f" stroke-width="8" stroke-linecap="round"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('sparkle');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 30, ['#f59e0b', '#fde68a', '#ffffff'], 'star');

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 250);

        setTimeout(onDone, 800);
      }
    },
    {
      id: 2,
      name: "Retro 8-Bit Power-up",
      icon: "👾",
      badge: "Day 2: 8-Bit Power",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <rect x="20" y="20" width="60" height="60" fill="#10b981"/>
          <rect x="35" y="35" width="10" height="10" fill="#ffffff"/>
          <rect x="55" y="35" width="10" height="10" fill="#ffffff"/>
          <rect x="35" y="55" width="30" height="6" fill="#065f46"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('fanfare');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 35, ['#10b981', '#34d399', '#ffffff'], 'rect');

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 250);

        setTimeout(onDone, 800);
      }
    },
    {
      id: 1,
      name: "Golden Finale Trophy",
      icon: "🏆",
      badge: "Day 1: Champion Trophy",
      actorSvg: `
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <polygon points="30,20 70,20 62,55 38,55" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
          <rect x="44" y="55" width="12" height="18" fill="#ca8a04"/>
          <rect x="32" y="73" width="36" height="10" rx="3" fill="#854d0e"/>
          <circle cx="50" cy="36" r="6" fill="#ffffff" opacity="0.6"/>
        </svg>
      `,
      run: (stage, onDone) => {
        const cover = stage.querySelector('.cd-reveal-cover');
        playSound('fanfare');
        stage.engine.burst(stage.offsetWidth / 2, stage.offsetHeight / 2, 60, ['#facc15', '#fbbf24', '#ffffff', '#f43f5e'], 'star');

        setTimeout(() => {
          if (cover) cover.classList.add('cd-cover-sliced');
        }, 250);

        setTimeout(onDone, 900);
      }
    }
  ];

  function spawnBulletHole(stage, ratioX, ratioY) {
    const hole = document.createElement('div');
    hole.className = 'cd-bullet-hole';
    hole.style.left = `${ratioX * 100}%`;
    hole.style.top = `${ratioY * 100}%`;
    stage.appendChild(hole);
  }

  // --- CONTROLLER INIT ---
  function init3DCountdown() {
    const countdownEl = document.getElementById('exam-countdown');
    if (!countdownEl) return;

    // Check if already wrapped
    if (countdownEl.parentElement && countdownEl.parentElement.classList.contains('countdown-3d-stage')) {
      return;
    }

    // Wrap countdown card in 3D perspective stage
    const stage = document.createElement('div');
    stage.className = 'countdown-3d-stage';
    countdownEl.parentNode.insertBefore(stage, countdownEl);
    stage.appendChild(countdownEl);

    // Calculate current days left
    const targetDate = new Date("2026-11-29T00:00:00");
    const today = new Date();
    const diffTime = targetDate - today;
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0;
    const holidayDays = 20;
    let effectiveDays = diffDays - holidayDays;
    if (effectiveDays < 0) effectiveDays = 0;

    // Map remaining pure study days to 15 themes (default to Day 15 or 1..15)
    let currentThemeId = effectiveDays > 0 ? (effectiveDays <= 15 ? effectiveDays : ((effectiveDays % 15) || 15)) : 1;

    // Inject Controls Toolbar inside countdown card
    const controlsBar = document.createElement('div');
    controlsBar.className = 'cd-controls-bar';
    controlsBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span id="cd-active-theme-badge" class="cd-theme-badge">🥷 3D Reveal</span>
        <select id="cd-theme-selector" class="cd-theme-picker" title="Preview any of the 15 daily animations">
          ${THEMES.map(t => `<option value="${t.id}" ${t.id === currentThemeId ? 'selected' : ''}>${t.badge}</option>`).join('')}
        </select>
      </div>
      <div class="cd-actions-group">
        <button type="button" id="cd-replay-btn" class="cd-ctrl-btn" title="Replay 3D Reveal Animation">
          <span>🎬</span> <span>Replay</span>
        </button>
        <button type="button" id="cd-sound-toggle-btn" class="cd-ctrl-btn" title="Toggle Sound Effects">
          <span id="cd-sound-icon">${isMuted ? '🔇' : '🔊'}</span>
        </button>
      </div>
    `;
    countdownEl.insertBefore(controlsBar, countdownEl.firstChild);

    // Create Canvas Particle Layer
    const canvas = document.createElement('canvas');
    canvas.className = 'cd-fx-canvas';
    countdownEl.appendChild(canvas);
    stage.engine = createParticleEngine(canvas);
    countdownEl.engine = stage.engine;

    // Create Slash Beam & Crosshair elements
    const slashBeam = document.createElement('div');
    slashBeam.className = 'cd-slash-beam';
    countdownEl.appendChild(slashBeam);

    const crosshair = document.createElement('div');
    crosshair.className = 'cd-crosshair';
    crosshair.innerHTML = '<div class="cd-crosshair-dot"></div>';
    countdownEl.appendChild(crosshair);

    // Character Actor Holder
    const actorHolder = document.createElement('div');
    actorHolder.className = 'cd-character-actor';
    countdownEl.appendChild(actorHolder);

    // Cover Overlay Layer (for split cut/shatter)
    let coverLayer = null;

    function buildCoverLayer(themeObj) {
      if (coverLayer) coverLayer.remove();
      coverLayer = document.createElement('div');
      coverLayer.className = 'cd-reveal-cover';
      coverLayer.innerHTML = `
        <div class="cd-cover-half-top">
          <div style="transform: translateY(18px); font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: #f8fafc;">
            <span>⏳</span> <span>Prelims Exam Countdown</span>
          </div>
        </div>
        <div class="cd-cover-half-bottom">
          <div style="transform: translateY(-18px); font-size: 0.85rem; color: #94a3b8; font-weight: 500;">
            ${themeObj.badge} • Ready to Reveal...
          </div>
        </div>
      `;
      countdownEl.appendChild(coverLayer);
    }

    function playThemeAnimation(themeId) {
      const theme = THEMES.find(t => t.id === Number(themeId)) || THEMES[0];
      const badgeEl = document.getElementById('cd-active-theme-badge');
      if (badgeEl) badgeEl.textContent = `${theme.icon} ${theme.name}`;

      // Reset DOM state
      stage.engine.clear();
      document.querySelectorAll('.cd-bullet-hole').forEach(el => el.remove());
      slashBeam.classList.remove('cd-slash-active');
      crosshair.style.opacity = '0';
      actorHolder.style.opacity = '0';
      actorHolder.innerHTML = theme.actorSvg;

      buildCoverLayer(theme);
      countdownEl.classList.add('countdown-3d-active');

      // Trigger Theme Run
      theme.run(countdownEl, () => {
        countdownEl.classList.remove('countdown-3d-active');
        // Glow effect on revealed numbers
        const totalNum = document.getElementById('cd-total');
        const effNum = document.getElementById('cd-effective');
        if (totalNum) totalNum.classList.add('cd-num-glow');
        if (effNum) effNum.classList.add('cd-num-glow');
        setTimeout(() => {
          if (totalNum) totalNum.classList.remove('cd-num-glow');
          if (effNum) effNum.classList.remove('cd-num-glow');
        }, 1000);
      });
    }

    // Attach Event Listeners
    const replayBtn = document.getElementById('cd-replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        const sel = document.getElementById('cd-theme-selector');
        playThemeAnimation(sel ? sel.value : currentThemeId);
      });
    }

    const themeSelector = document.getElementById('cd-theme-selector');
    if (themeSelector) {
      themeSelector.addEventListener('change', (e) => {
        playThemeAnimation(e.target.value);
      });
    }

    const soundBtn = document.getElementById('cd-sound-toggle-btn');
    const soundIcon = document.getElementById('cd-sound-icon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('cd_sound_muted', String(isMuted));
        if (soundIcon) soundIcon.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Auto-run animation if user hasn't seen today's animation yet
    const todayStr = new Date().toISOString().split('T')[0];
    const lastSeen = localStorage.getItem('cd_3d_last_seen_date');
    if (lastSeen !== todayStr) {
      localStorage.setItem('cd_3d_last_seen_date', todayStr);
      setTimeout(() => {
        playThemeAnimation(currentThemeId);
      }, 400);
    }
  }

  // GLOBAL FUNCTION: Trigger Celebratory Reveal Modal on Student Login
  window.triggerCountdownRevealModal = function () {
    const existing = document.getElementById('cd-login-reveal-modal');
    if (existing) existing.remove();

    const targetDate = new Date("2026-11-29T00:00:00");
    const today = new Date();
    const diffTime = targetDate - today;
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0;
    const holidayDays = 20;
    let effectiveDays = diffDays - holidayDays;
    if (effectiveDays < 0) effectiveDays = 0;

    let themeId = effectiveDays > 0 ? (effectiveDays <= 15 ? effectiveDays : ((effectiveDays % 15) || 15)) : 1;
    const theme = THEMES.find(t => t.id === Number(themeId)) || THEMES[0];

    const modal = document.createElement('div');
    modal.id = 'cd-login-reveal-modal';
    modal.className = 'cd-modal-overlay';
    modal.innerHTML = `
      <div class="cd-modal-box">
        <button class="cd-modal-close" id="cd-modal-close-btn">&times;</button>
        <div style="font-size: 2.8rem; margin-bottom: 0.5rem;" class="cd-floating-actor">${theme.icon}</div>
        <div class="cd-theme-badge" style="margin-bottom: 0.75rem;">${theme.badge}</div>
        <h2 style="margin: 0 0 0.5rem 0; font-size: 1.4rem; color: var(--text);">Prelims Exam Countdown</h2>
        <p style="margin: 0 0 1.5rem 0; color: var(--text-muted); font-size: 0.9rem;">
          Welcome back! Here is your daily mission countdown status:
        </p>

        <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 1.5rem; background: var(--bg); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border);">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 2.4rem; font-weight: 700; color: var(--danger); line-height: 1;">${diffDays}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-top: 0.35rem;">Total Days Left</span>
          </div>
          <div style="width: 1px; background: var(--border);"></div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 2.4rem; font-weight: 700; color: var(--danger); line-height: 1;">${effectiveDays}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-top: 0.35rem;">Pure Study Days</span>
          </div>
        </div>

        <button id="cd-modal-continue-btn" class="btn btn-primary" style="width: 100%; padding: 0.8rem;">
          Let's Study! 🚀
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    playSound('fanfare');

    const closeModal = () => {
      modal.remove();
    };

    const closeBtn = document.getElementById('cd-modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const contBtn = document.getElementById('cd-modal-continue-btn');
    if (contBtn) contBtn.addEventListener('click', closeModal);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DCountdown);
  } else {
    init3DCountdown();
  }
})();
