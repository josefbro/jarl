// ============================================================
//  JARL — uppstart: ladda geografin, init, renderingsloop
// ============================================================

(function () {
  function start() {
    Engine.init();
    Render.attach(document.getElementById('map'));
    UI.build();
    UI.refresh();
    setTimeout(() => Render.resize(), 60);
    setTimeout(() => Render.resize(), 300);
    (function loop(now) { Render.draw(now); requestAnimationFrame(loop); })();
  }

  function withData(geojson) { GEO.setData(geojson); start(); }

  function boot() {
    // standalone/widget inline:ar EUROPE_GEOJSON; annars hämtas filen
    if (typeof EUROPE_GEOJSON !== 'undefined' && EUROPE_GEOJSON) { withData(EUROPE_GEOJSON); return; }
    fetch('assets/europe.geojson')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(withData)
      .catch(err => {
        console.error('Kunde inte ladda assets/europe.geojson:', err);
        const panel = document.getElementById('panel');
        if (panel) panel.innerHTML = '<div class="hint">⚠️ Kunde inte ladda kartan (assets/europe.geojson). Kör via en webbserver, t.ex. <b>python3 -m http.server</b>.</div>';
      });
  }

  if (document.getElementById('map')) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
