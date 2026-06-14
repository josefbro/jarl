# JARL ⚔️ — Vikingatåg

Ett turordningsbaserat, kartbaserat mobilstrategispel i vikingatidens norra Europa
(~793 e.Kr). En crossover mellan **Civ 6**, **RISK**, **Total War (Medieval/Shogun)**
och **Crusader Kings** — med fokus på vikingarna: segla, **raida**, plundra och erövra.

Ren HTML5 Canvas + JavaScript, ingen build. Spelbart direkt i mobilwebbläsaren.

## ▶ Spela online

**https://josefbro.github.io/jarl/** — öppna på datorn eller mobilen och spela direkt.

## Kör

**Snabbast:** öppna `standalone.html` direkt i valfri webbläsare (även på mobilen) —
hela spelet ligger i en enda fil, ingen server behövs. AirDrop:a den till telefonen
och lägg till på hemskärmen för app-känsla.

```bash
# eller kör projektet med dev-server (för utveckling med separata filer):
python3 -m http.server 8000   # öppna http://localhost:8000
```
`index.html` (separata filer) går också att öppna direkt — allt är vanilla JS,
inga moduler/CORS-krav. `standalone.html` byggs om från källfilerna med `build.sh`.

## Hur man spelar

Du leder **Ulfssons ätt** från Norge (Trøndelag, Hordaland, Vestfold).

1. **Tryck på din (röda) region** för att markera den.
2. **Tryck på en lysande granne** — röd glöd = fientligt/fritt land, grön = eget land.
   - 🔥 **Raida** — slå till, plundra silver, mat & ära, segla hem (du behåller inte landet).
   - ⚔️ **Erövra** — besegra garnisonen och ta regionen permanent.
   - → **Marschera** — flytta krigare till eget angränsande land.
   - Reglaget väljer hur många krigare du skickar; oddsen visas (⚔️ mot 🛡️).
3. **⚒️ Rekrytera** krigare och **🏗️ bygg** upp städer i panelen.
4. **⛵ Avsluta tur** — rivalätterna (Ravnsson, Björnsson) och de kristna rikena agerar,
   sedan kommer inkomst och mat in.

**🌾 Försörjning:** din **hird** (⚔️ X/Y i HUD:en) begränsas hårt av matproduktionen —
du kan inte hålla fler krigare än du kan föda. Svält och övertak ger desertering. Vill du
ha en större här måste du **bygga städer** eller **erövra mer mark**.

**🏗️ Stadsbygge i 6 nivåer:** Torp → By → Köping → Stad → Borg → Fästning. Varje nivå ger
mer inkomst, mat (= försörjning), försvar och rekryteringstakt — staden ritas större.

**Karta:** realistiska kustlinjer (Norge med fjordar, Britannien, Irland, Jylland …),
resten av Europa visas grått som kontext. **Sjövägar** (Skagerrak, Öresund, Nordsjön …)
låter långskeppen slå till över hav — t.ex. Vestfold → Northumbria (Lindisfarne ✝ 793).

**Vinn** genom **1200 ära** eller **12 regioner**. Förlorar du all mark är sagan slut.

## Arkitektur

```
index.html            layout (HUD, karta, panel, sheet, overlay)
style.css             mobil-first nordisk stil
assets/europe.geojson riktig kustlinje (Natural Earth 1:50m land, public domain,
                      klippt till NV-Europa)
js/config.js          all speldata: provinser med VERKLIGA lng/lat, ätter, kanter, konstanter
js/geo.js             Mercator-projektion + GeoJSON-parser + Voronoi-regioner kring
                      städernas verkliga lägen, klippta mot kusten (DOM-fri)
js/engine.js          tillstånd, ekonomi, strid (haversine-sjöavstånd), turordning, AI
js/render.js          canvas-rendering: projicerad kustlinje, regiontinter, städer
js/ui.js              HUD, paneler, actionsheet, overlays, inmatning
js/main.js            hämtar assets/europe.geojson, init, renderingsloop
build.sh              bygger standalone.html (inline:ar geografin + all kod)
```

Kartan ritas från **riktig geografi**: `geo.js` projicerar GeoJSON-koordinaterna med
Mercator till spelets världsrymd (ren Canvas, ingen d3-beroende), och varje provins
(Vestfold, Northumbria, Wessex …) sitter på sin faktiska plats. Regionytorna är Voronoi
kring städerna, klippta mot den verkliga kustlinjen; land utanför spelytan visas grått.

## Klart hittills

- **RISK/Civ-kärna:** regionkarta (Voronoi-celler med gränser), raid, erövra, marschera.
- **Riktig projicerad geografi:** verkliga kustlinjer ur GeoJSON, provinser på sina
  faktiska koordinater, sjöavstånd i km; resten av Europa grått som kontext.
- **Civ-ekonomi:** mat-försörjningstak som begränsar arméstorlek (ingen passiv mega-armé),
  6 byggnivåer Torp→Fästning, AI som investerar i städer och agerar.

## Roadmap — kvar att bygga

- **Crusader Kings** — din jarl & ätt: arv, åldrande, allianser, giftermål, intriger.
- **Total War** — zooma in till taktiska slag när härar möts (i stället för auto-strid).
- **Civ 6** — teknologiträd (skeppsbyggnad, smide, kristnande/asatro).
- **Shogun** — diplomati, vasaller och förräderi.
- Karta: pan/zoom, säsonger/vinter, stormar till havs.
- Ljud, partikel-VFX för raider, sparfunktion (localStorage), PWA/Capacitor-paketering.
