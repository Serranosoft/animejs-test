export function createTacticalMarker(type, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Estilo neón con glow
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 8;
  
  if (type === 'air') {
    // Retícula externa (círculo discontinuo)
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Silueta detallada del caza
    ctx.beginPath();
    ctx.moveTo(32, 14); // Nariz
    ctx.lineTo(38, 26); // Ala derecha entrada
    ctx.lineTo(50, 38); // Ala derecha punta
    ctx.lineTo(36, 38); // Ala derecha base
    ctx.lineTo(36, 46); // Estabilizador derecho punta
    ctx.lineTo(32, 43); // Cola centro
    ctx.lineTo(28, 46); // Estabilizador izquierdo punta
    ctx.lineTo(28, 38); // Ala izquierda base
    ctx.lineTo(14, 38); // Ala izquierda punta
    ctx.lineTo(26, 26); // Ala izquierda entrada
    ctx.closePath();
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.stroke();
  } else if (type === 'land') {
    // Retícula externa (esquinas de encuadre cuadradas)
    ctx.beginPath();
    ctx.moveTo(10, 18); ctx.lineTo(10, 10); ctx.lineTo(18, 10);
    ctx.moveTo(54, 18); ctx.lineTo(54, 10); ctx.lineTo(46, 10);
    ctx.moveTo(10, 46); ctx.lineTo(10, 54); ctx.lineTo(18, 54);
    ctx.moveTo(54, 46); ctx.lineTo(54, 54); ctx.lineTo(46, 54);
    ctx.stroke();
    
    // Silueta detallada de tanque de combate
    ctx.beginPath();
    ctx.rect(30, 12, 4, 10); // Cañón largo
    ctx.rect(24, 22, 16, 8);  // Torreta
    ctx.rect(18, 30, 28, 12); // Chasis
    ctx.rect(15, 28, 5, 16);  // Oruga izq
    ctx.rect(44, 28, 5, 16);  // Oruga der
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.stroke();
  } else if (type === 'sea') {
    // Retícula externa (círculo sólido fino y círculo de mira interior)
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.stroke();
    
    // Silueta isométrica 3D de un contenedor logístico de carga
    // Cara superior
    ctx.beginPath();
    ctx.moveTo(32, 18);
    ctx.lineTo(45, 24);
    ctx.lineTo(32, 30);
    ctx.lineTo(19, 24);
    ctx.closePath();
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.stroke();
    
    // Cara izquierda sombreada
    ctx.beginPath();
    ctx.moveTo(19, 24);
    ctx.lineTo(32, 30);
    ctx.lineTo(32, 44);
    ctx.lineTo(19, 38);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.stroke();
    
    // Cara derecha sombreada oscura
    ctx.beginPath();
    ctx.moveTo(32, 30);
    ctx.lineTo(45, 24);
    ctx.lineTo(45, 38);
    ctx.lineTo(32, 44);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.stroke();
  } else if (type === 'port') {
    // Retícula externa (mira con círculos concéntricos)
    ctx.beginPath();
    ctx.arc(32, 32, 23, 0, Math.PI * 2);
    ctx.stroke();
    
    // Silueta de ancla táctica
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.moveTo(32, 18); ctx.lineTo(32, 42); // Shank
    ctx.moveTo(22, 24); ctx.lineTo(42, 24); // Stock
    ctx.stroke();
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(32, 14, 4, 0, Math.PI * 2); // Ring
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(32, 34, 12, 0.1 * Math.PI, 0.9 * Math.PI); // Flukes arc
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(17, 34); ctx.lineTo(13, 29); ctx.lineTo(21, 29); ctx.closePath(); // Left fluke tip
    ctx.moveTo(47, 34); ctx.lineTo(51, 29); ctx.lineTo(43, 29); ctx.closePath(); // Right fluke tip
    ctx.fillStyle = colorHex;
    ctx.fill();
  }
  
  return canvas;
}
