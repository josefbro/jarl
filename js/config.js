// ============================================================
//  JARL — config & speldata (vikingatidens norra Europa)
//  Logisk värld är WORLD_W x WORLD_H. Kartan skalas till
//  skärmen vid rendering (se render.js).
// ============================================================

const CONFIG = {
  WORLD_W: 1000,
  WORLD_H: 1180,
  NODE_R: 26,            // provinsnodens radie i världsenheter
  HIT_R: 58,             // träffradie för touch i världsenheter

  // ekonomi
  RECRUIT_BATCH: 5,
  RECRUIT_SILVER: 25,    // per batch
  RECRUIT_FOOD: 5,       // per batch
  SETTLEMENT_INCOME: 4,  // bonus-silver per bebyggelsenivå
  BUILD_BASE_COST: 60,   // * (nivå + 1)
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
  { id:'christian', name:'Kristna riken',  short:'Kors',  color:'#9a8a66', kind:'christian' },
  { id:'neutral',   name:'Fria bygder',    short:'Fri',   color:'#6f6f6f', kind:'neutral'   },
];

// type: norse (Skandinavien) | island | christian (rika raid-mål)
const PROVINCES = [
  // --- Norge ---
  { id:'trondelag', name:'Trøndelag',     x:445, y:170, owner:'neutral',   type:'norse',     garrison:6,  settlement:0, income:9,  food:5,  loot:45,  lootMax:60,  def:1.15 },
  { id:'hordaland', name:'Hordaland',     x:378, y:300, owner:'player',    type:'norse',     garrison:7,  settlement:0, income:9,  food:4,  loot:40,  lootMax:55,  def:1.10 },
  { id:'vestfold',  name:'Vestfold',      x:470, y:420, owner:'player',    type:'norse',     garrison:12, settlement:1, income:12, food:6,  loot:30,  lootMax:50,  def:1.10 },
  // --- Sverige ---
  { id:'uppland',   name:'Uppland',       x:618, y:325, owner:'bjornsson', type:'norse',     garrison:11, settlement:1, income:12, food:6,  loot:30,  lootMax:50,  def:1.10 },
  { id:'gotaland',  name:'Götaland',      x:558, y:470, owner:'bjornsson', type:'norse',     garrison:7,  settlement:0, income:10, food:6,  loot:35,  lootMax:50,  def:1.05 },
  { id:'skane',     name:'Skåne',         x:548, y:560, owner:'neutral',   type:'norse',     garrison:6,  settlement:0, income:11, food:7,  loot:40,  lootMax:55,  def:1.05 },
  { id:'gotland',   name:'Gotland',       x:690, y:470, owner:'neutral',   type:'island',    garrison:5,  settlement:0, income:13, food:3,  loot:80,  lootMax:110, def:1.00 },
  // --- Danmark ---
  { id:'jylland',   name:'Jylland',       x:430, y:560, owner:'ravnsson',  type:'norse',     garrison:8,  settlement:0, income:11, food:7,  loot:35,  lootMax:55,  def:1.05 },
  { id:'sjaelland', name:'Sjælland',      x:520, y:585, owner:'ravnsson',  type:'norse',     garrison:11, settlement:1, income:12, food:6,  loot:35,  lootMax:55,  def:1.10 },
  // --- Brittiska öarna ---
  { id:'orkney',     name:'Orkneyöarna',  x:250, y:285, owner:'neutral',   type:'island',    garrison:4,  settlement:0, income:8,  food:3,  loot:60,  lootMax:80,  def:1.00 },
  { id:'northumbria',name:'Northumbria',  x:222, y:455, owner:'christian', type:'christian', garrison:10, settlement:1, income:15, food:8,  loot:250, lootMax:250, def:1.20 }, // Lindisfarne!
  { id:'mercia',     name:'Mercia',       x:198, y:560, owner:'christian', type:'christian', garrison:13, settlement:1, income:16, food:9,  loot:160, lootMax:180, def:1.20 },
  { id:'eastanglia', name:'East Anglia',  x:288, y:585, owner:'christian', type:'christian', garrison:9,  settlement:0, income:14, food:8,  loot:170, lootMax:190, def:1.10 },
  { id:'wessex',     name:'Wessex',       x:188, y:662, owner:'christian', type:'christian', garrison:16, settlement:2, income:18, food:10, loot:200, lootMax:220, def:1.30 },
  { id:'dublin',     name:'Dublin',       x:92,  y:520, owner:'christian', type:'christian', garrison:8,  settlement:1, income:13, food:6,  loot:150, lootMax:170, def:1.10 },
  // --- Kontinenten ---
  { id:'frisia',     name:'Frisia',       x:430, y:702, owner:'christian', type:'christian', garrison:9,  settlement:0, income:14, food:8,  loot:140, lootMax:160, def:1.10 },
  { id:'saxony',     name:'Sachsen',      x:540, y:742, owner:'christian', type:'christian', garrison:14, settlement:1, income:15, food:9,  loot:150, lootMax:170, def:1.20 },
  { id:'frankia',    name:'Frankerriket', x:300, y:762, owner:'christian', type:'christian', garrison:18, settlement:2, income:20, food:11, loot:230, lootMax:250, def:1.35 },
];

// [a, b, sea?] — sjövägar (dash) låter långskeppen slå till över vatten
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
  ['jylland','sjaelland',true],
  ['jylland','frisia',false],
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

// stiliserade landmassor (världskoordinater) som ritas bakom noderna
const LANDMASSES = [
  // Skandinaviska halvön
  [[430,110],[510,120],[580,180],[660,290],[722,420],[660,520],[600,600],[545,615],[500,560],[470,470],[410,380],[372,270],[388,170]],
  // Jylland
  [[395,520],[475,520],[505,580],[470,635],[405,615],[378,560]],
  // Sjælland
  [[493,560],[562,560],[567,608],[503,618]],
  // Gotland
  [[665,445],[717,455],[717,500],[668,505]],
  // Storbritannien
  [[150,400],[300,410],[322,520],[300,612],[235,702],[160,700],[120,600],[112,480]],
  // Irland
  [[42,460],[140,465],[156,556],[92,596],[38,540]],
  // Orkney
  [[224,255],[286,260],[286,312],[226,316]],
  // Kontinenten
  [[232,668],[470,655],[600,665],[672,760],[600,862],[330,866],[224,802],[200,720]],
];
