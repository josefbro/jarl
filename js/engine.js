// ============================================================
//  JARL — spelmotor: tillstånd, ekonomi, strid, turer, AI
// ============================================================

const Engine = (function () {
  let adj = {};            // id -> [{id, sea}]
  let state = null;

  const rng = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function buildAdjacency() {
    adj = {};
    PROVINCES.forEach(p => { adj[p.id] = []; });
    EDGES.forEach(([a, b, sea]) => {
      adj[a].push({ id: b, sea });
      adj[b].push({ id: a, sea });
    });
  }

  function init() {
    buildAdjacency();

    const provinces = {};
    PROVINCES.forEach(p => {
      provinces[p.id] = Object.assign({}, p, { acted: false, recruited: 0 });
    });

    const factions = {};
    FACTIONS.forEach(f => {
      factions[f.id] = Object.assign({}, f, { silver: 0, food: 0, renown: 0 });
    });
    factions.player.silver = 120;   factions.player.food = 30;
    factions.ravnsson.silver = 90;  factions.ravnsson.food = 24;
    factions.bjornsson.silver = 90; factions.bjornsson.food = 24;
    factions.christian.silver = 220; factions.christian.food = 70;

    state = {
      turn: 1,
      provinces, factions,
      selected: null,
      log: [],
      over: false, won: false,
      lastBattle: null,
    };
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
  const defMult = p => p.def + p.settlement * 0.18;
  const recruitCap = p => (p.settlement + 1) * CONFIG.RECRUIT_BATCH;
  const buildCost = p => CONFIG.BUILD_BASE_COST * (p.settlement + 1);
  const effectiveDefense = p => Math.round(p.garrison * defMult(p));

  function pushLog(text, kind) {
    state.log.unshift({ text, kind: kind || 'info', turn: state.turn });
    if (state.log.length > 80) state.log.pop();
  }

  // ---- strid ----
  // Båda sidor lider förluster i proportion till motståndarens slagkraft.
  function battle(atk, def, dmult) {
    const ar = atk * (0.75 + rng() * 0.5);
    const dr = def * dmult * (0.75 + rng() * 0.5);
    const tot = (ar + dr) || 1;
    let atkLoss = Math.round(atk * (dr / tot) * 0.85);
    let defLoss = Math.round(def * (ar / tot) * 0.95);
    atkLoss = clamp(atkLoss, 0, atk);
    defLoss = clamp(defLoss, 0, def);
    const win = ar >= dr;
    return { atkSurv: atk - atkLoss, defSurv: def - defLoss, atkLoss, defLoss, win };
  }

  // ---- spelarens / AI:s handlingar ----
  function doInvade(srcId, tgtId, send) {
    const s = prov(srcId), t = prov(tgtId);
    send = clamp(send, 1, s.garrison);
    s.garrison -= send;
    s.acted = true;
    const res = battle(send, t.garrison, defMult(t));

    if (res.win && res.atkSurv > 0) {
      const wasChristian = t.type === 'christian';
      t.owner = s.owner;
      t.garrison = res.atkSurv;
      t.acted = true;                       // nylandsatt trupp kan ej agera direkt
      const ren = wasChristian ? 45 : 20;
      fac(s.owner).renown += ren;
      state.lastBattle = { kind: 'invade', win: true, src: srcId, tgt: tgtId, res, ren };
      if (s.owner === 'player')
        pushLog(`⚔️ ${t.name} erövrat! ${res.atkLoss} stupade, ${res.atkSurv} håller landet. +${ren} ära.`, 'good');
    } else {
      s.garrison += res.atkSurv;            // överlevarna seglar hem
      t.garrison = res.defSurv;
      state.lastBattle = { kind: 'invade', win: false, src: srcId, tgt: tgtId, res, ren: 0 };
      if (s.owner === 'player')
        pushLog(`🛡️ Anfallet mot ${t.name} slogs tillbaka. ${res.atkLoss} stupade.`, 'bad');
    }
    return res;
  }

  function doRaid(srcId, tgtId, send) {
    const s = prov(srcId), t = prov(tgtId);
    send = clamp(send, 1, s.garrison);
    s.garrison -= send;
    s.acted = true;
    const res = battle(send, t.garrison, defMult(t));
    t.garrison = res.defSurv;

    let stolen = 0, ren = 0;
    if (res.atkSurv > 0) {
      const frac = res.win ? 0.7 : 0.3;
      stolen = Math.min(t.loot, Math.round(t.loot * frac));
      t.loot -= stolen;
      fac(s.owner).silver += stolen;
      ren = Math.round(stolen / 9) + (res.win ? 6 : 2);
      fac(s.owner).renown += ren;
    }
    s.garrison += res.atkSurv;              // långskeppen återvänder
    state.lastBattle = { kind: 'raid', win: res.win, src: srcId, tgt: tgtId, res, stolen, ren };
    if (s.owner === 'player')
      pushLog(`🔥 Raid mot ${t.name}: ${stolen} silver plundrat, +${ren} ära. ${res.atkLoss} stupade.`, stolen > 0 ? 'good' : 'bad');
    return res;
  }

  function doMarch(srcId, tgtId, send) {
    const s = prov(srcId), t = prov(tgtId);
    send = clamp(send, 1, s.garrison);
    s.garrison -= send; t.garrison += send; s.acted = true;
    if (s.owner === 'player') pushLog(`→ ${send} krigare marscherade till ${t.name}.`, 'info');
  }

  function doRecruit(provId) {
    const p = prov(provId), f = fac(p.owner);
    if (p.recruited >= recruitCap(p)) return { ok: false, msg: 'Rekryteringsgränsen nådd denna tur.' };
    if (f.silver < CONFIG.RECRUIT_SILVER) return { ok: false, msg: 'För lite silver.' };
    if (f.food < CONFIG.RECRUIT_FOOD) return { ok: false, msg: 'För lite mat.' };
    f.silver -= CONFIG.RECRUIT_SILVER; f.food -= CONFIG.RECRUIT_FOOD;
    p.garrison += CONFIG.RECRUIT_BATCH; p.recruited += CONFIG.RECRUIT_BATCH;
    return { ok: true };
  }

  function doBuild(provId) {
    const p = prov(provId), f = fac(p.owner);
    if (p.settlement >= CONFIG.MAX_SETTLEMENT) return { ok: false, msg: 'Redan högsta nivå.' };
    const cost = buildCost(p);
    if (f.silver < cost) return { ok: false, msg: `Behöver ${cost} silver.` };
    f.silver -= cost; p.settlement += 1; f.renown += 10;
    if (p.owner === 'player') pushLog(`🏗️ ${p.name} uppgraderat till nivå ${p.settlement}. +10 ära.`, 'good');
    return { ok: true };
  }

  // ---- runda / ekonomi ----
  function collectIncome(fid) {
    const f = fac(fid);
    let silver = 0, food = 0;
    provincesOf(fid).forEach(p => {
      silver += p.income + p.settlement * CONFIG.SETTLEMENT_INCOME;
      food += p.food;
    });
    const upkeep = Math.floor(warriorsOf(fid) / 10); // 1 mat per 10 krigare
    f.silver += silver;
    f.food = Math.max(0, f.food + food - upkeep);
  }

  function regenLoot() {
    Object.values(state.provinces).forEach(p => {
      const regen = Math.max(2, Math.round(p.lootMax * 0.08));
      p.loot = Math.min(p.lootMax, p.loot + regen);
    });
  }

  // ---- AI ----
  function aiTurn(fid) {
    const f = fac(fid);
    const mine = provincesOf(fid);
    if (mine.length === 0) return;
    const isChristian = f.kind === 'christian';

    // 1) rekrytera på frontlinjeprovinser
    mine.forEach(p => {
      const frontier = neighbors(p.id).some(n => prov(n.id).owner !== fid);
      if (!frontier) return;
      let guard = 0;
      const maxBatches = isChristian ? 2 : 1;
      while (guard++ < maxBatches &&
             f.silver >= CONFIG.RECRUIT_SILVER && f.food >= CONFIG.RECRUIT_FOOD &&
             p.recruited < recruitCap(p)) {
        doRecruit(p.id);
      }
    });

    if (isChristian) {
      // defensiv: återtar förlorad mark men expanderar aldrig bortom utgångsläget
      let acts = 0;
      mine.forEach(p => {
        if (acts >= 1 || countOf(fid) >= 9 || p.acted || p.garrison < 16) return;
        const t = neighbors(p.id).map(n => prov(n.id))
          .find(t => t.owner !== fid && t.type !== 'christian' &&
                     p.garrison > t.garrison * defMult(t) * 2.2);
        if (t) {
          const before = t.owner;
          doInvade(p.id, t.id, p.garrison - 6);
          if (before === 'player' && t.owner === fid) pushLog(`☩ ${f.name} återtog ${t.name} från dig!`, 'bad');
          acts++;
        }
      });
      return;
    }

    // vikinga-AI: expandera & raida — men lämna alltid försvar hemma
    let acts = 0;
    const ordered = mine.slice().sort((a, b) => b.garrison - a.garrison);
    ordered.forEach(p => {
      if (acts >= 2 || p.acted || p.garrison < 6) return;
      const keep = Math.ceil(p.garrison * 0.4);      // håll 40 % kvar som garnison
      const send = p.garrison - keep;
      if (send < 4) return;
      const opts = neighbors(p.id).map(n => prov(n.id)).filter(t => t.owner !== fid);
      if (opts.length === 0) return;

      let best = null, bestScore = -1e9;
      opts.forEach(t => {
        const winnable = send > t.garrison * defMult(t) * 1.4;
        const score = (winnable ? 100 : 0) + t.loot * 0.2 - t.garrison * defMult(t);
        if (score > bestScore) { bestScore = score; best = t; }
      });
      if (!best) return;

      if (send > best.garrison * defMult(best) * 1.4) {
        const before = best.owner;
        doInvade(p.id, best.id, send);
        if (before === 'player' && best.owner === fid) pushLog(`⚔️ ${f.name} erövrade ${best.name} från dig!`, 'bad');
        acts++;
      } else if (best.loot > 50) {
        doRaid(p.id, best.id, send);
        acts++;
      }
    });
  }

  function checkEnd() {
    const pCount = countOf('player');
    const pRen = fac('player').renown;
    if (pCount === 0) { state.over = true; state.won = false; pushLog('☠️ Din ätt har fallit. Sagan är slut.', 'bad'); return; }
    if (pRen >= CONFIG.RENOWN_TO_WIN || pCount >= CONFIG.PROVINCES_TO_WIN) {
      state.over = true; state.won = true; pushLog('👑 Din ätt härskar över Norden! Seger!', 'good'); return;
    }
    ['ravnsson', 'bjornsson'].forEach(fid => {
      if (state.over) return;
      if (fac(fid).renown >= CONFIG.RENOWN_TO_WIN || countOf(fid) >= CONFIG.PROVINCES_TO_WIN) {
        state.over = true; state.won = false;
        pushLog(`☠️ ${fac(fid).name} har vunnit kapplöpningen om Norden.`, 'bad');
      }
    });
  }

  function endPlayerTurn() {
    if (state.over) return;
    state.selected = null;
    ['bjornsson', 'ravnsson', 'christian'].forEach(aiTurn);
    ['player', 'bjornsson', 'ravnsson', 'christian'].forEach(collectIncome);
    regenLoot();
    Object.values(state.provinces).forEach(p => { p.acted = false; p.recruited = 0; });
    state.turn += 1;
    checkEnd();
  }

  return {
    init,
    get state() { return state; },
    prov, fac, neighbors, isAdjacent, provincesOf, countOf, warriorsOf,
    defMult, recruitCap, buildCost, effectiveDefense,
    doInvade, doRaid, doMarch, doRecruit, doBuild,
    endPlayerTurn, pushLog,
  };
})();
