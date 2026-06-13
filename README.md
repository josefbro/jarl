# JARL ⚔️ — Vikingatåg

Ett turordningsbaserat, kartbaserat mobilstrategispel i vikingatidens norra Europa
(~793 e.Kr). En crossover mellan **Civ 6**, **RISK**, **Total War (Medieval/Shogun)**
och **Crusader Kings** — med fokus på vikingarna: segla, **raida**, plundra och erövra.

Ren HTML5 Canvas + JavaScript, ingen build. Spelbart direkt i mobilwebbläsaren.

## Kör

```bash
# valfri statisk server, t.ex.
python3 -m http.server 8000
# öppna sedan http://localhost:8000  (helst i mobilläge / på telefon)
```
Eller öppna `index.html` direkt (allt är vanilla, inga moduler/CORS-krav).

## Hur man spelar (MVP)

Du leder **Ulfssons ätt** från Vestfold i Norge.

1. **Tryck på din (röda) provins** för att markera den.
2. **Tryck på en lysande granne** — röd glöd = fientligt/fritt land, grön = eget land.
   - 🔥 **Raida** — slå till, plundra silver & ära, segla hem (du behåller inte landet).
   - ⚔️ **Erövra** — besegra garnisonen och ta provinsen permanent.
   - → **Marschera** — flytta krigare till eget angränsande land.
   - Reglaget väljer hur många krigare du skickar; oddsen visas (⚔️ mot 🛡️).
3. **⚒️ Rekrytera** krigare och **🏗️ bygg** upp bygder (mer inkomst + försvar) i panelen.
4. **⛵ Avsluta tur** — rivaliserande vikingaätter (Ravnsson, Björnsson) och de
   kristna rikena agerar, sedan kommer inkomsten in.

**Sjövägar** (streckade linjer) låter långskeppen slå till över hav — t.ex. från
Vestfold rakt mot Northumbria (Lindisfarne ✝, det rikaste klostret på kartan).

**Vinn** genom **1000 ära** eller **12 provinser**. Förlorar du all mark är sagan slut.

## Arkitektur

```
index.html        layout (HUD, karta, panel, sheet, overlay)
style.css         mobil-first nordisk stil
js/config.js      all speldata: provinser, ätter, kanter, landmassor, konstanter
js/engine.js      tillstånd, ekonomi, strid, turordning, AI
js/render.js      canvas-rendering + träffdetektering (skärm↔värld)
js/ui.js          HUD, paneler, actionsheet, overlays, inmatning
js/main.js        uppstart + renderingsloop
```

## Roadmap — de andra lagren

MVP:n ovan är **RISK/Civ-kärnan** (karta + raid + erövra). Planerade lager:

- **Crusader Kings** — din jarl & ätt: arv, åldrande, allianser, giftermål, intriger.
- **Total War** — zooma in till taktiska slag när härar möts (i stället för auto-strid).
- **Civ 6** — teknologiträd (skeppsbyggnad, smide, kristnande/asatro), under.
- **Shogun** — fler ätter, diplomati, vasaller och förräderi.
- Karta: pan/zoom, fler provinser, säsonger/vinter, stormar till havs.
- Ljud, partikel-VFX för raider, sparfunktion (localStorage), PWA/Capacitor-paketering.
