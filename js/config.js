// ============================================================
//  JARL — config & speldata (vikingatidens norra Europa)
//  Regioner genereras som Voronoi-celler ur frö-punkterna (x,y),
//  klippta mot sin landmassa (LANDS[*].poly). Se render.js.
// ============================================================

const CONFIG = {
  WORLD_W: 1000,
  WORLD_H: 1180,

  // ekonomi
  RECRUIT_BATCH: 5,
  RECRUIT_SILVER: 25,
  RECRUIT_FOOD: 5,
  SETTLEMENT_INCOME: 4,
  BUILD_BASE_COST: 60,
  MAX_SETTLEMENT: 3,

  // seger / förlust
  RENOWN_TO_WIN: 1200,
  PROVINCES_TO_WIN: 12,
};

// kind: player | viking (AI-ätt) | christian (rikt rovbyte, defensiv) | neutral
const FACTIONS = [
  { id:'player',    name:'Ulfssons ätt',   short:'Du',    color:'#c0392b', kind:'player'    },
  { id:'ravnsson',  name:'Ravnssons ätt',  short:'Ravn',  color:'#2c6e8f', kind:'viking'    },
  { id:'bjornsson', name:'Björnssons ätt', short:'Björn', color:'#7a9a3a', kind:'viking'    },
  { id:'christian', name:'Kristna riken',  short:'Kors',  color:'#9a7b46', kind:'christian' },
  { id:'neutral',   name:'Fria bygder',    short:'Fri',   color:'#8d8674', kind:'neutral'   },
];

// land = landmassa-grupp. (x,y) = stadens läge + Voronoi-frö.
// type: norse | island | christian (rika raid-mål)
const PROVINCES = [
  // --- Skandinaviska halvön ---
  { id:'trondelag', name:'Trøndelag',  land:'scandia', x:452, y:182, owner:'neutral',   type:'norse',     garrison:6,  settlement:0, income:9,  food:5,  loot:45,  lootMax:60,  def:1.15 },
  { id:'hordaland', name:'Hordaland',  land:'scandia', x:372, y:300, owner:'player',    type:'norse',     garrison:7,  settlement:0, income:9,  food:4,  loot:40,  lootMax:55,  def:1.10 },
  { id:'vestfold',  name:'Vestfold',   land:'scandia', x:458, y:432, owner:'player',    type:'norse',     garrison:12, settlement:1, income:12, food:6,  loot:30,  lootMax:50,  def:1.10 },
  { id:'uppland',   name:'Uppland',    land:'scandia', x:624, y:300, owner:'bjornsson', type:'norse',     garrison:11, settlement:1, income:12, food:6,  loot:30,  lootMax:50,  def:1.10 },
  { id:'gotaland',  name:'Götaland',   land:'scandia', x:548, y:466, owner:'bjornsson', type:'norse',     garrison:7,  settlement:0, income:10, food:6,  loot:35,  lootMax:50,  def:1.05 },
  { id:'skane',     name:'Skåne',      land:'scandia', x:524, y:556, owner:'neutral',   type:'norse',     garrison:6,  settlement:0, income:11, food:7,  loot:40,  lootMax:55,  def:1.05 },
  // --- Danmark ---
  { id:'jylland',   name:'Jylland',    land:'denmark', x:388, y:650, owner:'ravnsson',  type:'norse',     garrison:8,  settlement:0, income:11, food:7,  loot:35,  lootMax:55,  def:1.05 },
  { id:'sjaelland', name:'Sjælland',   land:'denmark', x:466, y:668, owner:'ravnsson',  type:'norse',     garrison:11, settlement:1, income:12, food:6,  loot:35,  lootMax:55,  def:1.10 },
  // --- Gotland ---
  { id:'gotland',   name:'Gotland',    land:'gotland', x:722, y:474, owner:'neutral',   type:'island',    garrison:5,  settlement:0, income:13, food:3,  loot:80,  lootMax:110, def:1.00 },
  // --- Brittiska öarna ---
  { id:'orkney',     name:'Orkneyöarna', land:'orkney',  x:238, y:332, owner:'neutral',   type:'island',    garrison:4,  settlement:0, income:8,  food:3,  loot:60,  lootMax:80,  def:1.00 },
  { id:'northumbria',name:'Northumbria',  land:'britain', x:198, y:452, owner:'christian', type:'christian', garrison:10, settlement:1, income:15, food:8,  loot:250, lootMax:250, def:1.20 }, // Lindisfarne!
  { id:'mercia',     name:'Mercia',       land:'britain', x:196, y:548, owner:'christian', type:'christian', garrison:13, settlement:1, income:16, food:9,  loot:160, lootMax:180, def:1.20 },
  { id:'eastanglia', name:'East Anglia',  land:'britain', x:262, y:600, owner:'christian', type:'christian', garrison:9,  settlement:0, income:14, food:8,  loot:170, lootMax:190, def:1.10 },
  { id:'wessex',     name:'Wessex',       land:'britain', x:176, y:668, owner:'christian', type:'christian', garrison:16, settlement:2, income:18, food:10, loot:200, lootMax:220, def:1.30 },
  { id:'dublin',     name:'Dublin',       land:'ireland', x:72,  y:536, owner:'christian', type:'christian', garrison:8,  settlement:1, income:13, food:6,  loot:150, lootMax:170, def:1.10 },
  // --- Kontinenten ---
  { id:'frisia',     name:'Frisia',       land:'continent', x:425, y:770, owner:'christian', type:'christian', garrison:9,  settlement:0, income:14, food:8,  loot:140, lootMax:160, def:1.10 },
  { id:'saxony',     name:'Sachsen',      land:'continent', x:560, y:792, owner:'christian', type:'christian', garrison:14, settlement:1, income:15, food:9,  loot:150, lootMax:170, def:1.20 },
  { id:'frankia',    name:'Frankerriket', land:'continent', x:286, y:800, owner:'christian', type:'christian', garrison:18, settlement:2, income:20, food:11, loot:230, lootMax:250, def:1.35 },
];

// [a, b, sea?] — sjövägar (sea=true) ritas som långskeppsleder; land = vägar med broar
const EDGES = [
  ['trondelag','hordaland',false],
  ['hordaland','vestfold',false],
  ['trondelag','uppland',false],
  ['vestfold','gotaland',false],
  ['uppland','gotaland',false],
  ['gotaland','skane',false],
  ['uppland','gotland',true],
  ['gotland','gotaland',true],
  ['skane','gotland',true],
  ['skane','sjaelland',true],
  ['gotaland','jylland',true],
  ['jylland','sjaelland',false],
  ['jylland','frisia',true],
  ['hordaland','orkney',true],
  ['trondelag','orkney',true],
  ['vestfold','northumbria',true],
  ['orkney','northumbria',true],
  ['northumbria','mercia',false],
  ['mercia','eastanglia',false],
  ['mercia','wessex',false],
  ['eastanglia','wessex',false],
  ['northumbria','dublin',true],
  ['dublin','mercia',true],
  ['dublin','wessex',true],
  ['wessex','frankia',true],
  ['eastanglia','frisia',true],
  ['frisia','saxony',false],
  ['frisia','frankia',false],
  ['frankia','saxony',false],
  ['sjaelland','eastanglia',true],
  ['jylland','northumbria',true],
];

// Landmassor: poly = ytterkontur (världskoordinater, medurs), river = flodbana (valfri)
const LANDS = {
  scandia: {
    poly: [[432,120],[524,128],[616,170],[688,262],[716,362],[676,464],[612,548],[558,602],[506,584],[464,520],[416,470],[368,402],[346,322],[362,222],[392,150]],
    river: [[506,150],[540,242],[498,322],[558,402],[560,488],[538,556]],
  },
  denmark: {
    poly: [[342,612],[472,610],[516,652],[492,706],[398,716],[346,676]],
  },
  gotland: {
    poly: [[696,442],[750,450],[752,502],[700,506]],
  },
  britain: {
    poly: [[150,388],[268,398],[300,470],[300,560],[268,642],[210,712],[138,710],[96,620],[84,498],[104,420]],
    river: [[176,418],[212,496],[186,580],[224,656]],
  },
  orkney: {
    poly: [[210,306],[266,310],[270,356],[214,360]],
  },
  ireland: {
    poly: [[28,482],[112,486],[122,560],[60,602],[24,546]],
  },
  continent: {
    poly: [[198,734],[470,724],[612,734],[678,796],[600,872],[330,874],[214,816]],
    river: [[300,740],[372,792],[470,800],[566,820]],
  },
};
