// ============================================================
//  JARL — kartrendering på canvas
//  Total War-stil: ifyllda regioner (Voronoi-celler) med gränser,
//  illustrerad terräng (gräs, skog, flod, broar) och städer.
// ============================================================

const Render = (function () {
  let canvas, ctx, dpr = 1;
  let scale = 1, ox = 0, oy = 0;
  let cssW = 0, cssH = 0;

  const CELLS = {};       // provins-id -> regionpolygon (världskoord)
  const CENTROID = {};    // provins-id -> [cx, cy]

  // ---------- geometri ----------
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  // klipp polygon mot halvplanet av punkter närmare frö S än O (perpendikulär bisektor)
  function clipHalf(poly, sx, sy, oxp, oyp) {
    const mx = (sx + oxp) / 2, my = (sy + oyp) / 2, nx = oxp - sx, ny = oyp - sy;
    const side = p => (p[0] - mx) * nx + (p[1] - my) * ny;   // <=0 => närmare S (behåll)
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = side(a), db = side(b);
      if (da <= 0) out.push(a);
      if ((da <= 0) !== (db <= 0)) {
        const t = da / (da - db);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
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
    if (Math.abs(a) < 1e-6) {
      let mx = 0, my = 0; poly.forEach(p => { mx += p[0]; my += p[1]; });
      return [mx / poly.length, my / poly.length];
    }
    return [cx / (6 * a), cy / (6 * a)];
  }

  // skärning mellan två segment; returnerar punkt eller null
  function segInt(ax, ay, bx, by, cx, cy, dx, dy) {
    const r1 = bx - ax, r2 = by - ay, s1 = dx - cx, s2 = dy - cy;
    const den = r1 * s2 - r2 * s1;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((cx - ax) * s2 - (cy - ay) * s1) / den;
    const u = ((cx - ax) * r2 - (cy - ay) * r1) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return [ax + t * r1, ay + t * r2];
  }

  function buildRegions() {
    const byLand = {};
    PROVINCES.forEach(p => { (byLand[p.land] = byLand[p.land] || []).push(p); });
    Object.keys(byLand).forEach(land => {
      const base = LANDS[land].poly;
      const seeds = byLand[land];
      seeds.forEach(p => {
        let cell = base.map(pt => [pt[0], pt[1]]);
        seeds.forEach(o => { if (o.id !== p.id) cell = clipHalf(cell, p.x, p.y, o.x, o.y); });
        CELLS[p.id] = cell;
        CENTROID[p.id] = polyCentroid(cell);
      });
    });
  }

  // ---------- determinism (skog mm.) ----------
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rnd(seed) {
    let t = (seed + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  // ---------- transform ----------
  function attach(c) {
    canvas = c;
    ctx = c.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  }
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    cssW = r.width; cssH = r.height;
    if (cssW === 0 || cssH === 0) return;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = Math.min(cssW / CONFIG.WORLD_W, cssH / CONFIG.WORLD_H);
    ox = (cssW - CONFIG.WORLD_W * scale) / 2;
    oy = (cssH - CONFIG.WORLD_H * scale) / 2;
  }
  const w2s = (x, y) => ({ x: x * scale + ox, y: y * scale + oy });
  const s2w = (x, y) => ({ x: (x - ox) / scale, y: (y - oy) / scale });

  // ---------- picking ----------
  function regionAt(x, y) {
    for (const id in CELLS) if (pointInPoly(x, y, CELLS[id])) return id;
    return null;
  }
  function pickProvince(sx, sy) {
    const wp = s2w(sx, sy);
    const id = regionAt(wp.x, wp.y);
    return id ? Engine.prov(id) : null;
  }
  function validTargets(selId) {
    const res = {};
    if (!selId) return res;
    const p = Engine.prov(selId);
    if (!p || p.owner !== 'player' || p.acted || p.garrison <= 0) return res;
    Engine.neighbors(selId).forEach(n => {
      res[n.id] = (Engine.prov(n.id).owner === 'player') ? 'friend' : 'enemy';
    });
    return res;
  }

  // ---------- ritprimitiver ----------
  function pathPolyW(poly) {
    poly.forEach((pt, i) => { const s = w2s(pt[0], pt[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.closePath();
  }
  function tri(x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  const GRASS = ['#7aa047', '#86a94f', '#6f9740', '#80a44a'];
  function grassFor(id) { return GRASS[hash(id) % GRASS.length]; }

  // ---------- huvudritning ----------
  function draw(now) {
    if (!ctx || cssW === 0) return;
    const t = (now || 0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    drawSea(t);
    Object.keys(LANDS).forEach(drawLand);
    drawHighlights(t);
    drawConnections(t);
    Object.values(Engine.state.provinces).forEach(drawCity);
    Object.values(Engine.state.provinces).forEach(drawLabel);
  }

  function drawSea(t) {
    const g = ctx.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, '#2b6e86'); g.addColorStop(1, '#1c4f63');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
    // stiltje-vågor
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1.5;
    const step = 46 * scale;
    for (let yy = (t * 6 % step) - step; yy < cssH; yy += step) {
      for (let xx = 0; xx < cssW; xx += step) {
        ctx.beginPath(); ctx.arc(xx + (Math.floor(yy / step) % 2 ? step / 2 : 0), yy, 5 * scale, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      }
    }
  }

  function drawLand(land) {
    const info = LANDS[land];
    const seeds = PROVINCES.filter(p => p.land === land);

    // skugga under landmassan (djup)
    ctx.save();
    ctx.fillStyle = 'rgba(10,25,30,0.35)';
    ctx.beginPath();
    info.poly.forEach((pt, i) => { const s = w2s(pt[0], pt[1]); const x = s.x + 5, y = s.y + 7; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // gräs + ägartint per region
    seeds.forEach(p => {
      const cell = CELLS[p.id]; if (!cell || cell.length < 3) return;
      ctx.beginPath(); pathPolyW(cell);
      ctx.fillStyle = grassFor(p.id); ctx.fill();
      const f = Engine.fac(Engine.prov(p.id).owner);
      if (f.kind !== 'neutral') { ctx.save(); ctx.globalAlpha = 0.34; ctx.fillStyle = f.color; ctx.fill(); ctx.restore(); }
    });

    // terräng-dekor (skog/berg) klippt till landmassan
    ctx.save();
    ctx.beginPath(); pathPolyW(info.poly); ctx.clip();
    seeds.forEach(decorateCell);
    ctx.restore();

    // interna regiongränser
    seeds.forEach(p => {
      const cell = CELLS[p.id]; if (!cell || cell.length < 3) return;
      ctx.beginPath(); pathPolyW(cell);
      ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(70,55,30,0.55)'; ctx.stroke();
    });

    // kust: strand + mörk linje
    ctx.lineJoin = 'round';
    ctx.beginPath(); pathPolyW(info.poly); ctx.lineWidth = 5; ctx.strokeStyle = '#d8b878'; ctx.stroke();
    ctx.beginPath(); pathPolyW(info.poly); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(40,55,35,0.65)'; ctx.stroke();

    // flod
    if (info.river) drawRiver(info.river);
  }

  function decorateCell(p) {
    const cell = CELLS[p.id]; if (!cell || cell.length < 3) return;
    const c = CENTROID[p.id];
    const seed = hash(p.id);
    const big = p.land === 'scandia' || p.land === 'britain' || p.land === 'continent';
    const n = big ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const ang = rnd(seed + i * 3) * 6.283;
      const rad = (0.3 + rnd(seed + i * 7) * 0.6) * 64;
      const wx = c[0] + Math.cos(ang) * rad, wy = c[1] + Math.sin(ang) * rad;
      if (pointInPoly(wx, wy, cell) && dist(wx, wy, p.x, p.y) > 28) drawTree(wx, wy);
    }
    if (p.id === 'trondelag') { drawMountain(p.x - 34, p.y + 2); drawMountain(p.x + 4, p.y - 12); }
    if (p.id === 'wessex') { drawMountain(p.x - 28, p.y + 6); }
  }

  function drawTree(wx, wy) {
    const s = w2s(wx, wy), h = Math.max(7, 13 * scale);
    ctx.fillStyle = 'rgba(20,35,15,0.25)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, h * 0.5, h * 0.2, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#4a6a2c'; tri(s.x, s.y - h, s.x - h * 0.6, s.y, s.x + h * 0.6, s.y);
    ctx.fillStyle = '#3d5a23'; tri(s.x, s.y - h * 1.4, s.x - h * 0.5, s.y - h * 0.45, s.x + h * 0.5, s.y - h * 0.45);
  }

  function drawMountain(wx, wy) {
    const s = w2s(wx, wy), h = Math.max(14, 26 * scale);
    ctx.fillStyle = '#8a8478'; tri(s.x, s.y - h, s.x - h * 0.7, s.y, s.x + h * 0.7, s.y);
    ctx.fillStyle = '#f1f0ec'; tri(s.x, s.y - h, s.x - h * 0.22, s.y - h * 0.5, s.x + h * 0.22, s.y - h * 0.5);
  }

  function drawRiver(pts) {
    const w = Math.max(5, 15 * scale);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((pt, i) => { const s = w2s(pt[0], pt[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.lineWidth = w; ctx.strokeStyle = '#2f72a0'; ctx.stroke();
    ctx.lineWidth = w * 0.5; ctx.strokeStyle = '#5aa6d2'; ctx.stroke();
    ctx.restore();
  }

  // ---------- vägar / sjövägar / broar ----------
  function drawConnections(t) {
    EDGES.forEach(([a, b, sea]) => {
      const pa = Engine.prov(a), pb = Engine.prov(b);
      if (pa.land === pb.land && !sea) drawRoad(pa, pb);
      else drawSeaRoute(pa, pb);
    });
  }

  function drawRoad(pa, pb) {
    const sa = w2s(pa.x, pa.y), sb = w2s(pb.x, pb.y);
    ctx.save(); ctx.lineCap = 'round';
    ctx.setLineDash([2, 7]); ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(110,86,52,0.7)';
    ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
    ctx.restore();
    const riv = LANDS[pa.land].river;
    if (riv) for (let i = 0; i < riv.length - 1; i++) {
      const ip = segInt(pa.x, pa.y, pb.x, pb.y, riv[i][0], riv[i][1], riv[i + 1][0], riv[i + 1][1]);
      if (ip) drawBridge(ip, riv[i], riv[i + 1]);
    }
  }

  function drawBridge(wpt, ra, rb) {
    const s = w2s(wpt[0], wpt[1]);
    const ang = Math.atan2(rb[1] - ra[1], rb[0] - ra[0]) + Math.PI / 2; // tvärs floden
    const len = Math.max(16, 30 * scale), wdt = Math.max(7, 12 * scale);
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(ang);
    ctx.fillStyle = '#7d5a36'; rrect(-len / 2, -wdt / 2, len, wdt, 3); ctx.fill();
    ctx.fillStyle = '#9c7748';
    const planks = 4;
    for (let i = 0; i < planks; i++) { rrect(-len / 2 + 2 + i * (len - 4) / planks, -wdt / 2 + 2, (len - 4) / planks - 2, wdt - 4, 1); ctx.fill(); }
    ctx.restore();
  }

  function drawSeaRoute(pa, pb) {
    const sa = w2s(pa.x, pa.y), sb = w2s(pb.x, pb.y);
    ctx.save(); ctx.lineCap = 'round';
    ctx.setLineDash([3, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(225,240,248,0.35)';
    ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
    ctx.restore();
    // litet skepp i mitten
    const mx = (sa.x + sb.x) / 2, my = (sa.y + sb.y) / 2, sz = Math.max(4, 6 * scale);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.atan2(sb.y - sa.y, sb.x - sa.x));
    ctx.fillStyle = 'rgba(60,40,25,0.8)';
    ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.5); ctx.lineTo(sz, -sz * 0.5); ctx.lineTo(sz * 0.6, sz * 0.5); ctx.lineTo(-sz * 0.6, sz * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------- markeringar ----------
  function drawHighlights(t) {
    const sel = Engine.state.selected;
    if (!sel) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const targets = validTargets(sel);
    Object.keys(targets).forEach(id => {
      const cell = CELLS[id]; if (!cell) return;
      const enemy = targets[id] === 'enemy';
      ctx.save();
      ctx.beginPath(); pathPolyW(cell);
      ctx.fillStyle = enemy ? `rgba(255,90,70,${0.10 + pulse * 0.16})` : `rgba(120,225,120,${0.10 + pulse * 0.14})`;
      ctx.fill();
      ctx.lineWidth = 2.5 + pulse * 1.5; ctx.strokeStyle = enemy ? `rgba(255,120,95,${0.7 + pulse * 0.3})` : `rgba(150,240,150,0.9)`;
      ctx.stroke();
      ctx.restore();
    });
    const cell = CELLS[sel]; if (cell) {
      ctx.save();
      ctx.beginPath(); pathPolyW(cell);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,224,130,${0.75 + pulse * 0.25})`; ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- städer ----------
  function drawCity(p) {
    const s = w2s(p.x, p.y);
    const f = Engine.fac(p.owner);
    const u = Math.max(0.55, scale * 1.25);   // pixel-enhet för stadens skala
    const lvl = p.settlement;

    // skugga
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 11 * u, 24 * u, 9 * u, 0, 0, 6.283); ctx.fill();

    // ringmur vid hög nivå
    if (lvl >= 2) {
      ctx.fillStyle = '#cdbf9e';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 4 * u, 23 * u, 13 * u, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#a8966f'; ctx.lineWidth = 2 * u; ctx.stroke();
    }

    const house = (dx, dy, w, h, roof) => {
      ctx.fillStyle = '#e7d3a8'; rrect(s.x + dx - w / 2, s.y + dy - h, w, h, 1.5 * u); ctx.fill();
      ctx.fillStyle = roof; tri(s.x + dx, s.y + dy - h - w * 0.5, s.x + dx - w * 0.62, s.y + dy - h, s.x + dx + w * 0.62, s.y + dy - h);
    };

    // bystugor
    house(-13 * u, 5 * u, 11 * u, 9 * u, '#b4502f');
    house(12 * u, 6 * u, 10 * u, 8 * u, '#9c4a2b');
    if (lvl >= 1) house(-2 * u, 11 * u, 9 * u, 7 * u, '#a85230');

    if (p.type === 'christian') {
      // kyrka med kors
      ctx.fillStyle = '#efe7d4'; rrect(s.x - 5 * u, s.y - 16 * u, 10 * u, 18 * u, 1.5 * u); ctx.fill();
      ctx.fillStyle = '#cdbf9e'; tri(s.x, s.y - 24 * u, s.x - 6 * u, s.y - 16 * u, s.x + 6 * u, s.y - 16 * u);
      ctx.strokeStyle = '#6c5a3a'; ctx.lineWidth = Math.max(1, 1.6 * u);
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 31 * u); ctx.lineTo(s.x, s.y - 24 * u); ctx.moveTo(s.x - 2.5 * u, s.y - 28.5 * u); ctx.lineTo(s.x + 2.5 * u, s.y - 28.5 * u); ctx.stroke();
    } else {
      // kärntorn (keep)
      ctx.fillStyle = '#bdb6a6'; rrect(s.x - 7 * u, s.y - 18 * u, 14 * u, 22 * u, 2 * u); ctx.fill();
      ctx.fillStyle = '#a49d8c';
      for (let i = 0; i < 3; i++) { ctx.fillRect(s.x - 7 * u + i * 5 * u, s.y - 21 * u, 3.2 * u, 3.5 * u); }
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; rrect(s.x - 2 * u, s.y - 9 * u, 4 * u, 9 * u, 1 * u); ctx.fill();
    }

    // baner i ägarfärg
    ctx.strokeStyle = '#5a4a32'; ctx.lineWidth = Math.max(1, 1.6 * u);
    ctx.beginPath(); ctx.moveTo(s.x + 9 * u, s.y - 14 * u); ctx.lineTo(s.x + 9 * u, s.y - 30 * u); ctx.stroke();
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.moveTo(s.x + 9 * u, s.y - 30 * u); ctx.lineTo(s.x + 22 * u, s.y - 27 * u); ctx.lineTo(s.x + 9 * u, s.y - 24 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();

    // garnison-bricka
    const bx = s.x + 16 * u, by = s.y + 9 * u, br = Math.max(8, 10 * u);
    ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283);
    ctx.fillStyle = '#241a12'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = f.color; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(10, br * 1.05)}px system-ui, sans-serif`;
    ctx.fillText(String(p.garrison), bx, by);
  }

  function drawLabel(p) {
    const c = CENTROID[p.id];
    const s = w2s(c[0], c[1]);
    const fontPx = Math.max(10, 13 * Math.min(1, scale / 0.4));
    ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const yy = s.y - 30 * Math.max(0.55, scale * 1.25);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,15,10,0.75)'; ctx.strokeText(p.name, s.x, yy);
    ctx.fillStyle = 'rgba(255,250,238,0.96)'; ctx.fillText(p.name, s.x, yy);
  }

  buildRegions();

  return {
    attach, resize, draw, pickProvince, validTargets,
    buildRegions, regionAt, cellOf: id => CELLS[id], centroidOf: id => CENTROID[id],
    _geo: { pointInPoly, polyCentroid },
  };
})();
