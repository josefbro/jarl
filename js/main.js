// ============================================================
//  JARL — uppstart & renderingsloop
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  Engine.init();
  Render.attach(document.getElementById('map'));
  UI.build();
  UI.refresh();

  // canvasen ligger i en flex-container; säkerställ korrekt storlek
  setTimeout(() => Render.resize(), 60);

  function loop(now) {
    Render.draw(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
});
