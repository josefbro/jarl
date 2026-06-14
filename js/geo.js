// ============================================================
//  JARL — geo: Mercator-projektion, GeoJSON-parser, regioner
//  Läser riktig geografi (lng/lat) och projicerar till världsrymd
//  (0..WORLD_W × 0..WORLD_H). Voronoi-regioner kring städernas
//  verkliga lägen, begränsade och klippta mot kusten. Ingen DOM.
// ============================================================

const GEO = (function () {
  const D2R = Math.PI / 180;
  const mercY = lat => Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2));

  const B = CONFIG.RENDER_BOUNDS;
  const mxW = B.w * D2R, mxE = B.e * D2R;
  const myN = mercY(B.n), myS = mercY(B.s);
  const projW = mxE - mxW, projH = myN - myS;
  const WORLD_W = CONFIG.WORLD_W;
  const WORLD_H = Math.round(WORLD_W * projH / projW);

  function project(lng, lat) {
    return {
      x: (lng * D2R - mxW) / projW * WORLD_W,
      y: (myN - mercY(lat)) / projH * WORLD_H,
    };
  }
  function invert(x, y) {
    const mx = mxW + x / WORLD_W * projW;
    const my = myN - y / WORLD_H * projH;
    return { lng: mx / D2R, lat: (2 * Math.atan(Math.exp(my)) - Math.PI / 2) / D2R };
  }

  let landWorld = [];          // [{outer:[[x,y]...], holes:[[...]]}]
  const seedW = {};            // id -> {x,y}
  const CELLS = {};            // id -> regionpolygon (världskoord)
  const CENTROID = {};

  // ---- geometri ----
  function pointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function onLand(x, y) {
    for (const poly of landWorld) {
      if (!pointInRing(x, y, poly.outer)) continue;
      let hole = false;
      for (const h of poly.holes) if (pointInRing(x, y, h)) { hole = true; break; }
      if (!hole) return true;
    }
    return false;
  }
  // klipp polygon mot halvplanet (X-px)*nx+(Y-py)*ny <= 0
  function clipLine(poly, px, py, nx, ny) {
    const side = p => (p[0] - px) * nx + (p[1] - py) * ny;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = side(a), db = side(b);
      if (da <= 0) out.push(a);
      if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    return out;
  }
  function polyCentroid(poly) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
      a += f; cx += (poly[j][0] + poly[i][0]) * f; cy += (poly[j][1] + poly[i][1]) * f;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-6) { let mx = 0, my = 0; poly.forEach(p => { mx += p[0]; my += p[1]; }); return [mx / poly.length, my / poly.length]; }
    return [cx / (6 * a), cy / (6 * a)];
  }

  function buildRegions() {
    const seeds = PROVINCES.map(p => ({ id: p.id, x: seedW[p.id].x, y: seedW[p.id].y }));
    const R = CONFIG.REGION_RADIUS;
    const pad = 200;
    seeds.forEach(s => {
      let cell = [[-pad, -pad], [WORLD_W + pad, -pad], [WORLD_W + pad, WORLD_H + pad], [-pad, WORLD_H + pad]];
      // Voronoi: klipp mot bisektorerna mot alla andra städer
      seeds.forEach(o => {
        if (o.id === s.id) return;
        const mx = (s.x + o.x) / 2, my = (s.y + o.y) / 2;
        cell = clipLine(cell, mx, my, o.x - s.x, o.y - s.y);
      });
      // begränsa till en oktagon med radie R (så fjärran land förblir grått)
      for (let k = 0; k < 8; k++) {
        const ang = k * Math.PI / 4, nx = Math.cos(ang), ny = Math.sin(ang);
        cell = clipLine(cell, s.x + R * nx, s.y + R * ny, nx, ny);
      }
      CELLS[s.id] = cell;
      CENTROID[s.id] = cell.length >= 3 ? polyCentroid(cell) : [s.x, s.y];
    });
  }

  function setData(geojson) {
    landWorld = [];
    (geojson.features || []).forEach(f => {
      const g = f.geometry; if (!g) return;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      polys.forEach(rings => {
        const pr = rings.map(ring => ring.map(c => { const w = project(c[0], c[1]); return [w.x, w.y]; }));
        if (pr.length && pr[0].length >= 3) landWorld.push({ outer: pr[0], holes: pr.slice(1) });
      });
    });
    PROVINCES.forEach(p => { seedW[p.id] = project(p.lng, p.lat); });
    buildRegions();
  }

  return {
    WORLD_W, WORLD_H,
    project, invert, setData, onLand,
    seedOf: id => seedW[id],
    cellOf: id => CELLS[id],
    centroidOf: id => CENTROID[id],
    land: () => landWorld,
    regionAt(x, y) {
      if (!onLand(x, y)) return null;
      let best = null, bd = CONFIG.REGION_RADIUS * CONFIG.REGION_RADIUS;
      PROVINCES.forEach(p => { const s = seedW[p.id]; const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y); if (d < bd) { bd = d; best = p.id; } });
      return best;
    },
    _ring: pointInRing,
  };
})();
