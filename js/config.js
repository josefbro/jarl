// ============================================================
//  JARL — config & speldata (vikingatidens norra Europa)
//  Realistiska kustlinjer (LANDS). Resten av Europa visas grått
//  som icke-spelbar kontext (CONTEXT_LANDS). Regioner = Voronoi-
//  celler ur städernas frö-punkter, klippta mot landmassan.
// ============================================================

const CONFIG = {
  WORLD_W: 1000,
  WORLD_H: 1180,

  RECRUIT_BATCH: 5,
  RECRUIT_SILVER: 25,
  RECRUIT_FOOD: 5,
  MAX_SETTLEMENT: 5,

  // försörjning: arméns storlek begränsas HÅRT av matproduktionen
  BASE_SUPPLY: 12,        // grund-försörjning per ätt (liten marginal)
  FOOD_PER_WARRIOR: 1,    // mat/krigare/tur i underhåll
  OVERCAP_DESERT: 0.5,    // andel av överskottet (över taket) som deserterar/tur

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

// Bebyggelse-nivåer. cost = silver för att uppgradera TILL nivån.
// income = silver/tur, food = mat/tur (= försörjning), def = försvarstillägg,
// recruitCap = krigare rekryterbara per tur i provinsen.
const TIERS = [
  { level:0, name:'Torp',     cost:0,   income:0,  food:0,  def:0.00, recruitCap:5  },
  { level:1, name:'By',       cost:60,  income:4,  food:5,  def:0.18, recruitCap:8  },
  { level:2, name:'Köping',   cost:130, income:9,  food:10, def:0.40, recruitCap:12 },
  { level:3, name:'Stad',     cost:230, income:15, food:16, def:0.70, recruitCap:16 },
  { level:4, name:'Borg',     cost:360, income:24, food:22, def:1.05, recruitCap:22 },
  { level:5, name:'Fästning', cost:540, income:36, food:30, def:1.45, recruitCap:30 },
];

// land = landmassa-grupp. (x,y) = stadens läge + Voronoi-frö (geografiskt placerat).
// income/food = landets bas; TIERS adderas ovanpå efter bebyggelsenivå.
const PROVINCES = [
  // --- Skandinaviska halvön (Norge i väster, Sverige i öster) ---
  { id:'trondelag', name:'Trøndelag',  land:'scandia', x:505, y:215, owner:'player',    type:'norse',     garrison:7,  settlement:0, income:9,  food:5,  loot:45,  lootMax:60,  def:1.15 },
  { id:'hordaland', name:'Hordaland',  land:'scandia', x:470, y:360, owner:'player',    type:'norse',     garrison:7,  settlement:0, income:9,  food:4,  loot:40,  lootMax:55,  def:1.10 },
  { id:'vestfold',  name:'Vestfold',   land:'scandia', x:525, y:475, owner:'player',    type:'norse',     garrison:12, settlement:1, income:10, food:5,  loot:30,  lootMax:50,  def:1.10 },
  { id:'uppland',   name:'Uppland',    land:'scandia', x:650, y:340, owner:'bjornsson', type:'norse',     garrison:11, settlement:1, income:10, food:5,  loot:30,  lootMax:50,  def:1.10 },
  { id:'gotaland',  name:'Götaland',   land:'scandia', x:600, y:520, owner:'bjornsson', type:'norse',     garrison:7,  settlement:0, income:9,  food:6,  loot:35,  lootMax:50,  def:1.05 },
  { id:'skane',     name:'Skåne',      land:'scandia', x:548, y:575, owner:'neutral',   type:'norse',     garrison:6,  settlement:0, income:10, food:7,  loot:40,  lootMax:55,  def:1.05 },
  // --- Danmark: Jylland (halvö av kontinenten) + Själland (ö) ---
  { id:'jylland',   name:'Jylland',    land:'continent', x:428, y:648, owner:'ravnsson', type:'norse',    garrison:8,  settlement:0, income:10, food:7,  loot:35,  lootMax:55,  def:1.05 },
  { id:'sjaelland', name:'Sjælland',   land:'zealand',   x:528, y:632, owner:'ravnsson', type:'norse',    garrison:11, settlement:1, income:10, food:6,  loot:35,  lootMax:55,  def:1.10 },
  // --- Gotland ---
  { id:'gotland',   name:'Gotland',    land:'gotland', x:756, y:486, owner:'neutral',   type:'island',    garrison:5,  settlement:0, income:12, food:4,  loot:80,  lootMax:110, def:1.00 },
  // --- Brittiska öarna ---
  { id:'orkney',     name:'Orkneyöarna', land:'orkney',  x:145, y:92,  owner:'neutral',   type:'island',    garrison:4,  settlement:0, income:7,  food:4,  loot:60,  lootMax:80,  def:1.00 },
  { id:'northumbria',name:'Northumbria',  land:'britain', x:215, y:330, owner:'christian', type:'christian', garrison:10, settlement:1, income:13, food:7,  loot:250, lootMax:250, def:1.20 }, // Lindisfarne!
  { id:'mercia',     name:'Mercia',       land:'britain', x:180, y:440, owner:'christian', type:'christian', garrison:13, settlement:1, income:14, food:9,  loot:160, lootMax:180, def:1.20 },
  { id:'eastanglia', name:'East Anglia',  land:'britain', x:235, y:452, owner:'christian', type:'christian', garrison:10, settlement:1, income:13, food:8,  loot:170, lootMax:190, def:1.10 },
  { id:'wessex',     name:'Wessex',       land:'britain', x:190, y:540, owner:'christian', type:'christian', garrison:16, settlement:2, income:14, food:9,  loot:200, lootMax:220, def:1.30 },
  { id:'dublin',     name:'Dublin',       land:'ireland', x:72,  y:432, owner:'christian', type:'christian', garrison:8,  settlement:1, income:11, food:6,  loot:150, lootMax:170, def:1.10 },
  // --- Kontinenten (Frankerriket i väster, Sachsen i öster) ---
  { id:'frisia',     name:'Frisia',       land:'continent', x:345, y:822, owner:'christian', type:'christian', garrison:12, settlement:1, income:13, food:8,  loot:140, lootMax:160, def:1.10 },
  { id:'saxony',     name:'Sachsen',      land:'continent', x:612, y:828, owner:'christian', type:'christian', garrison:14, settlement:1, income:13, food:9,  loot:150, lootMax:170, def:1.20 },
  { id:'frankia',    name:'Frankerriket', land:'continent', x:255, y:850, owner:'christian', type:'christian', garrison:18, settlement:2, income:16, food:10, loot:230, lootMax:250, def:1.35 },
];

// [a, b, sea?] — realistisk angreppslogik (verifierad sammanhängande graf, grad>=2)
// sea=true => långskeppsled över vatten; false => landgräns med väg
const EDGES = [
  ['trondelag','hordaland',false],   // norsk västkust
  ['hordaland','vestfold',false],    // norsk sydkust
  ['trondelag','uppland',false],     // över fjällryggen
  ['vestfold','gotaland',false],     // Bohuslän
  ['uppland','gotaland',false],      // inre Sverige
  ['gotaland','skane',false],        // sydsvensk landfront
  ['uppland','gotland',true],        // Roslagen–Gotland (Östersjön)
  ['gotland','gotaland',true],       // Gotland–östgötakusten
  ['skane','sjaelland',true],        // Öresund
  ['gotaland','jylland',true],       // Kattegatt
  ['jylland','sjaelland',true],      // Stora Bält
  ['jylland','frisia',false],        // Jyllands rot mot Frisien (land)
  ['hordaland','orkney',true],       // Nordsjön (kanonisk norsk utfärd)
  ['vestfold','northumbria',true],   // Lindisfarne-leden 793
  ['orkney','northumbria',true],     // längs Skottlands ostkust
  ['northumbria','mercia',false],
  ['mercia','eastanglia',false],
  ['mercia','wessex',false],
  ['eastanglia','wessex',false],
  ['eastanglia','northumbria',false],// Britanniens ostkust (land)
  ['northumbria','dublin',true],     // runt Skottland till Dublin
  ['dublin','mercia',true],          // Irländska sjön
  ['dublin','wessex',true],          // Bristolkanalen
  ['wessex','frankia',true],         // Engelska kanalen
  ['eastanglia','frisia',true],      // Nordsjön (frisisk-engelsk axel)
  ['frisia','saxony',false],
  ['frisia','frankia',false],        // Rhenmynningen
  ['frankia','saxony',false],
  ['vestfold','jylland',true],       // Skagerrak
  ['skane','jylland',true],          // Kattegatt (dansk kärna)
];

// Spelbara landmassor med realistiska kustlinjer (världskoord). river = flodbana.
const LANDS = {
  scandia: {
    poly: [[525,598],[500,565],[508,545],[486,520],[498,500],[472,470],[486,450],[455,420],[470,400],
           [442,366],[458,348],[430,315],[448,300],[432,268],[452,250],[438,212],[460,196],[450,160],
           [478,140],[470,110],[500,86],[540,72],[596,76],[652,96],[702,120],[716,190],[704,256],
           [710,320],[694,378],[672,430],[648,476],[632,512],[606,548],[578,576],[548,592]],
    river: [[520,170],[560,260],[540,360],[602,440],[600,520]],
  },
  britain: {
    poly: [[138,128],[168,150],[182,210],[206,272],[228,330],[246,388],[266,440],[244,462],[282,486],
           [298,520],[255,550],[208,562],[160,566],[106,582],[132,520],[120,475],[146,440],[120,398],
           [132,350],[108,300],[126,250],[100,200],[126,165]],
    river: [[180,250],[210,340],[185,430],[214,512]],
  },
  ireland: {
    poly: [[60,338],[95,352],[112,402],[106,462],[78,512],[44,520],[22,470],[16,402],[30,356]],
  },
  orkney: {
    poly: [[118,70],[168,74],[172,108],[120,112]],
  },
  gotland: {
    poly: [[732,452],[778,460],[780,512],[734,518]],
  },
  zealand: {
    poly: [[498,602],[556,598],[572,636],[540,668],[498,656]],
  },
  continent: {
    poly: [[428,560],[454,596],[470,656],[472,716],[560,756],[652,772],[742,792],[776,836],[706,886],
           [516,896],[330,892],[206,860],[196,802],[286,772],[366,762],[398,706],[408,648],[412,600]],
    river: [[300,792],[400,822],[500,815],[600,832]],
  },
};

// Icke-spelbar kontext: resten av Europa, ritas grått (inga provinser/städer).
const CONTEXT_LANDS = [
  { label:'Gardarike',                labelPos:[890,250],  poly:[[812,84],[900,98],[968,140],[998,225],[995,330],[966,420],[922,452],[860,430],[820,360],[792,300],[800,180]] },
  { label:'Austrvegr',                labelPos:[895,556],  poly:[[792,476],[864,486],[940,500],[1000,548],[1000,628],[908,624],[820,610],[792,560],[800,516]] },
  { label:'Det västfrankiska riket',  labelPos:[372,1002], poly:[[200,916],[330,916],[512,916],[600,945],[558,1012],[470,1078],[360,1092],[250,1062],[185,992]] },
  { label:'Det östfrankiska riket',   labelPos:[712,1010], poly:[[600,945],[702,916],[776,916],[864,916],[906,986],[856,1086],[716,1126],[600,1092],[558,1012]] },
  { label:'Alperna & Langobardia',    labelPos:[905,1072], poly:[[864,916],[930,952],[978,1030],[998,1110],[960,1172],[872,1170],[820,1118],[856,1086],[906,986]] },
  { label:'Al-Andalus',               labelPos:[112,1036], poly:[[10,916],[118,916],[185,992],[250,1062],[210,1140],[110,1172],[18,1150],[6,1028]] },
];
