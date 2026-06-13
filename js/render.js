// ============================================================
//  JARL — kartrendering på canvas
// ============================================================

const Render = (function () {
  let canvas, ctx, dpr = 1;
  let scale = 1, ox = 0, oy = 0;
  let cssW = 0, cssH = 0;

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

  function pickProvince(sx, sy) {
    const wp = s2w(sx, sy);
    let best = null, bd = 1e9;
    Object.values(Engine.state.provinces).forEach(p => {
      const d = Math.hypot(p.x - wp.x, p.y - wp.y);
      if (d < bd) { bd = d; best = p; }
    });
    return (best && bd <= CONFIG.HIT_R) ? best : null;
  }

  // vilka grannar är giltiga mål för den valda (spelarägda, ej agerade) provinsen
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

  function draw(now) {
    if (!ctx || cssW === 0) return;
    const t = (now || 0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const g = ctx.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, '#173543');
    g.addColorStop(1, '#0d2229');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);

    drawLandmasses();
    drawEdges();
    drawNodes(t);
  }

  function drawLandmasses() {
    ctx.save();
    ctx.fillStyle = '#3f4a37';
    ctx.strokeStyle = 'rgba(18,26,16,0.55)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    LANDMASSES.forEach(poly => {
      ctx.beginPath();
      poly.forEach((pt, i) => {
        const s = w2s(pt[0], pt[1]);
        i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawEdges() {
    EDGES.forEach(([a, b, sea]) => {
      const pa = Engine.prov(a), pb = Engine.prov(b);
      const sa = w2s(pa.x, pa.y), sb = w2s(pb.x, pb.y);
      ctx.save();
      ctx.lineWidth = sea ? 1.5 : 2.5;
      ctx.strokeStyle = sea ? 'rgba(180,212,228,0.28)' : 'rgba(126,146,112,0.55)';
      if (sea) ctx.setLineDash([6, 7]);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawNodes(t) {
    const sel = Engine.state.selected;
    const targets = validTargets(sel);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    const r = CONFIG.NODE_R * scale;
    const TAU = Math.PI * 2;

    Object.values(Engine.state.provinces).forEach(p => {
      const s = w2s(p.x, p.y);
      const f = Engine.fac(p.owner);

      // mål-glöd
      if (targets[p.id]) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 6 + pulse * 4, 0, TAU);
        ctx.fillStyle = targets[p.id] === 'friend'
          ? `rgba(120,220,120,${0.18 + pulse * 0.20})`
          : `rgba(255,120,90,${0.20 + pulse * 0.22})`;
        ctx.fill();
      }
      // markerad ring
      if (sel === p.id) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 5 + pulse * 3, 0, TAU);
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255,255,255,${0.55 + pulse * 0.4})`;
        ctx.stroke();
      }

      // nodkropp
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, TAU);
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = p.acted && p.owner === 'player' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)';
      ctx.stroke();
      if (p.acted && p.owner === 'player') {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // garnison
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(r * 0.95)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(p.garrison), s.x, s.y);

      // bebyggelse-pricks ovanför
      for (let i = 0; i < p.settlement; i++) {
        ctx.beginPath();
        ctx.arc(s.x - (p.settlement - 1) * 5 + i * 10, s.y - r - 7, 3, 0, TAU);
        ctx.fillStyle = '#f4d35e';
        ctx.fill();
      }

      // kors för kristna riken (raid-mål)
      if (p.type === 'christian') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `${Math.round(r * 0.8)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✝', s.x + r * 0.85, s.y - r * 0.75);
      }
      // myntglimt vid rikt rovbyte
      if (p.loot >= 80) {
        ctx.font = `${Math.round(r * 0.7)}px serif`;
        ctx.fillText('🪙', s.x - r * 0.85, s.y - r * 0.75);
      }

      // namnetikett
      ctx.font = `600 ${Math.max(10, Math.round(12 * Math.min(1, scale / 0.42)))}px system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(p.name, s.x, s.y + r + 4);
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillText(p.name, s.x, s.y + r + 4);
    });
  }

  return { attach, resize, draw, pickProvince, validTargets };
})();
