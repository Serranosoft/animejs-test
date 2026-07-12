export let terrainActive = false;
export const base3DObjects = {
  base_albacete: [],
  base_madrid: [],
  base_zaragoza: []
};

export async function initTerrain(viewer, addLogEntryCallback) {
  // Cero Relieve: El globo es un elipsoide liso para un rendimiento máximo libre de latencia
  viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  terrainActive = false;
  if (addLogEntryCallback) {
    addLogEntryCallback('📡 SISTEMA: Modo Capa Vectorial Táctica Activado (Cero Relieve).', 'success');
  }
  
  // Inicializar los modelos 3D locales en todas las bases terrestres
  initAllLocal3DObjects(viewer);
}

function createBuildingEntity(viewer, name, type, lon, lat, baseElevation, heightOffset, dimensions, colorHex, rfid, occupation, status, alert, baseId) {
  const position = Cesium.Cartesian3.fromDegrees(lon, lat, baseElevation + heightOffset);
  const color = Cesium.Color.fromCssColorString(colorHex);
  
  // A. MATERIAL DE REJILLA PROCEDURAL HOLOGRÁFICA
  let materialProperty;
  if (alert) {
    // Rejilla parpadeante en advertencia para llamar la atención del auditor
    const blinkColor = new Cesium.CallbackProperty(() => {
      const ms = new Date().getMilliseconds();
      const intensity = 0.5 + 0.5 * Math.sin((ms / 1000) * Math.PI * 2);
      return Cesium.Color.fromCssColorString(colorHex).withAlpha(intensity);
    }, false);
    
    const blinkCell = new Cesium.CallbackProperty(() => {
      const ms = new Date().getMilliseconds();
      return 0.08 + 0.12 * Math.sin((ms / 1000) * Math.PI * 2);
    }, false);

    materialProperty = new Cesium.GridMaterialProperty({
      color: blinkColor,
      cellAlpha: blinkCell,
      lineCount: new Cesium.Cartesian2(6, 6),
      lineThickness: new Cesium.Cartesian2(1.5, 1.5)
    });
  } else {
    materialProperty = new Cesium.GridMaterialProperty({
      color: color.withAlpha(0.85),
      cellAlpha: 0.15,
      lineCount: new Cesium.Cartesian2(6, 6),
      lineThickness: new Cesium.Cartesian2(1.5, 1.5)
    });
  }

  const entityData = {
    name: name,
    position: position,
    show: false,
    buildingData: {
      status: status,
      occupation: occupation,
      rfid: rfid,
      alert: alert,
      highlightColor: colorHex,
      lon: lon,
      lat: lat,
      height: dimensions.height || 10.0,
      baseElevation: baseElevation,
      rfidCount: rfid === 'N/A' ? 0 : 15
    }
  };

  if (type === 'box') {
    entityData.box = {
      dimensions: new Cesium.Cartesian3(dimensions.width, dimensions.length, dimensions.height),
      material: materialProperty,
      outline: true,
      outlineColor: color.withAlpha(0.9),
      outlineWidth: 2
    };
  } else if (type === 'cylinder') {
    entityData.cylinder = {
      length: dimensions.height,
      topRadius: dimensions.topRadius,
      bottomRadius: dimensions.bottomRadius,
      material: materialProperty,
      outline: true,
      outlineColor: color.withAlpha(0.9),
      outlineWidth: 2
    };
  }

  const mainEntity = viewer.entities.add(entityData);
  mainEntity.originalColor = materialProperty; // Guardar material para restauración
  
  // Registrar el objeto principal en el listado de visualización local
  base3DObjects[baseId].push(mainEntity);

  // B. PLACA DE CIMENTACIÓN TÁCTICA EN EL SUELO (Anclaje al terreno)
  const isGroundAsset = name === 'Pista de Despegue Principal' || name === 'Muelle de Contenedores Consolidados';
  if (!isGroundAsset) {
    const padWidth = type === 'box' ? dimensions.width + 12.0 : (dimensions.bottomRadius + 4.0) * 2;
    const padLength = type === 'box' ? dimensions.length + 12.0 : (dimensions.bottomRadius + 4.0) * 2;
    
    const padEntity = viewer.entities.add({
      name: `${name} (Base Táctica)`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, baseElevation + 0.1),
      show: false,
      parentEntity: mainEntity,
      box: {
        dimensions: new Cesium.Cartesian3(padWidth, padLength, 0.2),
        material: Cesium.Color.fromCssColorString('#090f1d').withAlpha(0.85),
        outline: true,
        outlineColor: color.withAlpha(0.55),
        outlineWidth: 1.5
      }
    });
    base3DObjects[baseId].push(padEntity);
  }

  // C. COMPONENTES DETALLADOS AUXILIARES (Wireframes de detalle)
  const subMaterial = new Cesium.GridMaterialProperty({
    color: color.withAlpha(0.7),
    cellAlpha: 0.1,
    lineCount: new Cesium.Cartesian2(4, 4),
    lineThickness: new Cesium.Cartesian2(1.0, 1.0)
  });

  if (name.includes('Hangar 3')) {
    const ventEntity = viewer.entities.add({
      name: `${name} (Módulo de Ventilación)`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, baseElevation + dimensions.height + 1.5),
      show: false,
      parentEntity: mainEntity,
      box: {
        dimensions: new Cesium.Cartesian3(18.0, 18.0, 3.0),
        material: materialProperty, // Usa el parpadeante también para el ventilador!
        outline: true,
        outlineColor: color.withAlpha(0.9),
        outlineWidth: 1.5
      }
    });
    base3DObjects[baseId].push(ventEntity);
  } else if (name.includes('Hangar 2')) {
    const annexEntity = viewer.entities.add({
      name: `${name} (Módulo Administrativo)`,
      position: Cesium.Cartesian3.fromDegrees(lon + 0.0003, lat + 0.0002, baseElevation + 4.0),
      show: false,
      parentEntity: mainEntity,
      box: {
        dimensions: new Cesium.Cartesian3(20.0, 20.0, 8.0),
        material: subMaterial,
        outline: true,
        outlineColor: color.withAlpha(0.8),
        outlineWidth: 1.5
      }
    });
    base3DObjects[baseId].push(annexEntity);
  } else if (name.includes('Hangar 1') || name.includes('Taller Mecánico')) {
    const annexEntity = viewer.entities.add({
      name: `${name} (Taller Auxiliar)`,
      position: Cesium.Cartesian3.fromDegrees(lon - 0.0003, lat - 0.0002, baseElevation + 4.0),
      show: false,
      parentEntity: mainEntity,
      box: {
        dimensions: new Cesium.Cartesian3(20.0, 20.0, 8.0),
        material: subMaterial,
        outline: true,
        outlineColor: color.withAlpha(0.8),
        outlineWidth: 1.5
      }
    });
    base3DObjects[baseId].push(annexEntity);
  } else if (name.includes('Torre de Control') || name.includes('Torre de Comunicaciones') || name.includes('Torre de Control de Tráfico')) {
    const cabinEntity = viewer.entities.add({
      name: `${name} (Cabina Táctica)`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, baseElevation + dimensions.height + 2.0),
      show: false,
      parentEntity: mainEntity,
      cylinder: {
        length: 4.0,
        topRadius: dimensions.topRadius + 2.5,
        bottomRadius: dimensions.topRadius - 0.5,
        material: subMaterial,
        outline: true,
        outlineColor: color.withAlpha(0.8),
        outlineWidth: 1.5
      }
    });
    base3DObjects[baseId].push(cabinEntity);

    const antennaEntity = viewer.entities.add({
      name: `${name} (Antena Auxiliar)`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, baseElevation + dimensions.height + 9.0),
      show: false,
      parentEntity: mainEntity,
      cylinder: {
        length: 10.0,
        topRadius: 0.15,
        bottomRadius: 0.15,
        material: subMaterial,
        outline: true,
        outlineColor: color.withAlpha(0.8),
        outlineWidth: 1.0
      }
    });
    base3DObjects[baseId].push(antennaEntity);
  } else if (name.includes('Barracón')) {
    const hvacEntity = viewer.entities.add({
      name: `${name} (Climatización Táctica)`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, baseElevation + dimensions.height + 1.0),
      show: false,
      parentEntity: mainEntity,
      box: {
        dimensions: new Cesium.Cartesian3(10.0, 10.0, 2.0),
        material: subMaterial,
        outline: true,
        outlineColor: color.withAlpha(0.8),
        outlineWidth: 1.2
      }
    });
    base3DObjects[baseId].push(hvacEntity);
  }

  return mainEntity;
}

// D. DIBUJAR PERÍMETRO TÁCTICO DE ZONA MILITAR
function drawBasePerimeter(viewer, baseId, centerLon, centerLat, baseElevation, colorHex) {
  const offsetLon = 0.007;
  const offsetLat = 0.0055;
  const coords = Cesium.Cartesian3.fromDegreesArrayHeights([
    centerLon - offsetLon, centerLat - offsetLat, baseElevation + 5.0,
    centerLon + offsetLon, centerLat - offsetLat, baseElevation + 5.0,
    centerLon + offsetLon, centerLat + offsetLat, baseElevation + 5.0,
    centerLon - offsetLon, centerLat + offsetLat, baseElevation + 5.0,
    centerLon - offsetLon, centerLat - offsetLat, baseElevation + 5.0
  ]);
  
  const perimeter = viewer.entities.add({
    name: 'Perímetro Táctico Zona Militar',
    show: false,
    polyline: {
      positions: coords,
      width: 2.0,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.55),
        dashLength: 12,
        gapColor: Cesium.Color.TRANSPARENT
      }),
      clampToGround: false // Desactivado para forzar renderizado en elipsoide plano
    }
  });
  base3DObjects[baseId].push(perimeter);
}

function initAllLocal3DObjects(viewer) {
  // Elevaciones forzadas a 0 ya que estamos en elipsoide liso de alto rendimiento
  const baseElevation = 0.0;

  // 1. BASE ALBACETE
  drawBasePerimeter(viewer, 'base_albacete', -1.8600, 38.9200, baseElevation, '#ef4444');
  createBuildingEntity(viewer, 'Pista de Despegue Principal', 'box', -1.8600, 38.9180, baseElevation, 0.25, {width: 800, length: 45, height: 0.5}, '#1e293b', 'N/A', '100%', 'Nominal', false, 'base_albacete');
  createBuildingEntity(viewer, 'Hangar 3 (Almacén de Filtros)', 'box', -1.8600, 38.9205, baseElevation, 7.5, {width: 90, length: 50, height: 15}, '#ef4444', '3 Alertas Activas', '85%', 'Alerta de Stock (Crítica)', true, 'base_albacete');
  createBuildingEntity(viewer, 'Hangar 2 (Logística de Repuestos)', 'box', -1.8585, 38.9201, baseElevation, 6.0, {width: 80, length: 45, height: 12}, '#00f0ff', 'OK (350 TAGs)', '60%', 'Nominal', false, 'base_albacete');
  createBuildingEntity(viewer, 'Hangar 1 (Mantenimiento Eurofighters)', 'box', -1.8615, 38.9201, baseElevation, 6.0, {width: 80, length: 45, height: 12}, '#00f0ff', 'OK (142 TAGs)', '70%', 'Nominal', false, 'base_albacete');
  createBuildingEntity(viewer, 'Torre de Control Los Llanos', 'cylinder', -1.8600, 38.9192, baseElevation, 17.5, {topRadius: 4, bottomRadius: 6, height: 35}, '#00f0ff', 'OK', '100%', 'Operativa', false, 'base_albacete');
  createBuildingEntity(viewer, 'Barracón Alpha (Personal)', 'box', -1.8625, 38.9185, baseElevation, 4.0, {width: 45, length: 25, height: 8}, '#10b981', 'OK', '92%', 'Nominal', false, 'base_albacete');
  createBuildingEntity(viewer, 'Barracón Bravo (Personal)', 'box', -1.8575, 38.9185, baseElevation, 4.0, {width: 45, length: 25, height: 8}, '#10b981', 'OK', '88%', 'Nominal', false, 'base_albacete');

  // 2. BASE MADRID
  drawBasePerimeter(viewer, 'base_madrid', -3.6900, 40.5410, baseElevation, '#ef4444'); // Alerta por taller de blindados
  createBuildingEntity(viewer, 'Hangar Blindados A (Vehículos Pizarro)', 'box', -3.6910, 40.5410, baseElevation, 6.0, {width: 90, length: 50, height: 12}, '#00f0ff', 'OK (120 blindados)', '95%', 'Nominal', false, 'base_madrid');
  createBuildingEntity(viewer, 'Hangar Blindados B (Vehículos Leopard)', 'box', -3.6890, 40.5410, baseElevation, 6.0, {width: 90, length: 50, height: 12}, '#00f0ff', 'OK (85 blindados)', '90%', 'Nominal', false, 'base_madrid');
  createBuildingEntity(viewer, 'Taller Mecánico El Goloso', 'box', -3.6900, 40.5420, baseElevation, 7.5, {width: 70, length: 45, height: 15}, '#ef4444', '3 Alertas Activas', '45%', 'Alerta de Stock (Crítica)', true, 'base_madrid');
  createBuildingEntity(viewer, 'Barracones Guadarrama XII', 'box', -3.6920, 40.5395, baseElevation, 4.0, {width: 50, length: 25, height: 8}, '#10b981', 'OK', '92%', 'Nominal', false, 'base_madrid');
  createBuildingEntity(viewer, 'Edificio de Estado Mayor', 'box', -3.6880, 40.5395, baseElevation, 5.0, {width: 40, length: 40, height: 10}, '#10b981', 'OK', '100%', 'Operativo', false, 'base_madrid');
  createBuildingEntity(viewer, 'Torre de Comunicaciones El Goloso', 'cylinder', -3.6900, 40.5400, baseElevation, 17.5, {topRadius: 3, bottomRadius: 5, height: 35}, '#00f0ff', 'OK', '100%', 'Operativa', false, 'base_madrid');

  // 3. BASE ZARAGOZA
  drawBasePerimeter(viewer, 'base_zaragoza', -0.8900, 41.6600, baseElevation, '#10b981');
  createBuildingEntity(viewer, 'Muelle de Contenedores Consolidados', 'box', -0.8900, 41.6600, baseElevation, 0.5, {width: 200, length: 100, height: 1}, '#1e293b', 'N/A', '75%', 'Operativo', false, 'base_zaragoza');
  createBuildingEntity(viewer, 'Almacén Central Zaragoza', 'box', -0.8915, 41.6610, baseElevation, 7.5, {width: 100, length: 60, height: 15}, '#00f0ff', 'OK', '82%', 'Nominal', false, 'base_zaragoza');
  createBuildingEntity(viewer, 'Área de Consolidación Táctica', 'box', -0.8885, 41.6610, baseElevation, 7.5, {width: 100, length: 60, height: 15}, '#00f0ff', 'OK', '63%', 'Nominal', false, 'base_zaragoza');
  createBuildingEntity(viewer, 'Muelle de Carga', 'box', -0.8900, 41.6590, baseElevation, 5.0, {width: 120, length: 30, height: 10}, '#10b981', 'OK (1,200 TAGs)', '75%', 'Nominal', false, 'base_zaragoza');
}

export async function load3DDetailLayers(addLogEntryCallback) {
  if (addLogEntryCallback) {
    addLogEntryCallback('📡 3D - Levantamiento digital de infraestructura (Plan de Auditoría) activo.', 'success');
  }
}
