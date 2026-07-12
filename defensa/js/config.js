export const initialLogs = [
  { time: '18:42', text: '⚠️ Rotura de stock: Filtros de motor en Base Aérea Albacete (Hangar 3).', type: 'error' },
  { time: '18:15', text: '📦 Convoy terrestre "Alfa-2" en ruta hacia el Puerto Seco de Zaragoza.', type: 'info' },
  { time: '17:50', text: '📡 Calibración de sistema de radar completada en Base El Goloso.', type: 'success' },
  { time: '17:10', text: '⚓ Consolidación de contenedores de Armada completada en Zaragoza.', type: 'info' },
  { time: '16:30', text: '🚛 Convoy "Bravo-1" en tránsito por Autovía A-3 (Tierra).', type: 'info' },
  { time: '15:45', text: '🛠️ Mantenimiento preventivo en caza C.16 Eurofighter (Albacete).', type: 'success' },
  { time: '14:20', text: '📦 Recepción de material de repuestos mecánicos en Hangar 3 (Albacete).', type: 'info' },
  { time: '13:00', text: '⚓ Solicitud de aprovisionamiento de Armada (Puerto Seco Zaragoza) iniciada.', type: 'info' }
];

export const bases = {
  base_albacete: {
    id: 'base_albacete',
    name: 'Base Aérea de Los Llanos (Albacete)',
    type: 'air',
    lon: -1.86,
    lat: 38.92,
    elevation: 702.0, // Elevación en metros
    color: '#f59e0b', // Alerta en ámbar
    title: 'BASE DE LOS LLANOS',
    alertText: '2 Alertas Críticas: Rotura de Stock de Filtros de Turbina.',
    details: 'Hangar 3 - Sección Aire. Pérdida de trazabilidad detectada.'
  },
  base_madrid: {
    id: 'base_madrid',
    name: 'Base Militar El Goloso (Madrid)',
    type: 'land',
    lon: -3.69,
    lat: 40.54,
    elevation: 730.0, // Elevación en metros
    color: '#ef4444', // Alerta roja por taller acorazado
    title: 'BASE EL GOLOSO',
    alertText: '1 Alerta Crítica: Discrepancia en Taller Mecánico.',
    details: 'Pérdida de trazabilidad detectada en repuestos de blindados.'
  },
  base_zaragoza: {
    id: 'base_zaragoza',
    name: 'Hub de Aprovisionamiento Terrestre (Zaragoza)',
    type: 'sea',
    lon: -0.89,
    lat: 41.66,
    elevation: 260.0, // Elevación en metros
    color: '#10b981', // Operativo en verde (Armada secano / Puerto Seco)
    title: 'HUB ARMADA ZARAGOZA',
    alertText: '0 Alertas Críticas: Operativo.',
    details: 'Puerto seco de la Armada. Acondicionamiento y envío de contenedores.'
  }
};

export const routes = {
  alfa: [
    { lon: -0.89, lat: 41.66 }, // Zaragoza
    { lon: -2.30, lat: 41.10 }, // Punto intermedio A-2
    { lon: -3.69, lat: 40.54 }  // Madrid
  ],
  bravo: [
    { lon: -3.69, lat: 40.54 }, // Madrid
    { lon: -2.70, lat: 39.70 }, // Punto intermedio A-3
    { lon: -1.86, lat: 38.92 }  // Albacete
  ],
  charlie: [
    { lon: -1.86, lat: 38.92 }, // Albacete
    { lon: -1.30, lat: 40.30 }, // Punto intermedio Teruel/N-330
    { lon: -0.89, lat: 41.66 }  // Zaragoza
  ]
};
