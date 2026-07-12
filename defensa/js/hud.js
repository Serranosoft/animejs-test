import { initialLogs } from './config.js';

let isPlaying = false;
let simSpeed = 1;
let timelineVal = 50; // Inicia al 50% (14:00)
let animationFrameId = null;
let lastTime = null;

const incidentFeed = document.getElementById('incident-feed');
const timelineSlider = document.getElementById('timeline-slider');
const simulationClock = document.getElementById('simulation-clock');
const playIcon = document.getElementById('play-icon');

export function addLogEntry(text, type = 'info', zuluTime = null) {
  if (!zuluTime) {
    const d = new Date();
    zuluTime = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }
  
  const logDiv = document.createElement('div');
  logDiv.className = 'border-l-2 pl-2 py-0.5 border-cyan-500/40 text-slate-300';
  if (type === 'error') logDiv.className = 'border-l-2 pl-2 py-0.5 border-red-500 bg-red-950/15 text-red-400';
  if (type === 'success') logDiv.className = 'border-l-2 pl-2 py-0.5 border-emerald-500 bg-emerald-950/10 text-emerald-400';
  
  logDiv.innerHTML = `<span class="text-slate-500 font-bold">[${zuluTime}]</span> ${text}`;
  incidentFeed.appendChild(logDiv);
  incidentFeed.scrollTop = incidentFeed.scrollHeight;
}

export function initIncidentFeed() {
  initialLogs.forEach(log => {
    const logDiv = document.createElement('div');
    logDiv.className = 'border-l-2 pl-2 py-0.5 ';
    if (log.type === 'error') {
      logDiv.className += 'border-red-500 bg-red-950/15 text-red-400';
    } else if (log.type === 'success') {
      logDiv.className += 'border-emerald-500 text-emerald-400';
    } else {
      logDiv.className += 'border-cyan-500/40 text-slate-300';
    }
    logDiv.innerHTML = `<span class="text-slate-500 font-bold">[${log.time}]</span> ${log.text}`;
    incidentFeed.appendChild(logDiv);
  });
  incidentFeed.scrollTop = 0;
}

export function initZuluClock() {
  // Reloj Zulu continuo
  setInterval(() => {
    const d = new Date();
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    document.getElementById('zulu-clock').innerText = `${h}:${m}:${s} Z`;
  }, 1000);
}

// Función de interpolación multi-segmento
function interpolatePath(points, pct) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) return points[0];
  
  const totalSegments = points.length - 1;
  const rawProgress = (pct / 100) * totalSegments;
  const segmentIndex = Math.min(Math.floor(rawProgress), totalSegments - 1);
  const segmentPct = rawProgress - segmentIndex;
  
  const start = points[segmentIndex];
  const end = points[segmentIndex + 1];
  
  const lon = start.lon + (end.lon - start.lon) * segmentPct;
  const lat = start.lat + (end.lat - start.lat) * segmentPct;
  
  return { lon, lat };
}

export function initTimeline(viewer, convoys) {
  function updateSimulation(progressVal) {
    timelineSlider.value = progressVal;
    
    // Calcular hora en base al progreso (de 08:00 a 20:00 - rango de 12 horas)
    const startHour = 8;
    const totalHoursRange = 12;
    const decimalHours = startHour + (progressVal / 100) * totalHoursRange;
    const hours = Math.floor(decimalHours);
    const minutes = Math.floor((decimalHours - hours) * 60);
    
    simulationClock.innerText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ZULU`;

    // Mover convoyes
    convoys.forEach(convoy => {
      const pos = interpolatePath(convoy.points, progressVal);
      if (pos && convoy.entity) {
        convoy.entity.position = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, 200);
      }
    });
    
    viewer.scene.requestRender();
  }

  function simLoop(now) {
    if (!isPlaying) return;
    
    const currentTime = now || performance.now();
    
    if (!lastTime) lastTime = currentTime;
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Incrementar progreso (aprox 1.5% por segundo a 1x)
    timelineVal += dt * 1.5 * simSpeed;
    if (timelineVal > 100) {
      timelineVal = 0;
      addLogEntry('📡 SIMULACIÓN: Reinicio de ciclo de tránsito logístico.', 'info');
    }

    updateSimulation(timelineVal);
    animationFrameId = requestAnimationFrame(simLoop);
  }

  function toggleTimelinePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playIcon.setAttribute('data-lucide', 'pause');
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(simLoop);
    } else {
      playIcon.setAttribute('data-lucide', 'play');
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    }
    lucide.createIcons();
  }

  // Bind controls
  document.getElementById('play-btn').addEventListener('click', toggleTimelinePlay);
  timelineSlider.addEventListener('input', (e) => {
    timelineVal = parseFloat(e.target.value);
    updateSimulation(timelineVal);
  });

  const speedButtons = ['speed-1x', 'speed-2x', 'speed-5x'];
  speedButtons.forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', () => {
      const speed = parseInt(btnId.replace('speed-', '').replace('x', ''));
      simSpeed = speed;
      
      // Resetear clases de velocidad
      document.getElementById('speed-1x').className = 'px-1 ' + (speed === 1 ? 'border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 rounded font-bold' : 'rounded');
      document.getElementById('speed-2x').className = 'px-1 ' + (speed === 2 ? 'border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 rounded font-bold' : 'rounded');
      document.getElementById('speed-5x').className = 'px-1 ' + (speed === 5 ? 'border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 rounded font-bold' : 'rounded');
    });
  });

  // Inicializar simulación a las 14:00 (50%)
  updateSimulation(50);
}

// Función Anime.js para las tarjetas HUD
export function triggerHUDTransition(targetContext) {
  if (targetContext === 'LOCAL') {
    // Sacar tarjetas Globales
    anime({
      targets: '.hud-global',
      translateX: (el) => el.id.includes('left') ? -400 : 400,
      opacity: 0,
      duration: 400,
      easing: 'easeInQuad',
      complete: () => {
        // Asegurar visibilidad
        document.querySelectorAll('.hud-global').forEach(el => el.classList.add('hidden'));
        
        const localLeft = document.getElementById('hud-local-left');
        const localRight = document.getElementById('hud-local-right');
        localLeft.classList.remove('hidden');
        localRight.classList.remove('hidden');

        // Introducir tarjetas Locales
        anime({
          targets: '.hud-local',
          translateX: (el) => el.id.includes('left') ? [-200, 0] : [200, 0],
          opacity: [0, 1],
          duration: 500,
          easing: 'easeOutCubic'
        });
      }
    });
  } else {
    // Sacar tarjetas Locales
    anime({
      targets: '.hud-local',
      translateX: (el) => el.id.includes('left') ? -400 : 400,
      opacity: 0,
      duration: 400,
      easing: 'easeInQuad',
      complete: () => {
        document.querySelectorAll('.hud-local').forEach(el => el.classList.add('hidden'));
        
        const globalLeft = document.getElementById('hud-global-left');
        const globalRight = document.getElementById('hud-global-right');
        globalLeft.classList.remove('hidden');
        globalRight.classList.remove('hidden');

        // Introducir tarjetas Globales
        anime({
          targets: '.hud-global',
          translateX: (el) => el.id.includes('left') ? [-200, 0] : [200, 0],
          opacity: [0, 1],
          duration: 500,
          easing: 'easeOutCubic'
        });
      }
    });
  }
}

export function navigateToHangar3D() {
  addLogEntry('📡 SISTEMA: Solicitando acceso al servidor 3D de inventario...', 'info');
  setTimeout(() => {
    // Redirigir a overview para simular entrar a otro panel del demo
    window.location.href = '/overview.html';
  }, 1500);
}
