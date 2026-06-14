// ============================================================
//  JARL — spelmotor: tillstånd, ekonomi, försörjning, strid, AI
//  Alla riken (vikingaätter + kristna kungariken) agerar och kan
//  kriga mot varandra. Sjöraid når kust utan att gränsa.
// ============================================================

const Engine = (function () {
  let adj = {};
  let state = null;
  const AI_IDS = FACTIONS.filter(f => f.id !== 'player' && f.kind !== 'neutral').map(f => f.id);
  const ECON_IDS = FACTIONS.filter(f => f.kind !== 'neutral').map(f => f.id);

  const rng = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function buildAdjacency() {
    adj = {};
    PROVINCES.forEach(p => { adj[p.id] = []; });
    EDGES.forEach(([a, b, sea]) => { adj[a].push({ id: b, sea }); adj[b].push({ id: a, sea }); });
  }

  function init() {
    buildAdjacency();
    const provinces = {};
    PROVINCES.forEach(p => { provinces[p.id] = Object.assign({}, p, { acted: false, recruited: 0 }); });
    const factions = {};
    FACTIONS.forEach(f => { factions[f.id] = Object.assign({}, f, { silver: 0, food: 0, renown: 0 }); });
    factions.player.silver = 150; factions.player.food = 55;
    AI_IDS.forEach(id => {
      const f = factions[id];
      f.silver = f.kind === 'christian' ? 110 : 90;
      f.food = f.kind === 'christian' ? 70 : 30;
    });
    state = { turn: 1, provinces, factions, selected: null, log: [], over: false, won: false, lastBattle: null };
    pushLog('☩ År 793. Långskeppen ligger redo. Led Ulfssons ätt till ära!', 'system');
    return state;
  }

  // ---- frågor ----
  const prov = id => state.provinces[id];
  const fac = id => state.factions[id];
  const neighbors = id => adj[id] || [];
  const isAdjacent = (a, b) => neighbors(a).some(n => n.id === b);
  const provincesOf = fid => Object.values(state.provinces).filter(p => p.owner === fid);
  const countOf = fid => provincesOf(fid).length;
  const warriorsOf = fid => provincesOf(fid).reduce((a, p) => a + p.garrison, 0);

  const tierOf = p => TIERS[Math.min(p.settlement, TIERS.length - 1)];
  const defMult = p => p.def + tierOf(p).def;
  const provinceIncome = p => p.income + tierOf(p).income;
  const provinceFood = p => p.food + tierOf(p).food;
  const recruitCap = p => tierOf(p).recruitCap;
  const buildCost = p => (p.settlement < CONFIG.MAX_SETTLEMENT ? TIERS[p.settlement + 1].cost : Infinity);
  const effectiveDefense = p => Math.round(p.garrison * defMult(p));

  const foodIncome = fid => provincesOf(fid).reduce((a, p) => a + provinceFood(p), 0);
  const supplyCap = fid => CONFIG.BASE_SUPPLY + foodIncome(fid);
  const upkeep = fid => warriorsOf(fid) * CONFIG.FOOD_PER_WARRIOR;
  const navalDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function pushLog(text, kind) { state.log.unshift({ text, kind: kind || 'info', turn: state.turn }); if (state.log.length > 80) state.log.pop(); }

  // ---- strid ----
  function battle(atk, def, dmult) {
    const ar = atk * (0.75 + rng() * 0.5);
    const dr = def * dmult * (0.75 + rng() * 0.5);
    const tot = (ar + dr) || 1;
    const atkLoss = clamp(Math.round(atk * (dr / tot) * 0.85), 0, atk);
    const defLoss = clamp(Math.round(def * (ar / tot) * 0.95), 0, def);
    return { atkSurv: atk - atkLoss, defSurv: def - defLoss, atkLoss, defLoss, win: ar >= dr };
  }

  // ---- handlingar ----
  function doInvade(srcId, tgtId, send) {
    const s = prov(srcId), t = prov(tgtId);
    send = clamp(send, 1, s.garrison); s.garrison -= send; s.acted = true;
    const res = battle(send, t.garrison, defMult(t));
    if (res.win && res.atkSurv > 0) {
      const wasChristian = t.type === 'christian';
      t.owner = s.owner; t.garrison = res.atkSurv; t.acted = true;
      const ren = wasChristian ? 45 : 20; fac(s.owner).renown += ren;
      state.lastBattle = { kind: 'invade', win: true, src: srcId, tgt: tgtId, res, ren };
      if (s.owner === 'player') pushLog(`⚔️ ${t.name} erövrat! ${res.atkLoss} stupade, ${res.atkSurv} håller landet. +${ren} ära.`, 'good');
    } else {
      s.garrison += res.atkSurv; t.garrison = res.defSurv;
      state.lastBattle = { kind: 'invade', win: false, src: srcId, tgt: tgtId, res, ren: 0 };
      if (s.owner === 'player') pushLog(`🛡️ Anfallet mot ${t.name} slogs tillbaka. ${res.atkLoss} stupade.`, 'bad');
    }
    return res;
  }

  // Raid kräver INGEN gräns — långskeppen seglar dit (grannraid + sjöraid).
  function doRaid(srcId, tgtId, send, naval) {
    const s = prov(srcId), t = prov(tgtId);
    send = clamp(send, 1, s.garrison); s.garrison -= send; s.acted = true;
    const res = battle(send, t.garrison, defMult(t)); t.garrison = res.defSurv;
    let stolen = 0, ren = 0, grain = 0;
    if (res.atkSurv > 0) {
      stolen = Math.min(t.loot, Math.round(t.loot * (res.win ? 0.7 : 0.3)));
      t.loot -= stolen;
      const f = fac(s.owner); f.silver += stolen;
      grain = Math.floor(stolen / 8); f.food += grain;
      ren = Math.round(stolen / 9) + (res.win ? 6 : 2); f.renown += ren;
    }
    s.garrison += res.atkSurv;
    state.lastBattle = { kind: 'raid', win: res.win, src: srcId, tgt: tgtId, res, stolen, ren, grain };
    if (s.owner === 'player') pushLog(`${naval ? '🌊' : '🔥'} ${naval ? 'Sjöraid' : 'Raid'} mot ${t.name}: ${stolen} silver${grain ? ' + ' + grain + ' mat' : ''} plundrat, +${ren} ära. ${res.atkLoss} stupade.`, stolen > 0 ? 'good' : 'bad');
    return res;
  }

  function doMarch(srcId, tgtId, send) {
    const s = prov(srcId), t = prov(tgtId);
    send = clamp(send, 1, s.garrison); s.garrison -= send; t.garrison += send; s.acted = true;
    if (s.owner === 'player') pushLog(`→ ${send} krigare marscherade till ${t.name}.`, 'info');
  }

  function doRecruit(provId) {
    const p = prov(provId), f = fac(p.owner);
    if (p.recruited >= recruitCap(p)) return { ok: false, msg: 'Rekryteringsgränsen nådd — bygg upp staden.' };
    if (warriorsOf(p.owner) + CONFIG.RECRUIT_BATCH > supplyCap(p.owner)) return { ok: false, msg: 'Försörjningen räcker inte — bygg städer eller erövra mer mat.' };
    if (f.silver < CONFIG.RECRUIT_SILVER) return { ok: false, msg: 'För lite silver.' };
    if (f.food < CONFIG.RECRUIT_FOOD) return { ok: false, msg: 'För lite mat i förråd.' };
    f.silver -= CONFIG.RECRUIT_SILVER; f.food -= CONFIG.RECRUIT_FOOD;
    p.garrison += CONFIG.RECRUIT_BATCH; p.recruited += CONFIG.RECRUIT_BATCH;
    return { ok: true };
  }

  function doBuild(provId) {
    const p = prov(provId), f = fac(p.owner);
    if (p.settlement >= CONFIG.MAX_SETTLEMENT) return { ok: false, msg: 'Redan högsta nivå (Fästning).' };
    const cost = buildCost(p);
    if (f.silver < cost) return { ok: false, msg: `Behöver ${cost} silver.` };
    f.silver -= cost; p.settlement += 1; f.renown += 10;
    if (p.owner === 'player') pushLog(`🏗️ ${p.name} uppgraderat till ${tierOf(p).name}. +10 ära.`, 'good');
    return { ok: true };
  }

  // ---- ekonomi & försörjning ----
  function collectIncome(fid) {
    const f = fac(fid);
    let silver = 0;
    provincesOf(fid).forEach(p => { silver += provinceIncome(p); });
    f.silver += silver;
    f.food += foodIncome(fid) - upkeep(fid);
  }
  function desert(fid, n, reason) {
    n = Math.min(n, warriorsOf(fid)); if (n <= 0) return; let left = n;
    provincesOf(fid).sort((a, b) => b.garrison - a.garrison).forEach(p => { if (left <= 0) return; const take = Math.min(p.garrison, left); p.garrison -= take; left -= take; });
    if (fid === 'player') pushLog(reason === 'svalt' ? `☠️ Svält! ${n} krigare överger din ätt.` : `⚠️ Försörjningen brister — ${n} krigare deserterar.`, 'bad');
  }
  function applyAttrition(fid) {
    const f = fac(fid);
    if (f.food < 0) { desert(fid, Math.ceil(-f.food / 2), 'svalt'); f.food = 0; }
    const over = warriorsOf(fid) - supplyCap(fid);
    if (over > 0) desert(fid, Math.ceil(over * CONFIG.OVERCAP_DESERT), 'overcap');
  }
  function regenLoot() { Object.values(state.provinces).forEach(p => { p.loot = Math.min(p.lootMax, p.loot + Math.max(1, Math.round(p.lootMax * 0.05))); }); }

  // ---- AI (samma för alla riken) ----
  function aiTurn(fid) {
    const f = fac(fid);
    const mine = provincesOf(fid);
    if (mine.length === 0) return;
    const viking = f.kind === 'viking';
    const headroom = () => supplyCap(fid) - warriorsOf(fid);
    const armyTarget = countOf(fid) * 11;
    const cap = supplyCap(fid);
    const isFront = p => neighbors(p.id).some(n => prov(n.id).owner !== fid);

    mine.forEach(p => {
      const gTarget = isFront(p) ? 14 : 7;
      if (warriorsOf(fid) < Math.min(cap, armyTarget) && p.garrison < gTarget &&
          headroom() >= CONFIG.RECRUIT_BATCH && f.silver >= CONFIG.RECRUIT_SILVER &&
          f.food >= CONFIG.RECRUIT_FOOD + 2 && p.recruited < recruitCap(p)) doRecruit(p.id);
    });

    if (f.silver >= TIERS[1].cost && warriorsOf(fid) >= Math.min(cap, armyTarget) - CONFIG.RECRUIT_BATCH) {
      const cand = mine.filter(p => p.settlement < CONFIG.MAX_SETTLEMENT).sort((a, b) => {
        const af = isFront(a) ? 1 : 0, bf = isFront(b) ? 1 : 0;
        if (af !== bf) return af - bf;
        return a.settlement - b.settlement;
      });
      for (const p of cand) { if (f.silver >= buildCost(p) && doBuild(p.id).ok) break; }
    }

    let acts = 0;
    provincesOf(fid).slice().sort((a, b) => b.garrison - a.garrison).forEach(p => {
      if (acts >= 2 || p.acted || p.garrison < 6) return;
      const keep = Math.ceil(p.garrison * 0.4); const send = p.garrison - keep; if (send < 4) return;
      const opts = neighbors(p.id).map(n => prov(n.id)).filter(t => t.owner !== fid);
      if (opts.length === 0) return;
      let best = null, bestScore = -1e9;
      opts.forEach(t => { const winnable = send > t.garrison * defMult(t) * 1.4; const score = (winnable ? 100 : 0) + t.loot * 0.2 - t.garrison * defMult(t); if (score > bestScore) { bestScore = score; best = t; } });
      if (!best) return;
      if (send > best.garrison * defMult(best) * 1.4) {
        const before = best.owner; doInvade(p.id, best.id, send);
        if (before === 'player' && best.owner === fid) pushLog(`⚔️ ${f.name} erövrade ${best.name} från dig!`, 'bad'); acts++;
      } else if (best.loot > 50) { doRaid(p.id, best.id, send, false); acts++; }
    });

    if (viking) navalRaidAI(fid);
  }

  function navalRaidAI(fid) {
    let done = false;
    provincesOf(fid).slice().sort((a, b) => b.garrison - a.garrison).forEach(p => {
      if (done || p.acted || !p.coastal || p.garrison < 9) return;
      const keep = Math.ceil(p.garrison * 0.5); const send = p.garrison - keep; if (send < 5) return;
      let best = null, bs = 0;
      Object.values(state.provinces).forEach(t => {
        if (t.owner === fid || !t.coastal || isAdjacent(p.id, t.id)) return;
        if (navalDist(p, t) > CONFIG.NAVAL_RAID_RANGE || t.loot < 70) return;
        const score = t.loot - effectiveDefense(t) * 2.5;
        if (send > effectiveDefense(t) * 0.7 && score > bs) { bs = score; best = t; }
      });
      if (best) { doRaid(p.id, best.id, send, true); done = true; }
    });
  }

  function checkEnd() {
    const pCount = countOf('player'), pRen = fac('player').renown;
    if (pCount === 0) { state.over = true; state.won = false; pushLog('☠️ Din ätt har fallit. Sagan är slut.', 'bad'); return; }
    if (pRen >= CONFIG.RENOWN_TO_WIN || pCount >= CONFIG.PROVINCES_TO_WIN) { state.over = true; state.won = true; pushLog('👑 Din ätt härskar över Norden! Seger!', 'good'); return; }
    AI_IDS.forEach(fid => {
      if (state.over) return;
      if (fac(fid).renown >= CONFIG.RENOWN_TO_WIN || countOf(fid) >= CONFIG.PROVINCES_TO_WIN) {
        state.over = true; state.won = false; pushLog(`☠️ ${fac(fid).name} har vunnit kapplöpningen om Norden.`, 'bad');
      }
    });
  }

  function endPlayerTurn() {
    if (state.over) return;
    state.selected = null;
    AI_IDS.forEach(aiTurn);
    ECON_IDS.forEach(fid => { collectIncome(fid); applyAttrition(fid); });
    regenLoot();
    Object.values(state.provinces).forEach(p => { p.acted = false; p.recruited = 0; });
    state.turn += 1;
    checkEnd();
  }

  return {
    init,
    get state() { return state; },
    prov, fac, neighbors, isAdjacent, provincesOf, countOf, warriorsOf,
    tierOf, defMult, provinceIncome, provinceFood, recruitCap, buildCost, effectiveDefense,
    foodIncome, supplyCap, upkeep, navalDist,
    doInvade, doRaid, doMarch, doRecruit, doBuild,
    endPlayerTurn, pushLog,
  };
})();
