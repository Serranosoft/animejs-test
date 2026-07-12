import { bases, routes } from './config.js';
import { createTacticalMarker } from './markers.js';
import { initTerrain, terrainActive, base3DObjects, load3DDetailLayers } from './terrain.js';
import {
  addLogEntry,
  initIncidentFeed,
  initZuluClock,
  initTimeline,
  triggerHUDTransition,
  navigateToHangar3D
} from './hud.js';

// =========================================================================
// INICIALIZACIÓN DE CESIUMJS (Tactical Dark Map)
// =========================================================================
const viewer = new Cesium.Viewer('cesiumContainer', {
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  requestRenderMode: true,
  maximumRenderTimeChange: 0.0,
  baseLayer: false
});

// OPTIMIZACIÓN RENDIMIENTO: Reducir resolución del renderizado WebGL (mejora de FPS en iframes)
viewer.resolutionScale = 0.90;

// Capa de Mapa Vectorial Oscuro Táctico (CartoDB Dark Matter - Libre, rápido y de estética militar unificada)
const darkMatterProvider = new Cesium.UrlTemplateImageryProvider({
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  subdomains: ['a', 'b', 'c', 'd'],
  credit: 'Map tiles by CartoDB, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
  maximumLevel: 18
});
const satelliteLayer = viewer.imageryLayers.addImageryProvider(darkMatterProvider);
// Ajuste sutil de brillo y contraste para el plano oscuro vectorial
satelliteLayer.brightness = 0.70;
satelliteLayer.contrast = 1.15;

// Estilo global de la escena (Cero Relieve, Elipsoide Liso)
viewer.scene.globe.enableLighting = false; // Desactivar luces complejas para maximizar FPS
viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#03060d');
viewer.scene.skyAtmosphere.show = false; // Desactivar atmósfera para velocidad táctica
viewer.scene.fog.enabled = false; // Desactivar niebla
viewer.shadows = false; // Desactivar sombras globales

// Colección de puntos RFID de alto rendimiento (WebGL Draw Call único que elimina el lag de entidades)
const rfidCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());

// Inicializar el relieve 3D público y objetos locales
initTerrain(viewer, addLogEntry);
initLayerControls();

// Inicializar Gráficos Globales ECharts y Listado Auto-scroll
initGlobalCharts();
startCriticalStockScroll();

// Vista Inicial: España desde el Espacio (Alineado a vista de Globo Terráqueo completo)
const viewGlobalDest = Cesium.Cartesian3.fromDegrees(-3.70, 40.41, 9000000.0);
viewer.camera.setView({
  destination: viewGlobalDest,
  orientation: {
    heading: 0.0,
    pitch: Cesium.Math.toRadians(-90.0), // Nadir, apuntando directamente abajo
    roll: 0.0
  }
});

// Dibujar rutas en Cesium (clampToGround false y altura 200m para dibujar sobre elipsoide plano)
for (const [name, pts] of Object.entries(routes)) {
  const coords = [];
  pts.forEach(pt => {
    coords.push(pt.lon, pt.lat, 200);
  });
  
  const routeColor = name === 'alfa' ? '#10b981' : (name === 'bravo' ? '#00f0ff' : '#f59e0b');

  viewer.entities.add({
    name: `Ruta ${name.toUpperCase()}`,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(coords),
      width: 2.5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(routeColor).withAlpha(0.55),
        dashLength: 14,
        gapColor: Cesium.Color.TRANSPARENT
      }),
      clampToGround: false // Modificado para que sea visible en elipsoide liso
    }
  });
}

// Convoys Militares (Posición elevada a 500m y sin clampToGround)
const convoys = [
  {
    id: 'convoy_alfa',
    name: 'Convoy Terrestre Alfa-2 (Armada)',
    route: 'alfa',
    color: '#10b981',
    points: routes.alfa,
    entity: null
  },
  {
    id: 'convoy_bravo',
    name: 'Convoy Terrestre Bravo-1 (Tierra)',
    route: 'bravo',
    color: '#00f0ff',
    points: routes.bravo,
    entity: null
  },
  {
    id: 'convoy_charlie',
    name: 'Convoy Terrestre Charlie-3 (Aire)',
    route: 'charlie',
    color: '#ef4444',
    points: routes.charlie,
    entity: null
  }
];

// Instanciar convoyes
convoys.forEach(convoy => {
  convoy.entity = viewer.entities.add({
    id: convoy.id,
    name: convoy.name,
    position: Cesium.Cartesian3.fromDegrees(convoy.points[0].lon, convoy.points[0].lat, 500),
    point: {
      pixelSize: 11,
      color: Cesium.Color.fromCssColorString(convoy.color),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2
    },
    label: {
      text: convoy.name.split(' (')[0],
      font: 'bold 8px JetBrains Mono',
      fillColor: Cesium.Color.fromCssColorString(convoy.color),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: new Cesium.Cartesian2(0, 12)
    }
  });
});

// Marcadores tácticos estáticos elevados a 800m y sin clampToGround
const baseEntities = {};
for (const [id, base] of Object.entries(bases)) {
  baseEntities[id] = viewer.entities.add({
    id: id,
    name: base.name,
    position: Cesium.Cartesian3.fromDegrees(base.lon, base.lat, 800),
    billboard: {
      image: createTacticalMarker(base.type, base.color),
      scale: 0.60
    },
    label: {
      text: base.title,
      font: 'bold 10px JetBrains Mono',
      fillColor: Cesium.Color.fromCssColorString(base.color),
      outlineColor: Cesium.Color.fromCssColorString('#03060d'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -25)
    }
  });
}

// =========================================================================
// INTERACTIVIDAD Y SELECCIÓN DE ACTIVOS (ZOOM TÁCTICO)
// =========================================================================
let viewState = 'GLOBAL'; // 'GLOBAL' o 'LOCAL'
let activeBaseId = null;

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((click) => {
  const pickedObject = viewer.scene.pick(click.position);
  if (Cesium.defined(pickedObject) && pickedObject.id) {
    const baseId = pickedObject.id.id;
    if (bases[baseId]) {
      triggerTacticalZoom(baseId);
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// =========================================================================
// SELECCIÓN Y HIGHLIGHT DE EDIFICIOS (PLANO DE AUDITORÍA)
// =========================================================================
let hoveredBuilding = null;
const tooltip = document.getElementById('tacticalTooltip');

const tooltipHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
tooltipHandler.setInputAction((movement) => {
  if (viewState !== 'LOCAL') {
    tooltip.classList.add('hidden');
    return;
  }
  
  const pickedObject = viewer.scene.pick(movement.endPosition);
  if (Cesium.defined(pickedObject) && pickedObject.id) {
    let entity = pickedObject.id;
    // Si es un sub-objeto o placa de cimentación, resolver hacia el edificio principal
    if (entity.parentEntity) {
      entity = entity.parentEntity;
    }
    
    if (entity.buildingData) {
      // Si pasamos a otro edificio, resetear el anterior y limpiar sus tags
      if (hoveredBuilding && hoveredBuilding !== entity) {
        resetEntityGroupHighlight(hoveredBuilding);
        hideInternalTags();
        slideEntityGroup(hoveredBuilding, 0.0); // Bajar edificio anterior
      }
      
      hoveredBuilding = entity;
      highlightEntityGroup(entity);
      showInternalTags(entity);
      slideEntityGroup(entity, 15.0); // Desplazar hacia arriba el edificio (Efecto explosión)
      
      // Mostrar y posicionar el tooltip
      tooltip.classList.remove('hidden');
      tooltip.style.left = (movement.endPosition.x + 15) + 'px';
      tooltip.style.top = (movement.endPosition.y + 15) + 'px';
      
      document.getElementById('tooltip-title').innerText = entity.name;
      document.getElementById('tooltip-body').innerHTML = `
        <div class="text-[10px] space-y-0.5 font-mono">
          <div><span class="text-slate-500 font-bold">ESTADO:</span> <span class="${entity.buildingData.alert ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}">${entity.buildingData.status}</span></div>
          <div><span class="text-slate-500 font-bold">OCUPACIÓN:</span> <span class="text-white">${entity.buildingData.occupation}</span></div>
          <div><span class="text-slate-500 font-bold">DISPOSITIVOS:</span> <span class="text-white">${entity.buildingData.rfid}</span></div>
        </div>
        ${getInventoryBarsHTML(entity.name)}
      `;
      return;
    }
  }
  
  // Si no apuntamos a ningún edificio de auditoría, limpiar highlight y tags
  if (hoveredBuilding) {
    resetEntityGroupHighlight(hoveredBuilding);
    hideInternalTags();
    slideEntityGroup(hoveredBuilding, 0.0); // Bajar edificio suavemente
    hoveredBuilding = null;
  }
  tooltip.classList.add('hidden');
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

function getInventoryBarsHTML(name) {
  if (name.includes('Hangar 3') || name.includes('Taller Mecánico')) {
    return `
      <div class="mt-2 pt-2 border-t border-cyan-500/20 space-y-1.5 font-mono w-[180px]">
        <div class="text-[8px] text-slate-500 font-bold uppercase">REPUESTOS CRÍTICOS:</div>
        <div>
          <div class="flex justify-between text-[8px] mb-0.5 text-slate-300">
            <span>Filtros Motor F-982</span>
            <span class="text-red-400 font-bold">15% (ALERTA)</span>
          </div>
          <div class="w-full bg-slate-950 h-1 border border-slate-800 rounded-sm overflow-hidden">
            <div class="bg-red-500 h-full shadow-[0_0_5px_rgba(239,68,68,0.5)]" style="width: 15%"></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-[8px] mb-0.5 text-slate-300">
            <span>Repuestos R-110</span>
            <span class="text-emerald-400 font-bold">75% (OK)</span>
          </div>
          <div class="w-full bg-slate-950 h-1 border border-slate-800 rounded-sm overflow-hidden">
            <div class="bg-emerald-400 h-full" style="width: 75%"></div>
          </div>
        </div>
      </div>
    `;
  } else if (name.includes('Hangar 1') || name.includes('Hangar 2') || name.includes('Hangar Blindados') || name.includes('Almacén')) {
    return `
      <div class="mt-2 pt-2 border-t border-cyan-500/20 space-y-1.5 font-mono w-[180px]">
        <div class="text-[8px] text-slate-500 font-bold uppercase">STOCK ALMACÉN:</div>
        <div>
          <div class="flex justify-between text-[8px] mb-0.5 text-slate-300">
            <span>Placas Blindadas A</span>
            <span class="text-emerald-400 font-bold">85% (OK)</span>
          </div>
          <div class="w-full bg-slate-950 h-1 border border-slate-800 rounded-sm overflow-hidden">
            <div class="bg-emerald-400 h-full" style="width: 85%"></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-[8px] mb-0.5 text-slate-300">
            <span>Fluido Hidráulico</span>
            <span class="text-emerald-400 font-bold">90% (OK)</span>
          </div>
          <div class="w-full bg-slate-950 h-1 border border-slate-800 rounded-sm overflow-hidden">
            <div class="bg-emerald-400 h-full" style="width: 90%"></div>
          </div>
        </div>
      </div>
    `;
  }
  return '';
}

function showInternalTags(mainEntity) {
  rfidCollection.removeAll();
  
  const showRfid = document.getElementById('layer-rfid').checked;
  if (!showRfid || !mainEntity.buildingData || !mainEntity.buildingData.rfidCount) return;
  
  const count = mainEntity.buildingData.rfidCount;
  const lon = mainEntity.buildingData.lon;
  const lat = mainEntity.buildingData.lat;
  const height = mainEntity.buildingData.height;
  const baseElevation = mainEntity.buildingData.baseElevation;
  const isAlert = mainEntity.buildingData.alert;
  
  const color = Cesium.Color.fromCssColorString(isAlert ? '#ef4444' : '#00f0ff');
  const outlineColor = Cesium.Color.fromCssColorString(isAlert ? '#fca5a5' : '#e0f7fa');
  
  // Generar enjambre RFID dinámico de alta velocidad
  for (let i = 0; i < count; i++) {
    const dLon = (Math.random() - 0.5) * 0.00045;
    const dLat = (Math.random() - 0.5) * 0.00025;
    const zOffset = 1.5 + Math.random() * (height - 3.0);
    
    rfidCollection.add({
      position: Cesium.Cartesian3.fromDegrees(lon + dLon, lat + dLat, baseElevation + zOffset),
      color: color,
      outlineColor: outlineColor,
      outlineWidth: 1.2,
      pixelSize: 4.5
    });
  }
  viewer.scene.requestRender();
}

function hideInternalTags() {
  rfidCollection.removeAll();
  viewer.scene.requestRender();
}

let activeSlideAnimations = new Map();

function slideEntityGroup(mainEntity, targetOffset) {
  if (activeSlideAnimations.has(mainEntity)) {
    activeSlideAnimations.get(mainEntity).pause();
  }
  
  const currentOffset = { val: mainEntity.currentOffsetVal || 0.0 };
  
  const anim = anime({
    targets: currentOffset,
    val: targetOffset,
    duration: 500,
    easing: 'easeOutCubic',
    update: () => {
      const zOffset = currentOffset.val;
      mainEntity.currentOffsetVal = zOffset;
      
      const lon = mainEntity.buildingData.lon;
      const lat = mainEntity.buildingData.lat;
      const baseElevation = mainEntity.buildingData.baseElevation;
      const height = mainEntity.buildingData.height;
      
      // Update main entity position (taking into account offset)
      mainEntity.position = Cesium.Cartesian3.fromDegrees(lon, lat, baseElevation + height / 2 + zOffset);
      
      // Update all detail sub-entities (except base tactical plates!)
      viewer.entities.values.forEach(ent => {
        if (ent.parentEntity === mainEntity) {
          if (ent.name && ent.name.includes('Base Táctica')) return;
          
          const basePos = ent.position.getValue(Cesium.JulianDate.now());
          if (!basePos) return;
          
          const carto = Cesium.Cartographic.fromCartesian(basePos);
          const subLon = Cesium.Math.toDegrees(carto.longitude);
          const subLat = Cesium.Math.toDegrees(carto.latitude);
          
          if (ent.startHeight === undefined) {
            ent.startHeight = carto.height - zOffset;
          }
          ent.position = Cesium.Cartesian3.fromDegrees(subLon, subLat, ent.startHeight + zOffset);
        }
      });
      viewer.scene.requestRender();
    }
  });
  
  activeSlideAnimations.set(mainEntity, anim);
}

function highlightEntityGroup(mainEntity) {
  const showGrid = document.getElementById('layer-grid').checked;
  const color = Cesium.Color.fromCssColorString(mainEntity.buildingData.highlightColor);
  
  if (showGrid) {
    const activeMaterial = new Cesium.GridMaterialProperty({
      color: color,
      cellAlpha: 0.45,
      lineCount: new Cesium.Cartesian2(6, 6),
      lineThickness: new Cesium.Cartesian2(2.5, 2.5)
    });
    
    if (mainEntity.box) {
      mainEntity.box.material = activeMaterial;
    } else if (mainEntity.cylinder) {
      mainEntity.cylinder.material = activeMaterial;
    }
  } else {
    const activeMaterial = color.withAlpha(0.65);
    if (mainEntity.box) {
      mainEntity.box.material = activeMaterial;
    } else if (mainEntity.cylinder) {
      mainEntity.cylinder.material = activeMaterial;
    }
  }
  
  // Rejilla/Color de alta visibilidad para sub-piezas
  const showSubGrid = showGrid;
  const activeSubMaterial = showSubGrid ? new Cesium.GridMaterialProperty({
    color: color.withAlpha(0.9),
    cellAlpha: 0.30,
    lineCount: new Cesium.Cartesian2(4, 4),
    lineThickness: new Cesium.Cartesian2(2.0, 2.0)
  }) : color.withAlpha(0.55);

  viewer.entities.values.forEach(ent => {
    if (ent.parentEntity === mainEntity) {
      if (ent.box) {
        ent.box.material = ent.name.includes('Base') ? ent.box.material : activeSubMaterial;
      } else if (ent.cylinder) {
        ent.cylinder.material = activeSubMaterial;
      }
    }
  });
}

function resetEntityGroupHighlight(mainEntity) {
  if (mainEntity.box) {
    mainEntity.box.material = mainEntity.originalColor;
  } else if (mainEntity.cylinder) {
    mainEntity.cylinder.material = mainEntity.originalColor;
  }
  
  // Reestablecer sub-objetos
  const color = Cesium.Color.fromCssColorString(mainEntity.buildingData.highlightColor);
  const showGrid = document.getElementById('layer-grid').checked;
  
  const subMaterial = showGrid ? new Cesium.GridMaterialProperty({
    color: color.withAlpha(0.7),
    cellAlpha: 0.1,
    lineCount: new Cesium.Cartesian2(4, 4),
    lineThickness: new Cesium.Cartesian2(1.0, 1.0)
  }) : color.withAlpha(0.25);

  viewer.entities.values.forEach(ent => {
    if (ent.parentEntity === mainEntity) {
      if (ent.name.includes('Base')) return;
      if (ent.box) {
        ent.box.material = subMaterial;
      } else if (ent.cylinder) {
        ent.cylinder.material = subMaterial;
      }
    }
  });
}

// =========================================================================
// TERMINAL LOGS EN TIEMPO REAL (DENSIDAD DE DATOS SATURNAL)
// =========================================================================
let terminalInterval = null;
const logLines = [
  "Scan Hangar A: 452 tags verificados.",
  "ALERTA: Discrepancia detectada en Palet 04B - Ubicación desconocida.",
  "Ping de seguridad en puerta norte: OK.",
  "Sensor RFID Hangar 3: Recibiendo telemetría...",
  "Actualizando registro local en base de datos central.",
  "Sincronizando inventario con Puerto Seco Zaragoza.",
  "Lectura RFID lote LOT-M9: Trazabilidad completa.",
  "Alerta: Nivel de temperatura nominal en Hangar 2.",
  "Escaneo de contenedores Zaragoza: 24 recibidos.",
  "Control patrimonial: Guadarrama XII verificado."
];

function startTerminalLogs() {
  const container = document.getElementById('tactical-terminal-container');
  const feed = document.getElementById('terminal-log-feed');
  container.classList.remove('hidden');
  setTimeout(() => container.classList.remove('opacity-0'), 50);
  
  feed.innerHTML = '';
  
  if (terminalInterval) clearInterval(terminalInterval);
  
  terminalInterval = setInterval(() => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const randomLine = logLines[Math.floor(Math.random() * logLines.length)];
    const isAlert = randomLine.includes('ALERTA') || randomLine.includes('Alerta');
    
    const logClass = isAlert ? 'text-red-400 font-bold' : 'text-cyan-400/80';
    const indicator = isAlert ? '⚠️' : '⚓';
    
    const item = document.createElement('div');
    item.className = `${logClass} leading-normal border-b border-cyan-950/20 pb-0.5`;
    item.innerHTML = `[${timestamp}] ${indicator} ${randomLine}`;
    
    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;
    
    while (feed.childNodes.length > 40) {
      feed.removeChild(feed.firstChild);
    }
  }, 750);
}

function stopTerminalLogs() {
  const container = document.getElementById('tactical-terminal-container');
  container.classList.add('opacity-0');
  setTimeout(() => container.classList.add('hidden'), 300);
  if (terminalInterval) {
    clearInterval(terminalInterval);
    terminalInterval = null;
  }
}

// =========================================================================
// CONTROLES DE CAPAS Y TELEMETRÍA (CONMUTACIÓN DINÁMICA)
// =========================================================================
function initLayerControls() {
  document.getElementById('layer-terrain').addEventListener('change', (e) => {
    e.target.checked = false; // Forzar desmarcado
    addLogEntry('📡 SISTEMA: Relieve topográfico no disponible en modo Capa Vectorial Táctica.', 'info');
  });
  
  document.getElementById('layer-grid').addEventListener('change', (e) => {
    const showGrid = e.target.checked;
    viewer.entities.values.forEach(ent => {
      if (ent.buildingData) {
        const color = Cesium.Color.fromCssColorString(ent.buildingData.highlightColor);
        if (showGrid) {
          ent.box ? (ent.box.material = ent.originalColor) : (ent.cylinder.material = ent.originalColor);
        } else {
          const solidMaterial = color.withAlpha(0.35);
          ent.box ? (ent.box.material = solidMaterial) : (ent.cylinder.material = solidMaterial);
        }
      }
    });
    addLogEntry(`📡 SISTEMA: Rejillas holográficas ${showGrid ? 'activadas' : 'desactivadas'}.`, 'info');
  });
  
  document.getElementById('layer-rfid').addEventListener('change', (e) => {
    const showRfid = e.target.checked;
    rfidCollection.show = showRfid;
    addLogEntry(`📡 SISTEMA: Capa RFID ${showRfid ? 'activada' : 'desactivada'}.`, 'info');
  });
  
  document.getElementById('layer-perimeter').addEventListener('change', (e) => {
    const showPerimeter = e.target.checked;
    viewer.entities.values.forEach(ent => {
      if (ent.name && ent.name.includes('Perímetro Táctico')) {
        ent.show = showPerimeter && (viewState === 'LOCAL' && ent.name.includes(activeBaseId));
      }
    });
    addLogEntry(`📡 SISTEMA: Perímetros de seguridad ${showPerimeter ? 'activados' : 'desactivadas'}.`, 'info');
  });
}

function triggerTacticalZoom(baseId) {
  const base = bases[baseId];
  activeBaseId = baseId;
  viewState = 'LOCAL';
  
  addLogEntry(`🛸 ENFOQUE: Cámara de Reconocimiento apuntando a ${base.title}.`, 'info');
  addLogEntry(`🛸 ENFOQUE: Iniciando aproximación en picado táctico (3.5 segundos)...`, 'info');

  // Habilitar escaneo táctico: atenuar la capa vectorial base a modo fantasma y apagar la atmósfera
  satelliteLayer.brightness = 0.15;
  satelliteLayer.contrast = 1.0;
  viewer.scene.skyAtmosphere.show = false;

  // Ocultar etiquetas de otras bases para mantener consistencia de datos
  for (const [id, entity] of Object.entries(baseEntities)) {
    if (id !== baseId) {
      entity.show = false;
    }
  }

  // Activar únicamente los objetos 3D y el perímetro de esta base en particular
  const showPerimeter = document.getElementById('layer-perimeter').checked;
  for (const [key, list] of Object.entries(base3DObjects)) {
    if (key === baseId) {
      list.forEach(obj => {
        if (obj.name && obj.name.includes('Perímetro Táctico')) {
          obj.show = showPerimeter;
        } else {
          obj.show = true;
        }
      });
    } else {
      list.forEach(obj => obj.show = false);
    }
  }

  // Cero Elevación: Altitud cenital fija sobre globo liso
  const baseElevation = 0.0;
  const targetAltitude = 650.0;

  // CORRECCIÓN GEOMÉTRICA DE VUELO: Offset a la cámara al suroeste (-0.002, -0.008) para centrar la base en pantalla a -35º de inclinación
  const cameraLon = base.lon - 0.002;
  const cameraLat = base.lat - 0.008;

  // Animación de la cámara Cesium
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(cameraLon, cameraLat, targetAltitude),
    orientation: {
      heading: Cesium.Math.toRadians(15.0),
      pitch: Cesium.Math.toRadians(-35.0), // 35º inclinación militar cenital
      roll: 0.0
    },
    duration: 3.5,
    complete: async () => {
      addLogEntry(`🛸 SISTEMA: Zoom establecido. Altitud sensor: ${Math.round(targetAltitude)} m MSL (650 m AGL).`, 'success');
      await load3DDetailLayers(addLogEntry);
    }
  });

  // Lanzar logs de terminal en bucle rápido
  startTerminalLogs();

  // Actualizar datos del HUD local izquierdo (KPIs y descripciones específicas por base)
  const hudLeftContainer = document.getElementById('hud-local-left');
  
  let kpisHtml = '';
  if (baseId === 'base_albacete') {
    kpisHtml = `
      <div class="hud-card hud-card-error">
        <div class="hud-card-corners"></div>
        <div class="flex items-center justify-between border-b border-red-500/20 pb-2 mb-3">
          <span class="text-xs font-bold uppercase tracking-widest">[AUDITORÍA TÁCTICA]</span>
          <span class="text-[9px] px-1.5 py-0.5 border border-red-500/40 bg-red-950/20 text-red-400 rounded animate-pulse">ALERTA CRÍTICA</span>
        </div>
        
        <div class="space-y-3.5 text-xs">
          <div>
            <h2 class="text-sm font-bold text-white uppercase tracking-wide">${base.name}</h2>
            <p class="text-[10px] text-slate-400">Ala 14 - Albacete (Fuerza Aérea)</p>
          </div>
          
          <!-- KPIs de Nivel Superior -->
          <div class="grid grid-cols-2 gap-2 text-center font-mono">
            <div class="p-2 border border-red-500/25 bg-red-950/20 rounded">
              <span class="block text-[8px] text-red-400 font-bold uppercase">Pérdidas Lote</span>
              <span class="text-base font-bold text-red-400">12.5%</span>
            </div>
            <div class="p-2 border border-slate-800 bg-slate-950/40 rounded">
              <span class="block text-[8px] text-slate-500 uppercase">Alertas RFID</span>
              <span class="text-base font-bold text-red-400 animate-pulse">3 Activas</span>
            </div>
          </div>
          
          <!-- Desglose de Edificios en la Base -->
          <div class="space-y-1.5">
            <span class="block text-[9px] text-slate-500 uppercase tracking-wider font-bold">Distribución de Infraestructura</span>
            <div class="space-y-1 font-mono text-[10px]">
              <div class="flex justify-between items-center p-1 bg-red-950/10 border border-red-500/20 rounded">
                <span class="text-slate-300">● Hangar 3 (Filtros)</span>
                <span class="text-red-400 font-bold">ALERTA (85%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Hangar 2 (Logística)</span>
                <span class="text-emerald-400 font-bold">OK (60%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Hangar 1 (Mantenimiento)</span>
                <span class="text-emerald-400 font-bold">OK (70%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Torre de Control</span>
                <span class="text-emerald-400 font-bold">OK (100%)</span>
              </div>
            </div>
          </div>
          
          <!-- Mensaje de dolor -->
          <div class="p-2.5 border border-red-500/30 bg-red-950/20 rounded text-[9px] leading-relaxed text-slate-300 font-mono">
            <span class="font-bold text-red-400 flex items-center gap-1 mb-0.5">
              <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
              DISCREPANCIA DETECTADA
            </span>
            Pérdida de trazabilidad en lote de filtros de motor (REF: F-982). Pulse "Localizar Material" para iniciar el gemelo digital del hangar.
          </div>
        </div>
      </div>
    `;
  } else if (baseId === 'base_madrid') {
    kpisHtml = `
      <div class="hud-card hud-card-error">
        <div class="hud-card-corners"></div>
        <div class="flex items-center justify-between border-b border-red-500/20 pb-2 mb-3">
          <span class="text-xs font-bold uppercase tracking-widest">[AUDITORÍA TÁCTICA]</span>
          <span class="text-[9px] px-1.5 py-0.5 border border-red-500/40 bg-red-950/20 text-red-400 rounded animate-pulse">ALERTA CRÍTICA</span>
        </div>
        
        <div class="space-y-3.5 text-xs">
          <div>
            <h2 class="text-sm font-bold text-white uppercase tracking-wide">${base.name}</h2>
            <p class="text-[10px] text-slate-400">División Acorazada Guadarrama XII (Tierra)</p>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-center font-mono">
            <div class="p-2 border border-red-500/25 bg-red-950/20 rounded">
              <span class="block text-[8px] text-red-400 font-bold uppercase">Pérdidas Lote</span>
              <span class="text-base font-bold text-red-400">8.4%</span>
            </div>
            <div class="p-2 border border-slate-800 bg-slate-950/40 rounded">
              <span class="block text-[8px] text-slate-500 uppercase">Alertas RFID</span>
              <span class="text-base font-bold text-red-400 animate-pulse">3 Activas</span>
            </div>
          </div>
          
          <div class="space-y-1.5">
            <span class="block text-[9px] text-slate-500 uppercase tracking-wider font-bold">Distribución de Infraestructura</span>
            <div class="space-y-1 font-mono text-[10px]">
              <div class="flex justify-between items-center p-1 bg-red-950/10 border border-red-500/20 rounded">
                <span class="text-slate-300">● Taller Mecánico (Repuestos)</span>
                <span class="text-red-400 font-bold">ALERTA (45%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Hangar Blindados A</span>
                <span class="text-emerald-400 font-bold">OK (95%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Hangar Blindados B</span>
                <span class="text-emerald-400 font-bold">OK (90%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Oficinas Estado Mayor</span>
                <span class="text-emerald-400 font-bold">OK (100%)</span>
              </div>
            </div>
          </div>
          
          <div class="p-2.5 border border-red-500/30 bg-red-950/20 rounded text-[9px] leading-relaxed text-slate-300 font-mono">
            <span class="font-bold text-red-400 flex items-center gap-1 mb-0.5">
              <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
              DISCREPANCIA DETECTADA
            </span>
            Pérdida de trazabilidad detectada en lote de repuestos de blindados. Pulse "Localizar Material" para iniciar el gemelo digital del taller.
          </div>
        </div>
      </div>
    `;
  } else if (baseId === 'base_zaragoza') {
    kpisHtml = `
      <div class="hud-card">
        <div class="hud-card-corners"></div>
        <div class="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
          <span class="text-xs font-bold uppercase tracking-widest">[AUDITORÍA TÁCTICA]</span>
          <span class="text-[9px] px-1.5 py-0.5 border border-emerald-500/40 bg-emerald-950/20 text-emerald-400 rounded">NOMINAL</span>
        </div>
        
        <div class="space-y-3.5 text-xs">
          <div>
            <h2 class="text-sm font-bold text-white uppercase tracking-wide">${base.name}</h2>
            <p class="text-[10px] text-slate-400">Logística Central Terrestre (Armada Secano)</p>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-center font-mono">
            <div class="p-2 border border-slate-800 bg-slate-950/40 rounded">
              <span class="block text-[8px] text-slate-500 uppercase">Pérdidas Lote</span>
              <span class="text-base font-bold text-emerald-400">0.0%</span>
            </div>
            <div class="p-2 border border-slate-800 bg-slate-950/40 rounded">
              <span class="block text-[8px] text-slate-500 uppercase">Alertas RFID</span>
              <span class="text-base font-bold text-emerald-400">0 Activas</span>
            </div>
          </div>
          
          <div class="space-y-1.5">
            <span class="block text-[9px] text-slate-500 uppercase tracking-wider font-bold">Distribución de Infraestructura</span>
            <div class="space-y-1 font-mono text-[10px]">
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Área Consolidación Táctica</span>
                <span class="text-emerald-400 font-bold">OK (63%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Almacén Central</span>
                <span class="text-emerald-400 font-bold">OK (82%)</span>
              </div>
              <div class="flex justify-between items-center p-1 bg-slate-950/40 border border-slate-800 rounded">
                <span class="text-slate-400">● Muelle de Carga</span>
                <span class="text-emerald-400 font-bold">OK (75%)</span>
              </div>
            </div>
          </div>
          
          <div class="p-2.5 border border-emerald-500/20 bg-emerald-950/10 rounded text-[9px] leading-relaxed text-slate-400 font-mono">
            <span class="font-bold text-emerald-400 flex items-center gap-1 mb-0.5">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
              CONSOLIDACIÓN COMPLETADA
            </span>
            Puerto seco operativo. Recepción de contenedores en tránsito. Firma digital RFID validada.
          </div>
        </div>
      </div>
    `;
  }
  hudLeftContainer.innerHTML = kpisHtml;

  // Actualizar texto descriptivo en el panel derecho según el tipo de base y su contexto
  const rightDesc = document.querySelector('#hud-local-right p');
  let descriptionText = '';
  
  if (base.type === 'air') {
    descriptionText = 'Usted se encuentra inspeccionando visualmente los hangares militares y las líneas de vuelo en 3D de la base aérea. Puede alternar a los módulos de inventario 3D o retornar a la vista orbital.';
  } else if (base.type === 'land') {
    descriptionText = 'Usted se encuentra inspeccionando visualmente los hangares de blindados e infraestructuras en 3D del acuartelamiento terrestre. Puede alternar a los módulos de inventario 3D o retornar a la vista orbital.';
  } else if (base.type === 'sea') {
    descriptionText = 'Usted se encuentra inspeccionando visualmente la terminal de carga y los almacenes de consolidación en 3D del hub logístico terrestre. Puede alternar a los módulos de inventario 3D o retornar a la vista orbital.';
  }
  rightDesc.innerText = descriptionText;

  // Ajustar color y funcionalidad del botón Entrar a Hangar del HUD derecho
  const hangarBtn = document.querySelector('#hud-local-right button');
  if (baseId === 'base_albacete' || baseId === 'base_madrid') {
    hangarBtn.className = 'w-full py-2 bg-gradient-to-r from-red-950/40 to-red-900/30 hover:from-red-900/40 hover:to-red-800/40 border border-red-500/40 text-red-300 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300';
    hangarBtn.innerHTML = baseId === 'base_albacete' ? '<i data-lucide="box" class="w-4 h-4"></i>Localizar Material (Hangar 3D)' : '<i data-lucide="box" class="w-4 h-4"></i>Localizar Material (Taller 3D)';
  } else {
    hangarBtn.className = 'w-full py-2 bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-500/25 text-cyan-400 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300';
    hangarBtn.innerHTML = '<i data-lucide="box" class="w-4 h-4"></i>Entrar a Hangar (Almacén 3D)';
  }

  lucide.createIcons();
  triggerHUDTransition('LOCAL');
}

function zoomOutToGlobal() {
  if (viewState === 'GLOBAL') return;
  viewState = 'GLOBAL';
  activeBaseId = null;

  addLogEntry('🛸 ENFOQUE: Retornando cámara a órbita espacial geoestacionaria.', 'info');

  // Ocultar tags y parar logs de la terminal
  hideInternalTags();
  stopTerminalLogs();

  // Reestablecer mapa satelital orbital completo y corona atmosférica
  satelliteLayer.brightness = 0.70;
  satelliteLayer.contrast = 1.15;

  // Volver a mostrar todos los pines de las bases en el mapa global
  for (const entity of Object.values(baseEntities)) {
    entity.show = true;
  }

  // Ocultar todos los objetos 3D locales de todas las bases y bajar cualquier edificio deslizado
  for (const list of Object.values(base3DObjects)) {
    list.forEach(obj => {
      obj.show = false;
      if (obj.buildingData) {
        slideEntityGroup(obj, 0.0);
      }
    });
  }

  // Vuelo de retorno
  viewer.camera.flyTo({
    destination: viewGlobalDest,
    orientation: {
      heading: 0.0,
      pitch: Cesium.Math.toRadians(-90.0),
      roll: 0.0
    },
    duration: 3.0,
    complete: () => {
      addLogEntry('🛸 SISTEMA: Vista global reestablecida a 1,400 km.', 'success');
    }
  });

  triggerHUDTransition('GLOBAL');
}

// =========================================================================
// INICIALIZACIÓN DE GRÁFICOS DE CONTROL GLOBAL (ECHARTS)
// =========================================================================
let availabilityGauge = null;
let cargoBarChart = null;

function initGlobalCharts() {
  // A. Dial de Disponibilidad Operativa Global
  const gaugeDom = document.getElementById('availability-gauge');
  if (gaugeDom) {
    availabilityGauge = echarts.init(gaugeDom);
    availabilityGauge.setOption({
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          center: ['50%', '75%'],
          radius: '100%',
          min: 0,
          max: 100,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 5,
              color: [
                [0.3, '#ef4444'],
                [0.7, '#f59e0b'],
                [1, '#10b981']
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,.7l12,80.1c1.2,7.8-3.9,15-11.7,16.2C6.2,98.2,0,92.1,0,84.3L12.8,.7z',
            length: '70%',
            width: 3,
            offsetCenter: [0, '5%'],
            itemStyle: {
              color: '#00f0ff'
            }
          },
          axisTick: { length: 2, lineStyle: { color: 'auto', width: 1 } },
          splitLine: { length: 5, lineStyle: { color: 'auto', width: 1.5 } },
          axisLabel: { color: '#64748b', fontSize: 7, distance: -12 },
          title: { show: false },
          detail: {
            fontSize: 16,
            offsetCenter: [0, '5%'],
            valueAnimation: true,
            formatter: '{value}%',
            color: '#10b981',
            fontFamily: 'JetBrains Mono',
            fontWeight: 'bold'
          },
          data: [{ value: 94.2, name: 'OPERATIVO' }]
        }
      ]
    });
  }

  // B. Volumen de Carga Activa (Gráfico de Barras)
  const barDom = document.getElementById('cargo-bar-chart');
  if (barDom) {
    cargoBarChart = echarts.init(barDom);
    cargoBarChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        top: '5%',
        left: '2%',
        right: '8%',
        bottom: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(6, 182, 212, 0.05)' } },
        axisLabel: { color: '#64748b', fontSize: 7, fontFamily: 'JetBrains Mono' }
      },
      yAxis: {
        type: 'category',
        data: ['ALB-ZAR', 'ZAR-MAD', 'MAD-ALB'],
        axisLabel: { color: '#00f0ff', fontSize: 7, fontFamily: 'JetBrains Mono' },
        axisLine: { lineStyle: { color: 'rgba(6, 182, 212, 0.1)' } }
      },
      series: [
        {
          type: 'bar',
          data: [28, 45, 35],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'rgba(0, 240, 255, 0.05)' },
              { offset: 1, color: 'rgba(0, 240, 255, 0.65)' }
            ]),
            borderRadius: [0, 2, 2, 0]
          },
          label: {
            show: true,
            position: 'right',
            color: '#ffffff',
            fontSize: 7,
            fontFamily: 'JetBrains Mono',
            formatter: '{c} Tn'
          }
        }
      ]
    });
  }

  // C. Escuchador de redimensionamiento
  window.addEventListener('resize', () => {
    if (availabilityGauge) availabilityGauge.resize();
    if (cargoBarChart) cargoBarChart.resize();
  });
}

// =========================================================================
// LISTADO DE STOCK CRÍTICO CON SCROLL AUTOMÁTICO
// =========================================================================
const criticalItems = [
  { ref: 'F-982', desc: 'Filtro Turbina Eurofighter', qty: 2, min: 10, base: 'Albacete' },
  { ref: 'R-110', desc: 'Placa Freno Blindado Pizarro', qty: 4, min: 15, base: 'Madrid' },
  { ref: 'C-04B', desc: 'Fusible Electrónico Radar', qty: 1, min: 5, base: 'Zaragoza' },
  { ref: 'H-921', desc: 'Fluido Hidráulico Actuadores', qty: 12, min: 50, base: 'Albacete' },
  { ref: 'M-303', desc: 'Inyector Combustible Diesel', qty: 3, min: 12, base: 'Madrid' },
  { ref: 'S-712', desc: 'Mazo Cables Telemetría', qty: 5, min: 20, base: 'Zaragoza' }
];

function startCriticalStockScroll() {
  const container = document.getElementById('critical-stock-scroll');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Duplicar elementos para scroll infinito
  const items = [...criticalItems, ...criticalItems, ...criticalItems];
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'p-2 border border-red-500/20 bg-red-950/10 rounded flex flex-col gap-0.5 mb-1.5';
    div.innerHTML = `
      <div class="flex justify-between items-center text-red-400 font-bold">
        <span>REF: ${item.ref} (${item.base.toUpperCase()})</span>
        <span>${item.qty} / ${item.min} U</span>
      </div>
      <div class="text-[8px] text-slate-400">${item.desc}</div>
    `;
    container.appendChild(div);
  });
  
  let scrollSpeed = 0.45;
  let scrollPos = 0;
  
  setInterval(() => {
    scrollPos += scrollSpeed;
    container.scrollTop = scrollPos;
    
    // Si sobrepasamos un tercio de la altura del scroll, reiniciar a 0
    if (scrollPos >= container.scrollHeight / 3) {
      scrollPos = 0;
      container.scrollTop = 0;
    }
  }, 35);
}
