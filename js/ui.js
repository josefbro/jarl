// ============================================================
//  JARL — HUD, paneler, inmatning, overlays
// ============================================================

const UI = (function () {
  let el = {};          // cachade DOM-element
  let pending = null;   // { src, tgt, kind('friend'|'enemy') }

  function $(id) { return document.getElementById(id); }

  function build() {
    el = {
      hud: $('hud'),
      panel: $('panel'),
      log: $('log'),
      sheet: $('sheet'),
      overlay: $('overlay'),
      endTurn: $('endTurnBtn'),
    };
    el.endTurn.addEventListener('click', onEndTurn);

    const canvas = $('map');
    canvas.addEventListener('pointerdown', e => {
      const r = canvas.getBoundingClientRect();
      onTap(e.clientX - r.left, e.clientY - r.top);
    });

    showIntro();
  }

  // ---------- inmatning på kartan ----------
  function onTap(sx, sy) {
    if (Engine.state.over) return;
    const picked = Render.pickProvince(sx, sy);
    if (!picked) { Engine.state.selected = null; refresh(); return; }

    const cur = Engine.state.selected;
    const targets = Render.validTargets(cur);
    if (cur && cur !== picked.id && targets[picked.id]) {
      openSheet(cur, picked.id, targets[picked.id]);
      return;
    }
    Engine.state.selected = picked.id;
    closeSheet();
    refresh();
  }

  // ---------- HUD ----------
  function renderHUD() {
    const f = Engine.fac('player');
    const provinces = Engine.countOf('player');
    const chips = [
      ['🗓️', 'Tur', Engine.state.turn],
      ['⚑', 'Land', `${provinces}/${CONFIG.PROVINCES_TO_WIN}`],
      ['👑', 'Ära', `${f.renown}/${CONFIG.RENOWN_TO_WIN}`],
      ['🪙', 'Silver', f.silver],
      ['🌾', 'Mat', f.food],
      ['⚔️', 'Krigare', Engine.warriorsOf('player')],
    ];
    el.hud.innerHTML = chips.map(([ic, lab, val]) =>
      `<div class="chip"><span class="ic">${ic}</span><span class="lab">${lab}</span><span class="val">${val}</span></div>`
    ).join('');
  }

  // ---------- nederpanel ----------
  function renderPanel() {
    const sel = Engine.state.selected;
    if (!sel) {
      el.panel.innerHTML = `<div class="hint">⚓ Tryck på en <b>röd</b> provins (din ätt) för att välja den — tryck sedan på en granne för att raida, erövra eller flytta.</div>`;
      return;
    }
    const p = Engine.prov(sel);
    const owner = Engine.fac(p.owner);
    const mine = p.owner === 'player';

    const stats = [
      ['⚔️', p.garrison, 'krigare'],
      ['🏰', `nivå ${p.settlement}`, 'bebyggelse'],
      ['🛡️', Engine.effectiveDefense(p), 'försvar'],
      ['🪙', p.income + p.settlement * CONFIG.SETTLEMENT_INCOME, 'inkomst'],
      ['🌾', p.food, 'mat'],
      ['💰', p.loot, 'rovbyte'],
    ];
    const statsHtml = stats.map(([ic, v, lab]) =>
      `<div class="stat"><span>${ic}</span><b>${v}</b><i>${lab}</i></div>`).join('');

    let actions = '';
    if (mine) {
      const f = Engine.fac('player');
      const canRecruit = p.recruited < Engine.recruitCap(p) && f.silver >= CONFIG.RECRUIT_SILVER && f.food >= CONFIG.RECRUIT_FOOD;
      const cost = Engine.buildCost(p);
      const canBuild = p.settlement < CONFIG.MAX_SETTLEMENT && f.silver >= cost;
      actions =
        `<div class="actions">
           <button class="act" data-a="recruit" ${canRecruit ? '' : 'disabled'}>
             ⚒️ Rekrytera +${CONFIG.RECRUIT_BATCH}<small>${CONFIG.RECRUIT_SILVER}🪙 ${CONFIG.RECRUIT_FOOD}🌾</small></button>
           <button class="act" data-a="build" ${canBuild ? '' : 'disabled'}>
             ${p.settlement < CONFIG.MAX_SETTLEMENT ? `🏗️ Bygg nivå ${p.settlement + 1}<small>${cost}🪙</small>` : '🏰 Max nivå'}</button>
         </div>
         <div class="hint">${p.acted ? '⏳ Denna provins har redan fört krig denna tur.' : '➡️ Tryck på en lysande granne: <b style="color:#ff8a76">röd = anfall</b>, <b style="color:#8fdc8f">grön = flytta hit</b>.'}</div>`;
    } else {
      actions = `<div class="hint">Tillhör <b style="color:${owner.color}">${owner.name}</b>. Markera en av dina egna provinser intill för att anfalla.</div>`;
    }

    el.panel.innerHTML =
      `<div class="ptitle">
         <span class="dot" style="background:${owner.color}"></span>
         <b>${p.name}</b>
         <span class="ownr">${owner.name}${p.type === 'christian' ? ' ✝' : ''}</span>
       </div>
       <div class="stats">${statsHtml}</div>
       ${actions}`;

    el.panel.querySelectorAll('.act').forEach(b =>
      b.addEventListener('click', () => onPanelAction(b.dataset.a, sel)));
  }

  function onPanelAction(a, provId) {
    const res = a === 'recruit' ? Engine.doRecruit(provId) : Engine.doBuild(provId);
    if (res && !res.ok) toast(res.msg, 'bad');
    refresh();
  }

  // ---------- actionsheet (raid / erövra / marschera) ----------
  function openSheet(srcId, tgtId, kind) {
    pending = { src: srcId, tgt: tgtId, kind };
    const s = Engine.prov(srcId), t = Engine.prov(tgtId);
    const max = s.garrison;
    const owner = Engine.fac(t.owner);

    const friend = kind === 'friend';
    const title = friend
      ? `→ Flytta till ${t.name}`
      : `⚔️ Mål: ${t.name}`;

    const targetInfo = friend
      ? `<div class="sinfo">${t.name} har ${t.garrison} krigare (din ätt).</div>`
      : `<div class="sinfo"><span class="dot" style="background:${owner.color}"></span> ${owner.name}
           &nbsp;·&nbsp; 🛡️ försvar <b>${Engine.effectiveDefense(t)}</b>
           &nbsp;·&nbsp; 💰 rovbyte <b>${t.loot}</b></div>`;

    const btns = friend
      ? `<button class="big" data-do="march">→ Marschera hit</button>`
      : `<button class="big raid" data-do="raid">🔥 Raida<small>plundra silver, segla hem</small></button>
         <button class="big invade" data-do="invade">⚔️ Erövra<small>besegra & ta landet</small></button>`;

    el.sheet.innerHTML =
      `<div class="sheet-card">
         <div class="stitle">${title}</div>
         ${targetInfo}
         <div class="slider">
           <label>Skicka krigare: <b id="sval">${max}</b> / ${max}</label>
           <input type="range" id="srange" min="1" max="${max}" value="${max}">
           <div class="odds" id="odds"></div>
         </div>
         <div class="sbtns">${btns}</div>
         <button class="cancel" data-do="cancel">Avbryt</button>
       </div>`;
    el.sheet.classList.remove('hidden');

    const range = $('srange'), valEl = $('sval'), odds = $('odds');
    function updateOdds() {
      const send = +range.value;
      valEl.textContent = send;
      if (!friend) {
        const def = Engine.effectiveDefense(t);
        const ratio = def === 0 ? 99 : send / def;
        const verdict = ratio >= 1.6 ? '🟢 stark övermakt' : ratio >= 1.0 ? '🟡 jämn kamp' : '🔴 underläge';
        odds.innerHTML = `⚔️ ${send} mot 🛡️ ${def} &nbsp; ${verdict}`;
      } else odds.textContent = '';
    }
    range.addEventListener('input', updateOdds);
    updateOdds();

    el.sheet.querySelectorAll('[data-do]').forEach(b =>
      b.addEventListener('click', () => doSheet(b.dataset.do, +range.value)));
  }

  function doSheet(action, send) {
    const pn = pending;
    closeSheet();
    if (!pn || action === 'cancel') { refresh(); return; }
    if (action === 'march') Engine.doMarch(pn.src, pn.tgt, send);
    if (action === 'raid') Engine.doRaid(pn.src, pn.tgt, send);
    if (action === 'invade') Engine.doInvade(pn.src, pn.tgt, send);
    Engine.state.selected = null;
    refresh();
  }

  function closeSheet() {
    pending = null;
    el.sheet.classList.add('hidden');
    el.sheet.innerHTML = '';
  }

  // ---------- händelselogg (flytande) ----------
  function renderLog() {
    const recent = Engine.state.log.slice(0, 4);
    el.log.innerHTML = recent.map(e =>
      `<div class="logline ${e.kind}">${e.text}</div>`).join('');
  }

  let toastTimer = null;
  function toast(text, kind) {
    Engine.pushLog(text, kind || 'info');
    renderLog();
  }

  // ---------- tur ----------
  function onEndTurn() {
    if (Engine.state.over) return;
    closeSheet();
    el.endTurn.disabled = true;
    el.endTurn.textContent = '⚔️ Fienderna drar ut...';
    setTimeout(() => {
      Engine.endPlayerTurn();
      el.endTurn.disabled = false;
      el.endTurn.innerHTML = '⛵ Avsluta tur';
      refresh();
      if (Engine.state.over) showGameOver();
    }, 280);
  }

  // ---------- overlays ----------
  function showIntro() {
    el.overlay.innerHTML =
      `<div class="ov-card">
         <h1>JARL</h1>
         <p class="sub">Vikingatåg över Norden · 793 e.Kr</p>
         <ul>
           <li>🔴 Du leder <b>Ulfssons ätt</b> i Vestfold.</li>
           <li>⚒️ <b>Rekrytera</b> krigare och <b>bygg</b> upp dina bygder.</li>
           <li>🔥 <b>Raida</b> kristna kloster (✝) för silver och ära.</li>
           <li>⚔️ <b>Erövra</b> grannar — landväg eller över hav (streckad linje).</li>
           <li>👑 Vinn genom <b>${CONFIG.RENOWN_TO_WIN} ära</b> eller <b>${CONFIG.PROVINCES_TO_WIN} provinser</b>.</li>
         </ul>
         <button class="big invade" id="startBtn">⛵ Sätt segel</button>
       </div>`;
    el.overlay.classList.remove('hidden');
    $('startBtn').addEventListener('click', () => {
      el.overlay.classList.add('hidden');
      el.overlay.innerHTML = '';
    });
  }

  function showGameOver() {
    const won = Engine.state.won;
    el.overlay.innerHTML =
      `<div class="ov-card">
         <h1>${won ? '👑 SEGER' : '☠️ NEDERLAG'}</h1>
         <p class="sub">${won ? 'Skalderna sjunger om Ulfssons ätt i evig tid.' : 'Din saga är till ända.'}</p>
         <div class="ov-stats">
           Tur ${Engine.state.turn} · 👑 ${Engine.fac('player').renown} ära · ⚑ ${Engine.countOf('player')} provinser
         </div>
         <button class="big invade" id="againBtn">↻ Spela igen</button>
       </div>`;
    el.overlay.classList.remove('hidden');
    $('againBtn').addEventListener('click', () => {
      el.overlay.classList.add('hidden');
      el.overlay.innerHTML = '';
      Engine.init();
      Render.resize();
      refresh();
    });
  }

  function refresh() {
    renderHUD();
    renderPanel();
    renderLog();
  }

  return { build, onTap, refresh };
})();
