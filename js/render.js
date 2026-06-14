// ============================================================
//  JARL — kartrendering på canvas (riktig projicerad geografi)
//  Ritar kustlinjen ur GEO (Mercator-projicerad GeoJSON), tintar
//  regionerna (Voronoi kring städerna) klippt mot land, samt
//  städer/vägar/sjöleder. Kartlogiken bor i geo.js.
// ============================================================

const Render = (function () {
  let canvas, ctx, dpr = 1;
  let scale = 1, ox = 0, oy = 0, cssW = 0, cssH = 0;
  let landPath = null;

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(seed) { let t = (seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  function attach(c) { canvas = c; ctx = c.getContext('2d'); resize(); window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200)); }
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect(); cssW = r.width; cssH = r.height; if (cssW === 0 || cssH === 0) return;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    scale = Math.min(cssW / GEO.WORLD_W, cssH / GEO.WORLD_H);
    ox = (cssW - GEO.WORLD_W * scale) / 2; oy = (cssH - GEO.WORLD_H * scale) / 2;
    buildLandPath();
  }
  const w2s = (x, y) => ({ x: x * scale + ox, y: y * scale + oy });
  const s2w = (x, y) => ({ x: (x - ox) / scale, y: (y - oy) / scale });

  function buildLandPath() {
    landPath = new Path2D();
    GEO.land().forEach(poly => {
      const ring = r => { r.forEach((pt, i) => { const s = w2s(pt[0], pt[1]); i ? landPath.lineTo(s.x, s.y) : landPath.moveTo(s.x, s.y); }); landPath.closePath(); };
      ring(poly.outer); poly.holes.forEach(ring);
    });
  }

  // ---------- picking & mål ----------
  function pickProvince(sx, sy) { const wp = s2w(sx, sy); const id = GEO.regionAt(wp.x, wp.y); return id ? Engine.prov(id) : null; }
  function validTargets(selId) {
    const res = {}; if (!selId) return res;
    const p = Engine.prov(selId); if (!p || p.owner !== 'player' || p.acted || p.garrison <= 0) return res;
    Engine.neighbors(selId).forEach(n => { res[n.id] = (Engine.prov(n.id).owner === 'player') ? 'friend' : 'enemy'; });
    if (p.coastal) {
      Object.values(Engine.state.provinces).forEach(q => {
        if (q.id === selId || res[q.id] || !q.coastal || q.owner === 'player') return;
        if (Engine.navalDist(p, q) <= CONFIG.NAVAL_RAID_KM) res[q.id] = 'naval';
      });
    }
    return res;
  }

  // ---------- ritprimitiver ----------
  function pathW(poly) { poly.forEach((pt, i) => { const s = w2s(pt[0], pt[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.closePath(); }
  function tri(x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const GRASS = ['#7aa047', '#86a94f', '#6f9740', '#80a44a'];
  function grassFor(id) { return GRASS[hash(id) % GRASS.length]; }

  // ---------- huvudritning ----------
  function draw(now) {
    if (!ctx || cssW === 0 || !landPath) return;
    const t = (now || 0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    drawSea(t);

    ctx.fillStyle = '#6b6a52'; ctx.fill(landPath, 'evenodd');
    drawContextLabels();

    ctx.save();
    ctx.clip(landPath, 'evenodd');
    Object.values(Engine.state.provinces).forEach(p => {
      const cell = GEO.cellOf(p.id); if (!cell || cell.length < 3) return;
      ctx.beginPath(); pathW(cell); ctx.fillStyle = grassFor(p.id); ctx.fill();
      const f = Engine.fac(p.owner);
      if (f.kind !== 'neutral') { ctx.save(); ctx.globalAlpha = 0.36; ctx.fillStyle = f.color; ctx.fill(); ctx.restore(); }
    });
    Object.values(Engine.state.provinces).forEach(decorateCell);
    Object.values(Engine.state.provinces).forEach(p => {
      const cell = GEO.cellOf(p.id); if (!cell || cell.length < 3) return;
      ctx.beginPath(); pathW(cell); ctx.lineJoin = 'round'; ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(60,48,26,0.5)'; ctx.stroke();
    });
    drawHighlights(t);
    ctx.restore();

    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#d8b878'; ctx.stroke(landPath);
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(35,48,32,0.7)'; ctx.stroke(landPath);

    drawConnections(t);
    Object.values(Engine.state.provinces).forEach(drawCity);
    Object.values(Engine.state.provinces).forEach(drawLabel);
  }

  function drawSea(t) {
    const g = ctx.createLinearGradient(0, 0, 0, cssH); g.addColorStop(0, '#2b6e86'); g.addColorStop(1, '#1c4f63');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1.5; const step = 46 * scale;
    for (let yy = (t * 6 % step) - step; yy < cssH; yy += step) for (let xx = 0; xx < cssW; xx += step) { ctx.beginPath(); ctx.arc(xx + (Math.floor(yy / step) % 2 ? step / 2 : 0), yy, 5 * scale, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  }

  function drawContextLabels() {
    if (typeof CONTEXT_LABELS === 'undefined') return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `italic 600 ${Math.max(9, Math.round(12 * Math.min(1, scale / 0.4)))}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(232,228,216,0.40)';
    CONTEXT_LABELS.forEach(c => { const w = GEO.project(c.lng, c.lat); const s = w2s(w.x, w.y); if (s.x > -40 && s.x < cssW + 40 && s.y > -20 && s.y < cssH + 20) ctx.fillText(c.name, s.x, s.y); });
  }

  function decorateCell(p) {
    const cell = GEO.cellOf(p.id); if (!cell || cell.length < 3) return;
    const c = GEO.centroidOf(p.id); const seed = hash(p.id); const sd = GEO.seedOf(p.id);
    for (let i = 0; i < 5; i++) {
      const ang = rnd(seed + i * 3) * 6.283; const rad = (0.3 + rnd(seed + i * 7) * 0.6) * 48;
      const wx = c[0] + Math.cos(ang) * rad, wy = c[1] + Math.sin(ang) * rad;
      if (dist(wx, wy, sd.x, sd.y) > 26) drawTree(wx, wy);
    }
    if (p.id === 'trondelag') { drawMountain(p.id, -16, 10); drawMountain(p.id, 14, -4); }
    if (p.id === 'pictland') drawMountain(p.id, 0, 6);
  }
  function drawTree(wx, wy) { const s = w2s(wx, wy), h = Math.max(6, 12 * scale); ctx.fillStyle = 'rgba(20,35,15,0.22)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, h * 0.5, h * 0.2, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#4a6a2c'; tri(s.x, s.y - h, s.x - h * 0.6, s.y, s.x + h * 0.6, s.y); ctx.fillStyle = '#3d5a23'; tri(s.x, s.y - h * 1.4, s.x - h * 0.5, s.y - h * 0.45, s.x + h * 0.5, s.y - h * 0.45); }
  function drawMountain(id, dx, dy) { const sd = GEO.seedOf(id); const s = w2s(sd.x + dx, sd.y + dy), h = Math.max(12, 22 * scale); ctx.fillStyle = '#8a8478'; tri(s.x, s.y - h, s.x - h * 0.7, s.y, s.x + h * 0.7, s.y); ctx.fillStyle = '#f1f0ec'; tri(s.x, s.y - h, s.x - h * 0.22, s.y - h * 0.5, s.x + h * 0.22, s.y - h * 0.5); }

  function drawConnections(t) {
    EDGES.forEach(([a, b, sea]) => {
      const pa = Engine.prov(a), pb = Engine.prov(b); const sameLand = pa.land === pb.land;
      const sa = w2s(GEO.seedOf(a).x, GEO.seedOf(a).y), sb = w2s(GEO.seedOf(b).x, GEO.seedOf(b).y);
      ctx.save(); ctx.lineCap = 'round';
      if (sameLand && !sea) { ctx.setLineDash([2, 7]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(110,86,52,0.7)'; ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke(); }
      else {
        ctx.setLineDash([3, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(225,240,248,0.32)'; ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
        const mx = (sa.x + sb.x) / 2, my = (sa.y + sb.y) / 2, sz = Math.max(4, 6 * scale);
        ctx.setLineDash([]); ctx.translate(mx, my); ctx.rotate(Math.atan2(sb.y - sa.y, sb.x - sa.x)); ctx.fillStyle = 'rgba(60,40,25,0.8)';
        ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.5); ctx.lineTo(sz, -sz * 0.5); ctx.lineTo(sz * 0.6, sz * 0.5); ctx.lineTo(-sz * 0.6, sz * 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawHighlights(t) {
    const sel = Engine.state.selected; if (!sel) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4); const targets = validTargets(sel);
    Object.keys(targets).forEach(id => {
      const cell = GEO.cellOf(id); if (!cell) return; const k = targets[id]; let fill, stroke, lw, dash = false;
      if (k === 'enemy') { fill = `rgba(255,90,70,${0.10 + pulse * 0.16})`; stroke = `rgba(255,120,95,${0.7 + pulse * 0.3})`; lw = 2.5 + pulse * 1.5; }
      else if (k === 'friend') { fill = `rgba(120,225,120,${0.10 + pulse * 0.14})`; stroke = `rgba(150,240,150,0.9)`; lw = 2.5 + pulse * 1.5; }
      else { fill = `rgba(90,190,235,${0.05 + pulse * 0.09})`; stroke = `rgba(110,205,245,${0.5 + pulse * 0.3})`; lw = 2 + pulse; dash = true; }
      ctx.save(); ctx.beginPath(); pathW(cell); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = stroke; if (dash) ctx.setLineDash([5, 5]); ctx.stroke(); ctx.restore();
    });
    const cell = GEO.cellOf(sel); if (cell) { ctx.save(); ctx.beginPath(); pathW(cell); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,224,130,${0.75 + pulse * 0.25})`; ctx.stroke(); ctx.restore(); }
  }

  function drawCity(p) {
    const sd = GEO.seedOf(p.id); const s = w2s(sd.x, sd.y); const f = Engine.fac(p.owner); const lvl = p.settlement;
    const u = Math.max(0.5, scale * 1.15) * (1 + lvl * 0.05);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 12 * u, (22 + lvl * 2) * u, (8 + lvl) * u, 0, 0, 6.283); ctx.fill();
    if (lvl >= 2) { ctx.fillStyle = '#cdbf9e'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 4 * u, (21 + lvl * 1.5) * u, (12 + lvl) * u, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#a8966f'; ctx.lineWidth = (1.5 + lvl * 0.25) * u; ctx.stroke(); if (lvl >= 4) [-1, 1].forEach(side => { const tx = s.x + side * (19 + lvl) * u, ty = s.y; ctx.fillStyle = '#bdb6a6'; rrect(tx - 3 * u, ty - 12 * u, 6 * u, 14 * u, 1.5 * u); ctx.fill(); ctx.fillStyle = '#8f897c'; ctx.fillRect(tx - 3 * u, ty - 13 * u, 6 * u, 2.5 * u); }); }
    const house = (dx, dy, w, h, roof) => { ctx.fillStyle = '#e7d3a8'; rrect(s.x + dx - w / 2, s.y + dy - h, w, h, 1.5 * u); ctx.fill(); ctx.fillStyle = roof; tri(s.x + dx, s.y + dy - h - w * 0.5, s.x + dx - w * 0.62, s.y + dy - h, s.x + dx + w * 0.62, s.y + dy - h); };
    house(-13 * u, 6 * u, 11 * u, 9 * u, '#b4502f'); house(12 * u, 7 * u, 10 * u, 8 * u, '#9c4a2b'); if (lvl >= 1) house(-2 * u, 12 * u, 9 * u, 7 * u, '#a85230'); if (lvl >= 3) { house(21 * u, 11 * u, 8 * u, 7 * u, '#b4502f'); house(-21 * u, 10 * u, 8 * u, 7 * u, '#9c4a2b'); }
    let topY;
    if (p.type === 'christian') {
      const ch = (15 + lvl * 2) * u; ctx.fillStyle = '#efe7d4'; rrect(s.x - 5 * u, s.y - ch, 10 * u, ch + 2 * u, 1.5 * u); ctx.fill(); ctx.fillStyle = '#cdbf9e'; tri(s.x, s.y - ch - 8 * u, s.x - 6 * u, s.y - ch, s.x + 6 * u, s.y - ch);
      ctx.strokeStyle = '#6c5a3a'; ctx.lineWidth = Math.max(1, 1.6 * u); ctx.beginPath(); ctx.moveTo(s.x, s.y - ch - 15 * u); ctx.lineTo(s.x, s.y - ch - 8 * u); ctx.moveTo(s.x - 2.5 * u, s.y - ch - 12 * u); ctx.lineTo(s.x + 2.5 * u, s.y - ch - 12 * u); ctx.stroke(); topY = s.y - ch - 15 * u;
    } else {
      const kh = (17 + lvl * 2.6) * u, kw = (13 + lvl * 1.1) * u; if (lvl >= 4) [-1, 1].forEach(side => { const tx = s.x + side * (kw * 0.5 + 4 * u); ctx.fillStyle = '#aaa496'; rrect(tx - 3.5 * u, s.y - kh * 0.78, 7 * u, kh * 0.78 + 2 * u, 1.5 * u); ctx.fill(); ctx.fillStyle = '#8f897c'; ctx.fillRect(tx - 3.5 * u, s.y - kh * 0.78 - 2 * u, 7 * u, 2.5 * u); }); ctx.fillStyle = '#bdb6a6'; rrect(s.x - kw / 2, s.y - kh, kw, kh + 2 * u, 2 * u); ctx.fill(); ctx.fillStyle = '#a49d8c'; const teeth = Math.min(5, 3 + Math.floor(lvl / 2)); for (let i = 0; i < teeth; i++) ctx.fillRect(s.x - kw / 2 + i * (kw / teeth), s.y - kh - 3 * u, (kw / teeth) * 0.62, 3.5 * u); ctx.fillStyle = 'rgba(0,0,0,0.18)'; rrect(s.x - 2 * u, s.y - kh * 0.45, 4 * u, kh * 0.45, 1 * u); ctx.fill(); topY = s.y - kh - 3 * u;
    }
    const poleTop = topY - 12 * u; ctx.strokeStyle = '#5a4a32'; ctx.lineWidth = Math.max(1, 1.6 * u); ctx.beginPath(); ctx.moveTo(s.x + 9 * u, s.y - 12 * u); ctx.lineTo(s.x + 9 * u, poleTop); ctx.stroke(); ctx.fillStyle = f.color; ctx.beginPath(); ctx.moveTo(s.x + 9 * u, poleTop); ctx.lineTo(s.x + 22 * u, poleTop + 3 * u); ctx.lineTo(s.x + 9 * u, poleTop + 6 * u); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    const bx = s.x + 16 * u, by = s.y + 11 * u, br = Math.max(8, 10 * u); ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.fillStyle = '#241a12'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = f.color; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${Math.max(10, br * 1.05)}px system-ui, sans-serif`; ctx.fillText(String(p.garrison), bx, by);
  }

  function drawLabel(p) {
    const sd = GEO.seedOf(p.id); const s = w2s(sd.x, sd.y); const fontPx = Math.max(10, 12.5 * Math.min(1, scale / 0.4));
    ctx.font = `600 ${fontPx}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const yy = s.y - 30 * Math.max(0.5, scale * 1.15);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,15,10,0.75)'; ctx.strokeText(p.name, s.x, yy);
    ctx.fillStyle = 'rgba(255,250,238,0.96)'; ctx.fillText(p.name, s.x, yy);
  }

  return { attach, resize, draw, pickProvince, validTargets };
})();
