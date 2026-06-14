// ============================================================
//  JARL — config & speldata (vikingatidens norra Europa)
//  Provinserna ligger på sina VERKLIGA koordinater (lng/lat).
//  Kartan ritas från riktig geografi (assets/europe.geojson),
//  projicerad med Mercator. Se geo.js / render.js.
// ============================================================

const CONFIG = {
  WORLD_W: 1000,           // logisk världsbredd (höjd härleds ur projektionen)

  // projektionsfönster (lng/lat) som ritas ut — ramar in NV-Europa
  RENDER_BOUNDS: { w: -12, e: 22, s: 47, n: 69 },
  REGION_RADIUS: 235,      // hur långt en regions tint når från sin stad (världsenh.)

  RECRUIT_BATCH: 5,
  RECRUIT_SILVER: 25,
  RECRUIT_FOOD: 5,
  MAX_SETTLEMENT: 5,

  BASE_SUPPLY: 12,
  FOOD_PER_WARRIOR: 1,
  OVERCAP_DESERT: 0.5,

  NAVAL_RAID_KM: 900,      // långskeppens raid-räckvidd (verkliga km) — når Lindisfarne

  RENOWN_TO_WIN: 1200,
  PROVINCES_TO_WIN: 14,
};

// kind: player | viking | christian (separata kungariken) | neutral
const FACTIONS = [
  { id:'player',     name:'Ulfssons ätt',   short:'Du',    color:'#c0392b', kind:'player'    },
  { id:'ravnsson',   name:'Ravnssons ätt',  short:'Ravn',  color:'#2c6e8f', kind:'viking'    },
  { id:'bjornsson',  name:'Björnssons ätt', short:'Björn', color:'#7a9a3a', kind:'viking'    },
  { id:'northumbria',name:'Northumbria',    short:'Nor',   color:'#7d5fa0', kind:'christian' },
  { id:'mercia',     name:'Mercia',         short:'Mer',   color:'#c79a2e', kind:'christian' },
  { id:'wessex',     name:'Wessex',         short:'Wes',   color:'#b23a48', kind:'christian' },
  { id:'dublin',     name:'Irerna',         short:'Ire',   color:'#2f8f6f', kind:'christian' },
  { id:'frankia',    name:'Frankerriket',   short:'Frank', color:'#456fb0', kind:'christian' },
  { id:'saxony',     name:'Sachsen',        short:'Sax',   color:'#9a7038', kind:'christian' },
  { id:'neutral',    name:'Fria bygder',    short:'Fri',   color:'#8d8674', kind:'neutral'   },
];

const TIERS = [
  { level:0, name:'Torp',     cost:0,   income:0,  food:0,  def:0.00, recruitCap:5  },
  { level:1, name:'By',       cost:60,  income:4,  food:5,  def:0.18, recruitCap:8  },
  { level:2, name:'Köping',   cost:130, income:9,  food:10, def:0.40, recruitCap:12 },
  { level:3, name:'Stad',     cost:230, income:15, food:16, def:0.70, recruitCap:16 },
  { level:4, name:'Borg',     cost:360, income:24, food:22, def:1.05, recruitCap:22 },
  { level:5, name:'Fästning', cost:540, income:36, food:30, def:1.45, recruitCap:30 },
];

// lng/lat = stadens verkliga läge. land = grupp (för väg vs sjöled-rendering).
// coastal=true => kan nås av/nå ut med sjöraid.
const PROVINCES = [
  // --- Skandinaviska halvön ---
  { id:'halogaland',  name:'Hålogaland', land:'scandia', lng:15.0, lat:67.0, owner:'neutral',   type:'norse', coastal:true,  garrison:5,  settlement:0, income:8,  food:4,  loot:40,  lootMax:55,  def:1.10 },
  { id:'trondelag',   name:'Trøndelag',  land:'scandia', lng:10.9, lat:63.4, owner:'player',    type:'norse', coastal:true,  garrison:7,  settlement:0, income:9,  food:5,  loot:45,  lootMax:60,  def:1.15 },
  { id:'hordaland',   name:'Hordaland',  land:'scandia', lng:5.7,  lat:60.4, owner:'player',    type:'norse', coastal:true,  garrison:7,  settlement:0, income:9,  food:4,  loot:40,  lootMax:55,  def:1.10 },
  { id:'vestfold',    name:'Vestfold',   land:'scandia', lng:10.2, lat:59.3, owner:'player',    type:'norse', coastal:true,  garrison:12, settlement:1, income:10, food:5,  loot:30,  lootMax:50,  def:1.10 },
  { id:'uppland',     name:'Uppland',    land:'scandia', lng:17.6, lat:59.9, owner:'bjornsson', type:'norse', coastal:true,  garrison:11, settlement:1, income:10, food:5,  loot:30,  lootMax:50,  def:1.10 },
  { id:'ostergotland',name:'Östergötland',land:'scandia',lng:15.6, lat:58.4, owner:'neutral',   type:'norse', coastal:true,  garrison:6,  settlement:0, income:10, food:6,  loot:38,  lootMax:52,  def:1.05 },
  { id:'gotaland',    name:'Götaland',   land:'scandia', lng:13.0, lat:57.7, owner:'bjornsson', type:'norse', coastal:true,  garrison:7,  settlement:0, income:9,  food:6,  loot:35,  lootMax:50,  def:1.05 },
  { id:'skane',       name:'Skåne',      land:'scandia', lng:13.4, lat:55.8, owner:'neutral',   type:'norse', coastal:true,  garrison:6,  settlement:0, income:10, food:7,  loot:40,  lootMax:55,  def:1.05 },
  // --- Danmark ---
  { id:'jylland',     name:'Jylland',    land:'denmark', lng:9.4,  lat:56.3, owner:'ravnsson', type:'norse', coastal:true, garrison:8,  settlement:0, income:10, food:7,  loot:35,  lootMax:55,  def:1.05 },
  { id:'sjaelland',   name:'Sjælland',   land:'denmark', lng:11.9, lat:55.5, owner:'ravnsson', type:'norse', coastal:true, garrison:11, settlement:1, income:10, food:6,  loot:35,  lootMax:55,  def:1.10 },
  // --- Gotland ---
  { id:'gotland',     name:'Gotland',    land:'gotland', lng:18.5, lat:57.5, owner:'neutral',   type:'island', coastal:true, garrison:5,  settlement:0, income:12, food:4,  loot:80,  lootMax:110, def:1.00 },
  // --- Brittiska öarna ---
  { id:'orkney',      name:'Orkneyöarna', land:'britain', lng:-3.0, lat:59.0, owner:'neutral',   type:'island', coastal:true, garrison:4,  settlement:0, income:7,  food:4,  loot:60,  lootMax:80,  def:1.00 },
  { id:'pictland',    name:'Piktland',   land:'britain', lng:-4.2, lat:57.3, owner:'northumbria', type:'christian', coastal:true,  garrison:7,  settlement:0, income:10, food:5,  loot:90,  lootMax:110, def:1.10 },
  { id:'northumbria', name:'Northumbria',land:'britain', lng:-1.7, lat:55.0, owner:'northumbria', type:'christian', coastal:true,  garrison:10, settlement:1, income:13, food:7,  loot:250, lootMax:250, def:1.20 },
  { id:'gwynedd',     name:'Gwynedd',    land:'britain', lng:-4.0, lat:53.0, owner:'mercia',      type:'christian', coastal:true,  garrison:8,  settlement:0, income:10, food:6,  loot:110, lootMax:130, def:1.15 },
  { id:'mercia',      name:'Mercia',     land:'britain', lng:-1.5, lat:52.6, owner:'mercia',      type:'christian', coastal:false, garrison:13, settlement:1, income:14, food:9,  loot:160, lootMax:180, def:1.20 },
  { id:'eastanglia',  name:'East Anglia',land:'britain', lng:1.0,  lat:52.4, owner:'mercia',      type:'christian', coastal:true,  garrison:10, settlement:1, income:13, food:8,  loot:170, lootMax:190, def:1.10 },
  { id:'kent',        name:'Kent',       land:'britain', lng:0.9,  lat:51.2, owner:'wessex',      type:'christian', coastal:true,  garrison:9,  settlement:1, income:13, food:7,  loot:150, lootMax:170, def:1.15 },
  { id:'wessex',      name:'Wessex',     land:'britain', lng:-2.2, lat:51.0, owner:'wessex',      type:'christian', coastal:true,  garrison:16, settlement:2, income:14, food:9,  loot:200, lootMax:220, def:1.30 },
  // --- Irland ---
  { id:'dublin',      name:'Dublin',     land:'ireland', lng:-6.3, lat:53.3, owner:'dublin',      type:'christian', coastal:true,  garrison:8,  settlement:1, income:11, food:6,  loot:150, lootMax:170, def:1.10 },
  { id:'munster',     name:'Munster',    land:'ireland', lng:-8.6, lat:52.4, owner:'dublin',      type:'christian', coastal:true,  garrison:8,  settlement:0, income:10, food:6,  loot:130, lootMax:150, def:1.10 },
  // --- Kontinenten ---
  { id:'frisia',      name:'Frisia',     land:'continent', lng:6.5,  lat:53.2, owner:'frankia',  type:'christian', coastal:true,  garrison:11, settlement:1, income:13, food:8,  loot:140, lootMax:160, def:1.10 },
  { id:'neustria',    name:'Neustrien',  land:'continent', lng:0.2,  lat:49.2, owner:'frankia',  type:'christian', coastal:true,  garrison:12, settlement:1, income:15, food:9,  loot:190, lootMax:210, def:1.20 },
  { id:'frankia',     name:'Austrasien', land:'continent', lng:5.8,  lat:49.9, owner:'frankia',  type:'christian', coastal:false, garrison:18, settlement:2, income:16, food:10, loot:230, lootMax:250, def:1.35 },
  { id:'saxony',      name:'Sachsen',    land:'continent', lng:10.0, lat:52.2, owner:'saxony',   type:'christian', coastal:false, garrison:14, settlement:1, income:13, food:9,  loot:150, lootMax:170, def:1.20 },
  { id:'bayern',      name:'Bayern',     land:'continent', lng:11.5, lat:48.8, owner:'saxony',   type:'christian', coastal:false, garrison:15, settlement:2, income:15, food:9,  loot:170, lootMax:190, def:1.25 },
];

// Landgräns (sea=false, ritas väg) eller sjöled för erövring/marsch (sea=true).
// Sjöraid över längre avstånd kräver INGEN kant (se CONFIG.NAVAL_RAID_KM).
const EDGES = [
  ['halogaland','trondelag',false],['halogaland','uppland',false],['trondelag','hordaland',false],['trondelag','uppland',false],['hordaland','vestfold',false],['vestfold','gotaland',false],['uppland','ostergotland',false],['uppland','gotaland',false],['ostergotland','gotaland',false],['ostergotland','skane',false],['gotaland','skane',false],
  ['pictland','northumbria',false],['pictland','gwynedd',false],['northumbria','mercia',false],['northumbria','eastanglia',false],['gwynedd','mercia',false],['mercia','eastanglia',false],['mercia','wessex',false],['eastanglia','kent',false],['eastanglia','wessex',false],['kent','wessex',false],['gwynedd','wessex',false],
  ['dublin','munster',false],
  ['jylland','frisia',true],['frisia','neustria',false],['frisia','saxony',false],['neustria','frankia',false],['frankia','saxony',false],['frankia','bayern',false],['saxony','bayern',false],
  ['uppland','gotland',true],['gotaland','gotland',true],['ostergotland','gotland',true],['skane','sjaelland',true],['jylland','sjaelland',true],['gotaland','jylland',true],['vestfold','jylland',true],['skane','jylland',true],
  ['hordaland','orkney',true],['orkney','pictland',true],['orkney','northumbria',true],['vestfold','northumbria',true],
  ['dublin','gwynedd',true],['munster','wessex',true],['eastanglia','frisia',true],['kent','neustria',true],['wessex','neustria',true],
];

// Svaga kontext-etiketter för de grå (icke-spelbara) länderna runtom.
const CONTEXT_LABELS = [
  { name:'Island',        lng:-19, lat:65 },
  { name:'Hispania',      lng:-5,  lat:41 },
  { name:'Frankerriket',  lng:2.5, lat:46.5 },
  { name:'Italia',        lng:12,  lat:43 },
  { name:'Gardarike',     lng:34,  lat:58 },
  { name:'Magyarerna',    lng:20,  lat:47 },
];
