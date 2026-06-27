const fs = require('fs');
const path = require('path');

console.log('Loading madrid.geojson...');
const filePath = path.join(__dirname, 'madrid.geojson');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

console.log('Counting highway types...');
const counts = {};
data.features.forEach(f => {
  if (f.properties && f.properties.highway && f.geometry && f.geometry.type === 'LineString') {
    const hw = f.properties.highway;
    counts[hw] = (counts[hw] || 0) + 1;
  }
});
console.log('Counts:', counts);

// Queremos un conjunto que represente las vías principales reales de tráfico
// Incluimos 'tertiary' y calles residenciales de más de 150m para dar vida a las calles intermedias.
const allowedHighways = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);

const filteredFeatures = data.features.filter(f => {
  if (!f.properties || !f.geometry) return false;
  if (f.geometry.type !== 'LineString') return false;
  
  const hw = f.properties.highway;
  if (allowedHighways.has(hw)) return true;
  
  if (hw === 'residential') {
    const path = f.geometry.coordinates;
    let totalLen = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalLen += Math.hypot(path[i+1][0] - path[i][0], path[i+1][1] - path[i][1]);
    }
    return totalLen > 0.0015; // aprox 150m
  }
  
  return false;
});

console.log(`Original features: ${data.features.length}`);
console.log(`Filtered features (including tertiary and residential > 150m): ${filteredFeatures.length}`);

const output = {
  type: 'FeatureCollection',
  features: filteredFeatures
};

const outPath = path.join(__dirname, 'madrid_roads.geojson');
fs.writeFileSync(outPath, JSON.stringify(output), 'utf8');
console.log('Saved filtered roads to madrid_roads.geojson');
