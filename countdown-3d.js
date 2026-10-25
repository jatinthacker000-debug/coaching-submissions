/**
 * ===================================================================
 * 3D COUNTDOWN REVEAL SYSTEM: FULL NINJA BLADE DRAW & PAPER TEAR
 * ===================================================================
 * Features:
 * - Full-Body Shinobi Ninja Actor with Katana Blade Sheath Extraction
 * - Realistic Parchment Paper Sheet with Jagged Torn Fiber Edge Split
 * - Web Audio API Paper Tearing & Blade Friction Synthesizer (0 mp3 files)
 * - Canvas Physics for Realistic Torn Paper Scraps, Dust, and Blade Sparks
 * - Single-Day Focus: Only today's theme is active (No preview dropdown)
 * - Interactive Controls: Replay (🎬) and Mute (🔊/🔇)
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

      if (type === 'blade_draw') {
        // Metallic sword sliding out of sheath ("shiii-ing")
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'slash_whoosh') {
        // High speed aerodynamic whoosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'paper_tear') {
        // Realistic paper rip / tear sound using filtered noise burst
        const bufferSize = ctx.sampleRate * 0.35;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(2.5, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.35);
      } else if (type === 'reveal_chime') {
        // Magical celebration chime
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.2, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.4);
        });
      }
    } catch (_) {}
  }

  // --- CANVAS PARTICLE PHYSICS (Torn Paper Scraps & Sparks) ---
  function createParticleEngine(canvas) {
    if (!canvas) return { burst: () => {}, clear: () => {} };
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId = null;

    function resize() {
      canvas.width = canvas.offsetWidth || 600;
      canvas.height = canvas.offsetHeight || 200;
    }
    resize();

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.fade;
        p.rotation += p.vRot;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.type === 'paper_scrap') {
          // Torn paper rectangular scrap with flutter
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        } else {
          // Blade spark particle
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

    return {
      burstTornPaper: (x, y, count = 35) => {
        resize();
        const paperTones = ['#fbf7ee', '#f4ede0', '#e7dec8', '#ffffff', '#cbd5e1'];
        for (let i = 0; i < count; i++) {
          const angle = (Math.random() - 0.5) * Math.PI + (Math.random() > 0.5 ? 0 : Math.PI);
          const speed = 2 + Math.random() * 5.5;
          particles.push({
            type: 'paper_scrap',
            x: x !== undefined ? x : canvas.width / 2,
            y: y !== undefined ? y : canvas.height / 2,
            vx: Math.cos(angle) * speed,
            vy: (Math.random() - 0.5) * 5 - 2,
            width: 4 + Math.random() * 9,
            height: 3 + Math.random() * 6,
            color: paperTones[Math.floor(Math.random() * paperTones.length)],
            alpha: 1,
            fade: 0.012 + Math.random() * 0.015,
            gravity: 0.08,
            rotation: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.25
          });
        }
        // Add blade sparks
        for (let i = 0; i < 25; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 6;
          particles.push({
            type: 'spark',
            x: x !== undefined ? x : canvas.width / 2,
            y: y !== undefined ? y : canvas.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.5 + Math.random() * 2.5,
            color: '#38bdf8',
            alpha: 1,
            fade: 0.025 + Math.random() * 0.03,
            gravity: 0.15,
            rotation: 0,
            vRot: 0
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

  // --- FULL-BODY NINJA VECTOR ARTWORK (SVG) ---
  const FULL_NINJA_SVG = `
    <svg width="180" height="200" viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow on floor -->
      <ellipse cx="80" cy="172" rx="45" ry="8" fill="rgba(0,0,0,0.35)"/>

      <!-- Legs in crouch combat stance -->
      <path d="M55 125 L40 165 L28 168 L48 172 L62 140 Z" fill="#0f172a"/>
      <path d="M85 125 L110 155 L130 162 L115 170 L92 135 Z" fill="#0f172a"/>
      <!-- Leg wraps / Shinobi Gaiters -->
      <line x1="42" y1="145" x2="52" y2="148" stroke="#334155" stroke-width="2"/>
      <line x1="40" y1="155" x2="48" y2="158" stroke="#334155" stroke-width="2"/>
      <line x1="98" y1="142" x2="108" y2="140" stroke="#334155" stroke-width="2"/>

      <!-- Torso / Shinobi Shozoku -->
      <path d="M48 68 L92 68 L88 128 L52 128 Z" fill="#1e293b"/>
      <!-- Chest Armor Harness -->
      <path d="M52 70 L80 115 L88 115 L60 70 Z" fill="#334155"/>
      <path d="M88 70 L60 115 L52 115 L80 70 Z" fill="#334155"/>
      <!-- Red Waist Sash -->
      <rect x="48" y="115" width="44" height="10" rx="3" fill="#dc2626"/>
      <path d="M72 125 Q78 145 74 158" stroke="#dc2626" stroke-width="4" stroke-linecap="round" fill="none"/>

      <!-- Katana Scabbard / Saya on hip -->
      <rect x="30" y="90" width="10" height="65" rx="3" transform="rotate(-35 30 90)" fill="#090d16" stroke="#475569" stroke-width="1.5"/>
      <circle cx="33" cy="92" r="3" fill="#facc15"/>

      <!-- Head & Hood -->
      <ellipse cx="70" cy="42" rx="22" ry="24" fill="#0f172a"/>
      <!-- Shinobi Mask -->
      <path d="M52 42 Q70 62 88 42 Z" fill="#1e293b"/>
      <!-- Red Headband with flying knot -->
      <rect x="49" y="32" width="42" height="7" rx="2" fill="#dc2626"/>
      <circle cx="70" cy="35.5" r="3.5" fill="#e2e8f0"/>
      <!-- Headband ribbons blowing in wind -->
      <path d="M49 35 Q30 30 18 42" stroke="#dc2626" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M49 37 Q25 45 15 55" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" fill="none"/>

      <!-- Intense Eyes Opening -->
      <rect x="56" y="38" width="28" height="8" rx="2" fill="#f8fafc"/>
      <ellipse cx="63" cy="42" rx="2.5" ry="2" fill="#0f172a"/>
      <ellipse cx="77" cy="42" rx="2.5" ry="2" fill="#0f172a"/>

      <!-- Left Arm & Fist Forward -->
      <path d="M88 75 L115 88 L125 80 L98 68 Z" fill="#1e293b"/>
      <circle cx="124" cy="82" r="7" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>

      <!-- Right Arm drawing Katana from hip -->
      <path d="M50 75 L38 92 L46 98 L60 82 Z" fill="#1e293b"/>
      <circle cx="42" cy="94" r="6" fill="#0f172a"/>

      <!-- THE DRAWN KATANA BLADE -->
      <g id="ninja-blade-group" class="cd-blade-gleam">
        <!-- Hilt / Tsuka -->
        <rect x="36" y="70" width="7" height="22" rx="2" transform="rotate(-40 36 70)" fill="#78350f" stroke="#facc15" stroke-width="1.5"/>
        <!-- Guard / Tsuba -->
        <ellipse cx="44" cy="74" rx="8" ry="4" transform="rotate(-40 44 74)" fill="#facc15"/>
        <!-- Steel Blade with Metallic Reflection -->
        <path d="M48 70 Q95 35 150 12 L146 16 Q92 42 46 75 Z" fill="url(#bladeGradient)"/>
        <!-- Blade Edge Gleam -->
        <path d="M48 70 Q95 35 150 12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <circle cx="148" cy="13" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 4px #38bdf8)"/>
      </g>

      <defs>
        <linearGradient id="bladeGradient" x1="46" y1="75" x2="150" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="50%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  // --- CONTROLLER INIT ---
  function init3DCountdown() {
    const countdownEl = document.getElementById('exam-countdown');
    if (!countdownEl) return;

    if (countdownEl.parentElement && countdownEl.parentElement.classList.contains('countdown-3d-stage')) {
      return;
    }

    // Wrap countdown card in 3D perspective stage
    const stage = document.createElement('div');
    stage.className = 'countdown-3d-stage';
    countdownEl.parentNode.insertBefore(stage, countdownEl);
    stage.appendChild(countdownEl);

    // Toolbar Header (Only today's active mission, Replay button, and Sound toggle - NO 15-day selector!)
    const controlsBar = document.createElement('div');
    controlsBar.className = 'cd-controls-bar';
    controlsBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span class="cd-theme-badge">🥷 Today's Mission: Shinobi Slash</span>
      </div>
      <div class="cd-actions-group">
        <button type="button" id="cd-replay-btn" class="cd-ctrl-btn" title="Replay Today's 3D Ninja Reveal">
          <span>🎬</span> <span>Replay</span>
        </button>
        <button type="button" id="cd-sound-toggle-btn" class="cd-ctrl-btn" title="Toggle Sound Effects">
          <span id="cd-sound-icon">${isMuted ? '🔇' : '🔊'}</span>
        </button>
      </div>
    `;
    countdownEl.insertBefore(controlsBar, countdownEl.firstChild);

    // Canvas Particle Layer
    const canvas = document.createElement('canvas');
    canvas.className = 'cd-fx-canvas';
    countdownEl.appendChild(canvas);
    stage.engine = createParticleEngine(canvas);
    countdownEl.engine = stage.engine;

    // Curved Slash Flash Arc
    const slashArc = document.createElement('div');
    slashArc.className = 'cd-slash-curved-arc';
    slashArc.innerHTML = `
      <svg viewBox="0 0 500 80" fill="none" preserveAspectRatio="none">
        <path d="M10 65 Q250 15 490 55" stroke="url(#slashGlow)" stroke-width="7" stroke-linecap="round"/>
        <path d="M10 65 Q250 15 490 55" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        <defs>
          <linearGradient id="slashGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
            <stop offset="25%" stop-color="#60a5fa" stop-opacity="0.9"/>
            <stop offset="70%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    `;
    countdownEl.appendChild(slashArc);

    // Full Ninja Actor
    const ninjaActor = document.createElement('div');
    ninjaActor.className = 'cd-ninja-actor';
    ninjaActor.innerHTML = FULL_NINJA_SVG;
    countdownEl.appendChild(ninjaActor);

    // Parchment Paper Sheet Cover (Top & Bottom halves interlocking with jagged torn edges)
    let paperCover = null;

    function buildParchmentCover() {
      if (paperCover) paperCover.remove();
      paperCover = document.createElement('div');
      paperCover.className = 'cd-parchment-sheet';
      paperCover.innerHTML = `
        <div class="cd-torn-top">
          <div class="cd-paper-content-top">
            <span class="cd-wax-seal">⛩️ CLASSIFIED • PRELIMS 2026</span>
            <div style="font-size: 1.15rem; font-weight: 800; color: #1e293b; letter-spacing: 0.5px; margin-top: 2px;">
              ⏳ DAYS REMAINING SEALED
            </div>
          </div>
        </div>
        <div class="cd-torn-bottom">
          <div class="cd-paper-content-bottom">
            <div style="font-size: 0.82rem; color: #78350f; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">
              Shinobi Strike Authorization Required
            </div>
          </div>
        </div>
      `;
      countdownEl.appendChild(paperCover);
    }

    // --- EXECUTE THE NINJA BLADE DRAW & PAPER TEAR SEQUENCE ---
    function playNinjaAnimation() {
      stage.engine.clear();
      slashArc.classList.remove('cd-slash-curved-active');
      countdownEl.classList.add('countdown-3d-active');

      buildParchmentCover();

      // Reset Ninja position & state
      ninjaActor.style.opacity = '1';
      ninjaActor.style.left = '-180px';
      ninjaActor.style.transform = 'scale(0.85) translateY(20px)';
      const bladeGleam = ninjaActor.querySelector('.cd-blade-gleam');
      if (bladeGleam) bladeGleam.classList.remove('cd-gleam-active');

      // 1. Shadow Leap: Ninja enters from the left (0.0s - 0.45s)
      setTimeout(() => {
        ninjaActor.style.transform = 'translate3d(180px, -10px, 40px) scale(1.05)';
      }, 80);

      // 2. Hand grips and draws Katana blade out of sheath (0.55s - 0.95s)
      setTimeout(() => {
        playSound('blade_draw');
        if (bladeGleam) bladeGleam.classList.add('cd-gleam-active');
        // Sparkle glint at the tip of blade
        stage.engine.burstTornPaper(ninjaActor.offsetLeft + 140, ninjaActor.offsetTop + 40, 10);
      }, 550);

      // 3. Dynamic Lunge & Curved Katana Slash across the paper (1.05s)
      setTimeout(() => {
        playSound('slash_whoosh');
        ninjaActor.style.transform = 'translate3d(360px, -20px, 70px) scale(1.15) rotate(6deg)';
        slashArc.classList.add('cd-slash-curved-active');
      }, 1050);

      // 4. THE PAPER TEAR (1.20s): Paper rips in two halves with realistic fibers!
      setTimeout(() => {
        playSound('paper_tear');
        if (paperCover) paperCover.classList.add('cd-paper-ripped');
        // Burst realistic torn paper scraps and blade sparks
        stage.engine.burstTornPaper(countdownEl.offsetWidth * 0.5, countdownEl.offsetHeight * 0.5, 45);
      }, 1200);

      // 5. Ninja recovery stance and exit into shadows (1.65s)
      setTimeout(() => {
        ninjaActor.style.transform = 'translate3d(620px, -40px, 90px) scale(0.9) rotate(15deg)';
        ninjaActor.style.opacity = '0';
      }, 1650);

      // 6. Number reveal celebration (1.95s)
      setTimeout(() => {
        countdownEl.classList.remove('countdown-3d-active');
        playSound('reveal_chime');
        const totalNum = document.getElementById('cd-total');
        const effNum = document.getElementById('cd-effective');
        if (totalNum) totalNum.classList.add('cd-num-glow');
        if (effNum) effNum.classList.add('cd-num-glow');
        setTimeout(() => {
          if (totalNum) totalNum.classList.remove('cd-num-glow');
          if (effNum) effNum.classList.remove('cd-num-glow');
        }, 1000);
      }, 1950);
    }

    // Attach Replay Listener
    const replayBtn = document.getElementById('cd-replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        playNinjaAnimation();
      });
    }

    // Attach Sound Toggle Listener
    const soundBtn = document.getElementById('cd-sound-toggle-btn');
    const soundIcon = document.getElementById('cd-sound-icon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('cd_sound_muted', String(isMuted));
        if (soundIcon) soundIcon.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Auto-run animation once per day on first visit
    const todayStr = new Date().toISOString().split('T')[0];
    const lastSeen = localStorage.getItem('cd_ninja_seen_date');
    if (lastSeen !== todayStr) {
      localStorage.setItem('cd_ninja_seen_date', todayStr);
      setTimeout(() => {
        playNinjaAnimation();
      }, 350);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DCountdown);
  } else {
    init3DCountdown();
  }
})();
