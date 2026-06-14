#!/usr/bin/env bash
# Bygger standalone.html — hela spelet (CSS + geografi + alla JS) i en enda fil.
# Kör: ./build.sh   (från repo-roten)
set -euo pipefail
cd "$(dirname "$0")"

{
cat <<'HTML'
<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#1b1410">
<title>JARL — Vikingatåg</title>
<style>
body{margin:0;background:#0d2229}
HTML
cat style.css
cat <<'HTML'
</style>
</head>
<body>
<div id="app">
<header id="hud"></header>
<main id="mapwrap"><canvas id="map"></canvas><div id="log"></div><button id="endTurnBtn">⛵ Avsluta tur</button></main>
<footer id="panel"></footer>
</div>
<div id="sheet" class="hidden"></div>
<div id="overlay" class="hidden"></div>
<script>
HTML
printf 'const EUROPE_GEOJSON='
cat assets/europe.geojson
printf ';\n'
cat js/config.js js/geo.js js/engine.js js/render.js js/ui.js
cat <<'HTML'
(function(){GEO.setData(EUROPE_GEOJSON);Engine.init();Render.attach(document.getElementById('map'));UI.build();UI.refresh();setTimeout(function(){Render.resize();},60);setTimeout(function(){Render.resize();},300);(function loop(n){Render.draw(n);requestAnimationFrame(loop);})();})();
</script>
</body>
</html>
HTML
} > standalone.html

echo "Byggde standalone.html ($(wc -c < standalone.html) bytes)"
