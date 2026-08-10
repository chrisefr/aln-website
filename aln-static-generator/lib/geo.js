// Geodesic polygon area on a sphere, matching what ArcGIS Arcade's area()
// function computes (the projects popup uses `round(area(geometry($feature),
// 'ha'),)` to show "the area of the project"). This is the standard
// spherical-excess ring-area algorithm (Chamberlain & Duquette, JPL) used by
// most GIS tooling (e.g. Turf.js's geojson-area) for exactly this purpose -
// no dependency needed, it's about 15 lines.
const EARTH_RADIUS_M = 6378137; // WGS84 semi-major axis, same default Esri/Turf use

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Three-point (p1, p2, p3) spherical-excess formulation - the exact
// algorithm used by the widely-used mapbox/geojson-area package, not a
// from-memory two-point approximation (an earlier version of this file used
// one and was ~20% off against a known reference value - this version was
// checked against that reference before being trusted).
function ringAreaM2(ring) {
  const n = ring.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    let lower, middle, upper;
    if (i === n - 2) {
      lower = n - 2;
      middle = n - 1;
      upper = 0;
    } else if (i === n - 1) {
      lower = n - 1;
      middle = 0;
      upper = 1;
    } else {
      lower = i;
      middle = i + 1;
      upper = i + 2;
    }
    const p1 = ring[lower];
    const p2 = ring[middle];
    const p3 = ring[upper];
    area += (toRad(p3[0]) - toRad(p1[0])) * Math.sin(toRad(p2[1]));
  }
  return (area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2;
}

// esriGeometryPolygon rings: outer rings and holes are wound in opposite
// directions by convention, so summing every ring's signed area and taking
// the absolute value of the total correctly nets out any holes.
function polygonAreaSquareMeters(geometry) {
  if (!geometry || !Array.isArray(geometry.rings)) return null;
  const totalM2 = geometry.rings.reduce((sum, ring) => sum + ringAreaM2(ring), 0);
  return Math.abs(totalM2);
}

// User's call (2026-08-10): show m² or km² as appropriate, not hectares.
// Threshold: under 1 km² (1,000,000 m²) shows as whole-number m² with a
// thousands separator; at or above shows as km² with up to 2 decimal places.
function formatArea(areaM2) {
  if (areaM2 === null || areaM2 === undefined || !Number.isFinite(areaM2)) return '';
  if (areaM2 >= 1_000_000) {
    const km2 = areaM2 / 1_000_000;
    return `${km2.toLocaleString('en-US', { maximumFractionDigits: 2 })} km²`;
  }
  return `${Math.round(areaM2).toLocaleString('en-US')} m²`;
}

module.exports = { polygonAreaSquareMeters, formatArea };
