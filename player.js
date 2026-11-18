/* EARTH POST 玩家角色：觀察員（2026-11-08 使用者決定，角色圖 art/player.webp）。
   只有一個角色，只換制服顏色（七色）；另可上傳自己的照片當頭像。 */
const UNIFORMS = {   // 七色觀察員（使用者提供的角色圖 art/player_<色>.webp，2026-11-08）
  green:  { name: "森林綠", c: "#6b7a3c", d: "#4f5b2a" },
  blue:   { name: "天空藍", c: "#4f8fd0", d: "#3a6fa8" },
  teal:   { name: "湖水綠", c: "#2f8a6a", d: "#236a51" },
  yellow: { name: "芥末黃", c: "#d1a23a", d: "#a9812a" },
  red:    { name: "磚紅",   c: "#b4493b", d: "#8e372c" },
  purple: { name: "薰衣草紫", c: "#8f78c8", d: "#6f5aa6" },
  coral:  { name: "珊瑚橘", c: "#d9684c", d: "#b1513a" }
};
const PLAYER_KEY = "ep-player";
function loadPlayer() {
  const p = { uniform: "green", avatar: "char", photo: null };
  try { Object.assign(p, JSON.parse(localStorage.getItem(PLAYER_KEY) || "{}")); } catch (e) {}
  try { p.photo = localStorage.getItem("ep-photo"); } catch (e) {}
  if (!UNIFORMS[p.uniform]) p.uniform = "green";
  return p;
}
function savePlayer(p) {
  try { localStorage.setItem(PLAYER_KEY, JSON.stringify({ uniform: p.uniform, avatar: p.avatar })); } catch (e) {}
}
function savePhoto(dataUrl) {
  try { dataUrl ? localStorage.setItem("ep-photo", dataUrl) : localStorage.removeItem("ep-photo"); return true; } catch (e) { return false; }
}
/* full-body chibi; face=true returns a head-and-shoulders crop for avatars */
function playerSVG(uniform, face) {
  /* 觀察員角色圖（使用者提供，2026-11-08）。外框維持原本 120×170 的比例，各畫面的版面不用改；
     face=true 取頭部當頭像。 */
  const key = UNIFORMS[uniform] ? uniform : "green";
  const vb = face ? "30 1 60 60" : "0 0 120 170";
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="玩家觀察員">
  <image href="art/player_${key}.webp" x="0" y="0" width="120" height="170" preserveAspectRatio="xMidYMax meet"/></svg>`;
}
/* 先載入目前制服的角色圖，切換畫面時不會先空白一下 */
try { new Image().src = `art/player_${loadPlayer().uniform}.webp`; } catch (e) {}
/* downscale an uploaded image to a 256px square JPEG data URL (center crop) */
function photoToDataUrl(file) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error("請選擇圖片檔"));
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("讀取失敗"));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error("無法開啟這張圖片"));
      im.onload = () => {
        const s = Math.min(im.width, im.height), cv = document.createElement("canvas");
        cv.width = cv.height = 256;
        cv.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 256, 256);
        res(cv.toDataURL("image/jpeg", 0.85));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* 城市（玩家必填；用選單避免自由輸入個資）。座標為縣市概略中心點，示意用，距離取直線。
   island=true：和台灣本島之間要跨海，只有會飛的郵差能送。 */
const CITIES = {
  "台北市":[25.04,121.56],"新北市":[25.01,121.46],"基隆市":[25.13,121.74],"桃園市":[24.99,121.30],
  "新竹市":[24.80,120.97],"新竹縣":[24.84,121.01],"苗栗縣":[24.56,120.82],"台中市":[24.15,120.67],
  "彰化縣":[24.08,120.54],"南投縣":[23.90,120.69],"雲林縣":[23.71,120.43],"嘉義市":[23.48,120.45],
  "嘉義縣":[23.46,120.25],"台南市":[22.99,120.21],"高雄市":[22.63,120.30],"屏東縣":[22.67,120.49],
  "宜蘭縣":[24.75,121.75],"花蓮縣":[23.99,121.60],"台東縣":[22.76,121.14],
  "澎湖縣":[23.57,119.58,1],"金門縣":[24.43,118.32,1],"連江縣":[26.16,119.95,1]
};
/* 筆友只用國家計算：首都概略座標 */
const COUNTRIES = { "台灣":[25.04,121.56], "日本":[35.68,139.69], "越南":[21.03,105.85], "韓國":[37.57,126.98], "泰國":[13.75,100.50], "菲律賓":[14.60,120.98], "馬來西亞":[3.14,101.69] };
function distKm(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
function cityOptions(sel) {
  return `<option value="" ${sel ? "" : "selected"} disabled>請選擇縣市</option>` +
    Object.keys(CITIES).map(c => `<option ${c === sel ? "selected" : ""}>${c}</option>`).join("");
}

/* 國際信件：轉運接力（依 drafts/social_letters_v0.1.md T1–T11）。
   筆友信：自己的郵差 → 最近的郵站 → 國際轉運 → 對方國家的當地生物送到筆友手上；
   回信：對方的生物 → 國際轉運 → 你最近的郵站 → 駐站生物送到你手上。好友互寄不走轉運。 */
const HUBS = { "台北": "台北市", "台中": "台中市", "高雄": "高雄市", "花蓮": "花蓮縣" };   // 北中南東四站（T7）
const INTL_H_PER_1000 = 3;                                                                     // 【暫定】國際轉運每 1,000 km 約 3 小時（T3）
function nearestHub(city) {
  const here = CITIES[city] || CITIES["台北市"];
  let best = null;
  Object.entries(HUBS).forEach(([hub, c]) => { const km = distKm(here, CITIES[c]); if (!best || km < best.km) best = { hub, km }; });
  return best;                                   // 離島也算到最近的本島郵站，要會飛的郵差（T8）
}
/* 駐站生物：遊戲安排，暫定（T10）。五種原型生物在台灣都廣泛分布，不代表只在那裡。 */
const STATIONS = { "台北": ["heron", "cat"], "台中": ["butterfly", "dog"], "高雄": ["heron", "butterfly"], "花蓮": ["macaque", "dog"] };
/* 外國送信生物：示意名單，全部待查（T11）。先避開瀕危物種。 */
const FOREIGN = {
  "日本": [["jp_macaque", "日本獼猴", "🐒"], ["jp_pheasant", "日本綠雉", "🐦"]],
  "韓國": [["kr_magpie", "東方喜鵲", "🐦"], ["kr_squirrel", "歐亞紅松鼠", "🐿️"]],
  "越南": [["vn_robin", "鵲鴝", "🐦"], ["vn_leopardcat", "豹貓", "🐈"]],
  "泰國": [["th_monitor", "水巨蜥", "🦎"], ["th_myna", "家八哥", "🐦"]],
  "菲律賓": [["ph_sunbird", "黃腹花蜜鳥", "🐦"]],   // 原「黃腰太陽鳥」，2026-11-12 依 GPT 查證改（Cinnyris jugularis，中文名暫用）
  "馬來西亞": [["my_tailorbird", "長尾縫葉鶯", "🐦"], ["my_mousedeer", "小鼷鹿", "🦌"]]   // 冠斑犀鳥 IUCN VU（2018）照設計稿 4.6 不當送信生物；2026-11-12 換成長尾縫葉鶯（GPT 查證，只分布於馬來半島）
};
/* 已退役的送信生物：不再送信，但留著資料，已收到的明信片照樣顯示 */
const FOREIGN_RETIRED = { "馬來西亞": [["my_hornbill", "冠斑犀鳥", "🐦"]] };
/* 外國生物明信片正面：[小知識, 棲地背景]。
   小知識＝真實資料，依 GPT 查證（給GPT的指令/回報_2026-11-12_外國送信生物.md，部分查核、未寫入查證系統）。
   鵲鴝的小知識來源不足，先不顯示（null）。棲地背景是從 6 張台灣棲地圖裡選最接近的（遊戲美術選擇）。
   學名：日本獼猴 Macaca fuscata｜日本綠雉 Phasianus versicolor｜東方喜鵲 Pica serica｜歐亞紅松鼠 Sciurus vulgaris｜鵲鴝 Copsychus saularis｜
   豹貓 Prionailurus bengalensis｜水巨蜥 Varanus salvator｜家八哥 Acridotheres tristis｜黃腹花蜜鳥 Cinnyris jugularis｜冠斑犀鳥 Rhyticeros undulatus（已退役）｜小鼷鹿 Tragulus kanchil｜長尾縫葉鶯 Orthotomus sutorius（回報_2026-11-12_馬來西亞替代送信生物.md） */
const FOREIGN_INFO = {
  jp_macaque: ["臉和臀部裸露的皮膚是紅色的。", "forest"], jp_pheasant: ["日本特有種，也是日本的國鳥。", "farm"],
  kr_magpie: ["黑白羽色搭配長尾巴，很容易辨認。", "farm"], kr_squirrel: ["會把植物種子帶到別處，幫助種子散播。", "forest"],
  vn_robin: [null, "park"], vn_leopardcat: ["黃褐色的身體有醒目的黑色斑點。", "forest"],
  th_monitor: ["會游泳，也常沿著水邊活動。", "river"], th_myna: ["會在地面覓食，也能適應城鎮環境。", "park"],
  ph_sunbird: ["吃花蜜，也會幫花朵傳粉。", "park"], my_hornbill: ["雄鳥的喉囊有一道黑色橫帶。", "forest"],
  my_mousedeer: ["脖子下面有三道白色條紋。", "forest"],
  my_tailorbird: ["會用植物纖維或蜘蛛絲把葉片縫合成巢。", "park"] };
const FOREIGN_BY_ID = {};
[FOREIGN, FOREIGN_RETIRED].forEach(src => Object.entries(src).forEach(([country, list]) => list.forEach(([id, name, icon]) => FOREIGN_BY_ID[id] = { id, name, icon, country })));
/* 外國送信生物的 2D 美術（v0.48.0）：有圖的用圖，沒有的（已退役的冠斑犀鳥）仍用表情符號 */
["jp_macaque","jp_pheasant","kr_magpie","kr_squirrel","vn_robin","vn_leopardcat","th_monitor","th_myna","ph_sunbird","my_tailorbird","my_mousedeer"].forEach(id => { if (FOREIGN_BY_ID[id]) FOREIGN_BY_ID[id].img = `art/${id}.webp`; });
const foreignIconHTML = k => k.img ? `<img src="${k.img}" alt="${k.name}" style="width:100%;height:100%;object-fit:contain">` : k.icon;
const pickForeign = country => { const l = FOREIGN[country] || []; const x = l[Math.floor(Math.random() * l.length)]; return x ? FOREIGN_BY_ID[x[0]] : null; };
/* 明信片冊（T5）：收到筆友回信時，得到一張送信生物的明信片。不算進圖鑑進度。 */
const PCARD_KEY = "ep-pcards";
function loadPCards() { try { return JSON.parse(localStorage.getItem(PCARD_KEY) || "[]"); } catch (e) { return []; } }
function addPCard(card) {                                    // 回傳 true＝第一次拿到這種生物的明信片
  const all = loadPCards(), isNew = !all.some(c => c.id === card.id);
  all.push(Object.assign({ date: todayStr() }, card));
  try { localStorage.setItem(PCARD_KEY, JSON.stringify(all)); } catch (e) {}
  return isNew;
}
const pcardKinds = () => [...new Set(loadPCards().map(c => c.id))];   // 可當特別明信片正面（T6）

/* 已擁有的郵差（好感達門檻的生物）。原型示意：台灣獼猴好感 1／4，尚未成為郵差。
   送信、明信片、「我的」都以這份名單為準。 */
/* 圖鑑進度（原型存在裝置上）。state：none 未發現／seen 目擊／recorded 已記錄／courier 郵差 */
const DEX_KEY = "ep-dex";
const THRESH = { butterfly: 2, dog: 3, cat: 3, heron: 3, macaque: 4, dolphin: Infinity,
  bluemagpie: 4, barbet: 3, thrush: 3, frog: 3,     // 第一批新生物（v0.10.0，門檻為遊戲規則・暫定）
  eagle: 4, bpartridge: 3, hare: 3, civet: 3,       // 第二批一般生物（v0.11.0）
  mikado: Infinity, swinhoe: Infinity, tpartridge: Infinity, warbler: Infinity, viper: Infinity, badger: Infinity,
  babbler: 3, yuhina: 3, shrew: 4, flyingsq: 5, squirrel: 3, keelback: Infinity,
  egret: 3, reefheron: 4, nheron: 3, kingfisher: 3, robin: 4, liocichla: 3, sparrow: 3, munia: 3, grassfrog: 3, firefly: 3, peacock: 3, ghostcrab: 4, rissos: 4, anemonefish: 3 };   // 海洋生物（v0.51.0，遊戲規則・暫定）  // 認養地在地生物（v0.27.0，遊戲規則・暫定）   // 第三批（v0.21.0，草稿 new_species_batch3_v0.1.md）
/* 觀察限定：只觀察記錄、不能成為郵差（瀕危物種，以及 v0.11.0 加入的稀有、高海拔、要保持距離的生物）。
   觀察記錄成功後，解鎖特別明信片樣式。 */
const OBSERVE_ONLY = ["dolphin", "mikado", "swinhoe", "tpartridge", "warbler", "viper", "badger", "keelback"];
const OBS_TAG = { dolphin: "瀕危", viper: "保持距離", badger: "保持距離", keelback: "保持距離" };   // 其他：觀察限定
const obsTag = k => OBS_TAG[k] || "觀察限定";
const MOUNTAIN_SAFE = "高海拔山區：注意天候與裝備、走在步道上，不要為了找牠冒險";
const OBS_SAFETY = {
  dolphin: "瀕危保育類：只在岸上遠遠觀察，不乘船追逐、不靠近、不餵食",
  viper: "毒蛇：請保持距離，不要靠近、觸碰或驚擾牠；看到就慢慢退開",
  badger: "請保持距離，不要觸碰或撿拾；台灣鼬獾曾是狂犬病病毒的宿主",
  mikado: MOUNTAIN_SAFE, swinhoe: MOUNTAIN_SAFE, tpartridge: MOUNTAIN_SAFE,
  warbler: "稀有過境鳥：安靜遠觀，不要追逐或播放鳥音引誘",
  keelback: "請保持距離，不要觸碰或撿拾；看到蛇時，慢慢繞開並告訴身邊的大人"
};
const DEX_DEMO = {
  dog: { state: "courier", aff: 4, notes: [] }, cat: { state: "courier", aff: 3, notes: [] },
  butterfly: { state: "courier", aff: 2, notes: [] }, heron: { state: "courier", aff: 5, notes: [] },
  macaque: { state: "recorded", aff: 1, notes: [] },
  dolphin: { state: "none", aff: 0, notes: [] },
  bluemagpie: { state: "none", aff: 0, notes: [] }, barbet: { state: "none", aff: 0, notes: [] },
  thrush: { state: "none", aff: 0, notes: [] }, frog: { state: "none", aff: 0, notes: [] },
  eagle: { state: "none", aff: 0, notes: [] }, bpartridge: { state: "none", aff: 0, notes: [] }, hare: { state: "none", aff: 0, notes: [] }, civet: { state: "none", aff: 0, notes: [] },
  mikado: { state: "none", aff: 0, notes: [] }, swinhoe: { state: "none", aff: 0, notes: [] }, tpartridge: { state: "none", aff: 0, notes: [] },
  warbler: { state: "none", aff: 0, notes: [] }, viper: { state: "none", aff: 0, notes: [] }, badger: { state: "none", aff: 0, notes: [] },
  babbler: { state: "none", aff: 0, notes: [] }, yuhina: { state: "none", aff: 0, notes: [] }, keelback: { state: "none", aff: 0, notes: [] },
  shrew: { state: "none", aff: 0, notes: [] }, flyingsq: { state: "none", aff: 0, notes: [] }, squirrel: { state: "none", aff: 0, notes: [] },
  egret: { state: "none", aff: 0, notes: [] }, reefheron: { state: "none", aff: 0, notes: [] }, nheron: { state: "none", aff: 0, notes: [] }, kingfisher: { state: "none", aff: 0, notes: [] }, robin: { state: "none", aff: 0, notes: [] }, liocichla: { state: "none", aff: 0, notes: [] }, sparrow: { state: "none", aff: 0, notes: [] }, munia: { state: "none", aff: 0, notes: [] }, grassfrog: { state: "none", aff: 0, notes: [] }, firefly: { state: "none", aff: 0, notes: [] }, peacock: { state: "none", aff: 0, notes: [] }, ghostcrab: { state: "none", aff: 0, notes: [] }, rissos: { state: "none", aff: 0, notes: [] }, anemonefish: { state: "none", aff: 0, notes: [] }
};
function loadDex() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DEX_KEY) || "null"); } catch (e) {}
  if (!(d && d.dog)) return JSON.parse(JSON.stringify(DEX_DEMO));
  Object.keys(DEX_DEMO).forEach(k => { if (!d[k]) d[k] = { state: "none", aff: 0, notes: [] }; });   /* 新加入的生物補上 */
  return d;
}
function saveDex(d) { try { localStorage.setItem(DEX_KEY, JSON.stringify(d)); } catch (e) {} }
function resetDex(empty) {
  const d = {};
  Object.keys(DEX_DEMO).forEach(k => d[k] = empty ? { state: "none", aff: 0, notes: [] } : JSON.parse(JSON.stringify(DEX_DEMO[k])));
  saveDex(d); return d;
}
const DEX = loadDex();
const OWNED = Object.keys(DEX).filter(k => DEX[k].state === "courier");

/* 郵戳章：圓形郵戳（雙圈＋弧形文字），中央是該國地圖（台灣＝台灣島與離島、日本＝日本列島）。
   參考使用者提供的郵戳圖；不放任何郵政機構或郵局名稱。日期＝取得那天。輪廓為手繪示意。 */
const STAMP_SHAPES = {
  tw: { name: "TAIWAN", g: "translate(100 100) scale(.62) translate(-50 -80)",
        paths: ["M62 6 C70 8 76 14 74 22 C72 34 78 46 76 60 C74 78 70 96 64 112 C60 124 56 138 50 152 C46 146 42 136 38 126 C30 112 24 98 22 84 C20 70 24 56 30 44 C38 30 48 14 62 6 Z"],
        isles: [[10,86,4],[14,96,2.6],[-18,58,2.4],[2,20,2],[82,118,2.2],[78,140,2.6]] },
  jp: { name: "JAPAN", g: "translate(100 100) scale(.5) translate(-80 -80)",
        paths: [
        "M104 8 c10-4 24 0 28 8 c4 9-4 18-14 20 c-9 2-18-2-20-10 c-2-7 0-14 6-18z",
        "M100 40 c10 2 10 14 4 22 c-6 10-10 22-16 30 c-8 10-20 18-32 24 c-12 6-26 8-30 2 c-3-5 3-9 10-12 c12-5 22-11 30-19 c8-9 12-20 18-30 c4-8 8-19 16-17z",
        "M50 118 c7-2 16 0 16 6 c0 5-9 7-16 6 c-6-1-7-10 0-12z",
        "M28 116 c7-2 14 2 14 11 c0 9-7 15-14 15 c-7 0-11-9-9-16 c1-5 4-9 9-10z"],
        isles: [[14,150,2.4],[8,158,2]] }
};
const STAMP_DATES_KEY = "ep-stamp-dates";
function todayStr() { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; }
function stampDate(key) { try { return (JSON.parse(localStorage.getItem(STAMP_DATES_KEY) || "{}"))[key] || null; } catch (e) { return null; } }
function recordStamp(key) {   /* 第一次取得時記下日期，之後不覆寫 */
  try { const m = JSON.parse(localStorage.getItem(STAMP_DATES_KEY) || "{}"); if (!m[key]) { m[key] = todayStr(); localStorage.setItem(STAMP_DATES_KEY, JSON.stringify(m)); } return m[key]; }
  catch (e) { return todayStr(); }
}
let _stampN = 0;
/* 國家郵戳：明信片第一次寄到某個國家時取得。日本有地圖外形，其他國家先用國名（地圖之後由美術補）。 */
const COUNTRY_EN = { "日本": "japan", "韓國": "korea", "越南": "vietnam", "泰國": "thailand", "菲律賓": "philippines", "馬來西亞": "malaysia" };
const COUNTRY_SHAPE = { "日本": "jp" };
const CSTAMP_KEY = "ep-cstamps";
function loadCountryStamps() { try { return JSON.parse(localStorage.getItem(CSTAMP_KEY) || "{}"); } catch (e) { return {}; } }
function addCountryStamp(c) { const m = loadCountryStamps(); if (m[c]) return false; m[c] = todayStr(); try { localStorage.setItem(CSTAMP_KEY, JSON.stringify(m)); } catch (e) {} if (typeof addFlowers === "function") addFlowers(EARN.stamp); return true; }   // 新國家郵戳 +20 小花
function countryStampSVG(c, got, date) { return stampSVG(COUNTRY_SHAPE[c] || c, c, got, date); }
function stampSVG(country, label, got, date) {
  const s = STAMP_SHAPES[country] || { name: (COUNTRY_EN[country] || country || "").toUpperCase(), paths: [], isles: [], g: "" }, id = "stp" + (++_stampN);
  const noMap = !s.paths.length;
  const ink = got ? "#c0392b" : "#c9bc9c";
  const dt = date || todayStr(), [y, m, d] = dt.split(".");
  const top = `${s.name} - EARTH POST`;
  const bottom = got ? `${label} - ${dt}` : "？ - ????.??.??";
  const inner = got ? `${y}年${+m}月${+d}日 - ${label}` : "尚未取得";
  return `<svg viewBox="0 0 200 200" class="stampsvg" role="img" aria-label="${got ? `${label}郵戳，${dt}` : "未取得的郵戳"}">
  <defs>
    <path id="${id}t" d="M 27 100 A 73 73 0 0 1 173 100"/>
    <path id="${id}b" d="M 21 100 A 79 79 0 0 0 179 100"/>
    <path id="${id}i" d="M 50 100 A 50 50 0 0 1 150 100"/>
    <filter id="${id}f" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves="3" seed="${_stampN}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.9" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter>
  </defs>
  <g filter="${got ? `url(#${id}f)` : ""}" fill="none" stroke="${ink}">
    <circle cx="100" cy="100" r="94" stroke-width="6"/>
    <circle cx="100" cy="100" r="86" stroke-width="2.2"/>
    <circle cx="100" cy="100" r="62" stroke-width="2.2"/>
    <g fill="${ink}" stroke="none" font-family="Noto Sans TC, sans-serif" font-weight="900">
      <text font-size="15" letter-spacing="1.5"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${top}</textPath></text>
      <text font-size="${label.length > 4 ? 14 : 16}" letter-spacing="1"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${bottom}</textPath></text>
      <text font-size="9.5"><textPath href="#${id}i" startOffset="50%" text-anchor="middle">${inner}</textPath></text>
      <g transform="${s.g}">
        ${s.paths.map(p => `<path d="${p}" ${got ? "" : `fill="none" stroke="${ink}" stroke-width="3"`}/>`).join("")}
        ${s.isles.map(([x, yy, r]) => `<circle cx="${x}" cy="${yy}" r="${r}" ${got ? "" : `fill="${ink}" opacity=".6"`}/>`).join("")}
      </g>
      ${got ? "" : `<text x="100" y="108" text-anchor="middle" font-size="22">？</text>`}
      ${noMap && got ? `<text x="100" y="${label.length > 3 ? 104 : 108}" text-anchor="middle" font-size="${label.length > 3 ? 22 : 30}">${label}</text>` : ""}
    </g>
  </g></svg>`;
}

/* 玩家「精神」：每次探索 -1，用完不能探索。上限＝5＋floor(等級÷5)；每 30 分鐘 +1（暫定）。 */
const PLAYER_LEVEL = 6;            // 原型示意等級（和「我的」頁一致）
const SPIRIT_KEY = "ep-spirit", SPIRIT_MIN = 30;
const spiritMax = (lv = PLAYER_LEVEL) => 5 + Math.floor(lv / 5);
function loadSpirit() {
  const max = spiritMax();
  let s = { v: max, t: Date.now() };
  try { const x = JSON.parse(localStorage.getItem(SPIRIT_KEY) || "null"); if (x && typeof x.v === "number") s = x; } catch (e) {}
  const gained = Math.floor((Date.now() - s.t) / (SPIRIT_MIN * 60000));
  if (gained > 0) { s.v = Math.min(max, s.v + gained); s.t += gained * SPIRIT_MIN * 60000; }
  if (s.v >= max) { s.v = max; s.t = Date.now(); }
  return s;
}
function saveSpirit(s) { try { localStorage.setItem(SPIRIT_KEY, JSON.stringify(s)); } catch (e) {} try { updateSpiritHud(); } catch (e) {} }
function minutesToNextSpirit(s) { return Math.max(0, SPIRIT_MIN - Math.floor((Date.now() - s.t) / 60000)); }

/* 郵差體力（設計稿 8.x）：待命時每 3 分鐘 +1%（真實時間，約 5 小時回滿）；寄信時扣除。
   每位郵差各自記「從什麼時候開始回復」（ep-send.staTk）；送信途中這個時間設在送完之後，所以途中不回復（v0.23.2）。 */
const STA_MIN = 3, STA_MS = STA_MIN * 60000;
function loadCourierSta(defaults) {
  let s = {}; try { s = JSON.parse(localStorage.getItem("ep-send") || "{}"); } catch (e) {}
  const sta = Object.assign({}, defaults || {}, s.sta || {}), now = Date.now();
  const base = typeof s.staT === "number" ? s.staT : now, T = Object.assign({}, s.staTk || {});
  for (const k in sta) {
    let t = typeof T[k] === "number" ? T[k] : base;
    const gained = Math.floor((now - t) / STA_MS);
    if (gained > 0) { sta[k] = Math.min(100, sta[k] + gained); t += gained * STA_MS; }
    if (sta[k] >= 100) t = Math.max(t, now);
    T[k] = t;
  }
  return { sta, t: T };
}
function saveCourierSta(sta, T) {
  try { const s = JSON.parse(localStorage.getItem("ep-send") || "{}"); s.sta = sta; s.staTk = T || {}; delete s.staT; localStorage.setItem("ep-send", JSON.stringify(s)); } catch (e) {}
}
/* t：這位郵差開始回復的時間（還在送信時會在未來） */
function staFullText(v, t) {
  const now = Date.now(); t = typeof t === "number" ? t : now;
  if (t > now) { const w = Math.ceil((t - now) / 1000); return `送信中，回到郵站後才開始回復（約 ${w} 秒，原型加速）`; }
  if (v >= 100) return "已回滿";
  const m = Math.max(1, (100 - v) * STA_MIN - Math.floor((now - t) / 60000));
  return m >= 60 ? `約 ${Math.floor(m / 60)} 小時 ${m % 60} 分回滿` : `約 ${m} 分鐘回滿`;
}

/* 郵差休息包（原「郵差點心」，2026-11-12 使用者決定改成不是食物，整個遊戲不餵食）：
   郵站櫃台 10 朵小花；給自己的郵差用，體力 +20%；每位郵差每天第一次用，好感 +1。存在 ep-items.restkit。 */
const RESTKIT = { n: "郵差休息包", ic: "🎒", img: "art/ui/x_restkit.png", p: 10, sta: 20 };   // 圖示：GPT ui_icon_restkit_v0.1 右側睡墊（2026-11-12 使用者選）
const restkitImg = (h = "1.4cqw") => `<img src="${RESTKIT.img}" alt="" style="height:${h};width:auto;vertical-align:middle">`;
function restkitCount() { try { return (JSON.parse(localStorage.getItem("ep-items") || "{}").restkit) || 0; } catch (e) { return 0; } }
function useRestkit(id, sta) {
  let inv = {}; try { inv = JSON.parse(localStorage.getItem("ep-items") || "{}"); } catch (e) {}
  if (!(inv.restkit > 0) || sta[id] >= 100) return null;
  inv.restkit--; try { localStorage.setItem("ep-items", JSON.stringify(inv)); } catch (e) {}
  sta[id] = Math.min(100, (sta[id] ?? 100) + RESTKIT.sta);
  const day = new Date().toISOString().slice(0, 10);
  let f = {}; try { f = JSON.parse(localStorage.getItem("ep-restkit") || "{}"); } catch (e) {}
  if (f.day !== day) f = { day, used: {} };
  const first = !f.used[id];
  if (first) { f.used[id] = 1; if (DEX[id]) { DEX[id].aff = (DEX[id].aff || 0) + 1; saveDex(DEX); } }
  try { localStorage.setItem("ep-restkit", JSON.stringify(f)); } catch (e) {}
  return { first, left: inv.restkit };
}

/* 駐站生物好感效果（設計稿 7.6「駐站生物好感」表，數值暫定）：
   5＝筆友回信最後一段快 20%、送信時 10% 機率附小禮物；10＝解鎖駐站明信片樣式、小禮物 20%；15＝最後一段快 35%。
   好感存在 ep-station.aff（郵站頁照顧時累積）。 */
function stationAff() { try { return JSON.parse(localStorage.getItem("ep-station") || "{}").aff || {}; } catch (e) { return {}; } }
function stationPerk(a) { a = a || 0; return { speed: a >= 15 ? 0.35 : a >= 5 ? 0.2 : 0, gift: a >= 10 ? 0.2 : a >= 5 ? 0.1 : 0, card: a >= 10 }; }
/* 送回信的駐站生物：好感最高的那一隻（同分取名單第一隻） */
function stationCourier(hub) {
  const list = STATIONS[hub] || ["heron"], A = stationAff();
  return list.reduce((b, k) => ((A[k] || 0) > (A[b] || 0) ? k : b), list[0]);
}

/* 認養棲地（設計稿 7.5 C，2026-11-12 改版，數值暫定）：認養地＝6 個真實知名地點，和探索點分開。
   效果三種：1. 認養地本身（風景改善、等級、紀錄、守護郵戳）；2. 在地生物（之後再做）；
   3. 探索小加成：任何一個認養還在效果期間，所有探索點「沒遇到」×0.9（不偏向任何生物）。
   棲地等級＝最近 7 天認養的不同玩家數（其他玩家人數是示意假資料，測試版沒有伺服器）。 */
const ADOPT = {
  S: { n: "墾丁南灣", img: "nanwan", mark: "✨", items: ["淨灘", "復育海岸原生植物"] },
  R: { n: "宜蘭冬山河", img: "dongshan_river", mark: "💧", items: ["清理河岸垃圾", "種植水岸原生植物"] },
  C: { n: "日月潭", img: "sun_moon_lake", mark: "💧", items: ["湖岸垃圾清理", "種植原生蜜源植物"] },
  F: { n: "陽明山", img: "yangmingshan", mark: "🪴", items: ["移除外來入侵植物", "步道垃圾減量"] },
  M: { n: "阿里山", img: "alishan", mark: "🌲", items: ["維護步道（讓遊客不離開步道）", "移除外來入侵植物"] },
  A: { n: "台東池上・金城武樹", img: "chishang", mark: "🌾", items: ["友善耕作（減少農藥）", "保留田埂草帶"] } };
/* 認養項目的一句真實說明＋來源（GPT 查證，回報_2026-11-13_認養項目說明.md；Claude 複核）。畫面只顯示一句，來源點 ⓘ 才看。
   st: 該地有做的證據（"有"＝來源明確記載；其餘為一般性做法，該地待查）。這是現實保育資訊，和「哪種生物較常出現」的遊戲規則無關。 */
const ADOPT_INFO = {
  "S|淨灘": { t: "清除海岸廢棄物，減少垃圾留在海岸與海中。", src: "墾丁國家公園管理處淨灘紀錄；環境部淨灘說明", st: "南灣有辦過淨灘（管理處紀錄）" },
  "S|復育海岸原生植物": { t: "栽植海岸原生植物，協助受干擾地區恢復植被。", src: "林業試驗所墾丁海岸林復育；墾丁國家公園", st: "一般性保育做法；墾丁有復育案例，南灣本點待查" },
  "R|清理河岸垃圾": { t: "清除河岸垃圾，維持水岸環境整潔。", src: "宜蘭縣政府旅遊網冬山河親水公園", st: "一般性保育做法；該地活動待查" },
  "R|種植水岸原生植物": { t: "種植適地原生植物，維護河岸植被與棲地。", src: "宜蘭縣政府旅遊網冬山河親水公園、生態綠舟", st: "一般性保育做法；該地種植行動待查" },
  "C|湖岸垃圾清理": { t: "清理湖岸垃圾，維持岸邊環境整潔。", src: "日月潭國家風景區管理處 2026 淨潭教育日", st: "日月潭有辦過（特定年度場次）" },
  "C|種植原生蜜源植物": { t: "種植原生蜜源植物，提供授粉昆蟲可利用的花源。", src: "日月潭國家風景區管理處生態探索", st: "一般性保育做法；該地種植行動待查" },
  "F|移除外來入侵植物": { t: "移除外來入侵植物，減少其擴散並維護原生植被。", src: "陽明山國家公園管理處外來種移除計畫", st: "陽明山有辦（保育志工實地移除）" },
  "M|移除外來入侵植物": { t: "移除外來入侵植物，減少其擴散並維護原生植被。", src: "林業及自然保育署嘉義分署監測摘要", st: "阿里山鄉一帶有辦；遊樂區園內待查" },
  "F|步道垃圾減量": { t: "自備用品並帶走垃圾，減少步道沿線廢棄物。", src: "陽明山國家公園管理處無痕山林說明", st: "陽明山有做（管理措施與宣導）" },
  "M|維護步道（讓遊客不離開步道）": { t: "沿既有步道行走，減少踩踏植被與土壤。", src: "阿里山森林遊樂區官方介紹；阿里山健行須知", st: "阿里山有做（管理與宣導）" },
  "A|友善耕作（減少農藥）": { t: "採行友善耕作，減少農藥對田區環境的干擾。", src: "臺東區農業改良場池上友善耕作示範", st: "池上有示範活動，不代表每塊田都採行" },
  "A|保留田埂草帶": { t: "保留田埂植被，提供地表覆蓋並減少裸土侵蝕。", src: "臺東區農業改良場伯朗大道田埂植草示範（2015）", st: "池上有示範，不代表現在所有田埂都保留" } };
let ADOPT_INFO_OPEN = {};
/* 認養地的在地生物（2026-11-13 使用者定案；設計稿認養段落）：認養後，風景裡偶爾出現。也會在對應的探索點出現。 */
const SITE_SPECIES = { S: ["ghostcrab", "reefheron", "egret"], R: ["nheron", "kingfisher", "egret"], C: ["firefly", "kingfisher", "egret"],
  F: ["butterfly", "bluemagpie", "peacock"], M: ["robin", "liocichla", "yuhina"], A: ["grassfrog", "sparrow", "munia"] };   // 第一個是該地的代表生物
const ADOPT_OTHERS = { S: 0, R: 3, C: 12, F: 6, M: 0, A: 24 };   // 示意：最近 7 天認養過的其他玩家
const ADOPT_LV = [{ price: 15 }, { price: 20, days: 3 }, { price: 30, days: 5 }, { price: 40, days: 7 }];
const ADOPT_HELP_BONUS = 5;   // 郵站公告「需要幫忙的棲地」：認養棲地等級 0～1 的地點，多給 5 朵小花（遊戲規則・暫定；測試版用目前等級決定，正式版改成每週輪替）
function adoptNeedHelp() { return Object.keys(ADOPT).filter(k => adoptLevel(k) <= 1); }
const ADOPT_EXPLORE_NONE = 0.9;   // 探索小加成：「沒遇到」權重 ×0.9
function loadAdopt() { try { return JSON.parse(localStorage.getItem("ep-adopt") || "{}"); } catch (e) { return {}; } }
function saveAdopt(a) { try { localStorage.setItem("ep-adopt", JSON.stringify(a)); } catch (e) {} }
function adoptPlayers(k) { const a = loadAdopt()[k], me = a && Date.now() - a.t < 7 * 864e5 ? 1 : 0; return (ADOPT_OTHERS[k] || 0) + me; }
function adoptLevel(k) { const n = adoptPlayers(k); return n >= 20 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0; }
function adoptEffect(k) {   // 自己在這個認養地的效果還在不在
  const a = loadAdopt()[k]; if (!a) return null;
  const lv = Math.max(1, adoptLevel(k)), end = a.t + ADOPT_LV[lv].days * 864e5;
  if (Date.now() > end) return null;
  return { item: a.item, lv, left: end - Date.now() };
}
/* 探索小加成：回傳效果還剩最久的那一個認養地（沒有就是 null） */
function adoptExploreBonus() {
  let best = null; Object.keys(ADOPT).forEach(k => { const e = adoptEffect(k); if (e && (!best || e.left > best.left)) best = { k, left: e.left }; });
  return best ? { none: ADOPT_EXPLORE_NONE, place: ADOPT[best.k].n, left: best.left } : null;
}

/* 郵差升級（好感累積）：5 點速度 +10%，10 點單次距離 +10%（兩種輪流，之後可再延伸）。 */
function courierBonus(id) {
  const aff = (DEX[id] && DEX[id].aff) || 0;
  const b = { spd: 1, range: 1, tags: [] };
  if (aff >= 5) { b.spd = 1.1; b.tags.push("速度 +10%（好感 5）"); }
  if (aff >= 10) { b.range = 1.1; b.tags.push("單次距離 +10%（好感 10）"); }
  return b;
}

/* 測試版版本號：每次更新畫面原型都要遞增，並記在 CHANGELOG.md。 */
/* 成就：認養類成就定義、達成通知（收件匣「通知」）與「我的」導覽紅點（v0.44.4） */
function adoptAch() {
  const AD = loadAdopt(), v = Object.values(AD), sum = f => v.reduce((x, a) => x + (f(a) || 0), 0);
  const N = sum(a => a.n), LOW = sum(a => a.low), MX = v.reduce((m, a) => Math.max(m, a.n || 0), 0);
  const PL = Object.keys(ADOPT).filter(k => AD[k] && AD[k].n >= 1).length;
  return [
    { t: "第一次守護", fl: 15, c: "認養任何一個地點", title: "棲地新手", p: Math.min(1, N), n: 1 },
    { t: "安靜角落的守護者", fl: 25, c: "認養 5 次低等級（0～1 級）的地點", title: "安靜角落的守護者", p: Math.min(5, LOW), n: 5 },
    { t: "六地巡禮", fl: 50, c: "6 個認養地各認養過一次", title: "台灣棲地巡禮者", p: PL, n: Object.keys(ADOPT).length },
    { t: "棲地老朋友", fl: 25, c: "同一個地點累積認養 3 次", title: "棲地老朋友", p: Math.min(3, MX), n: 3 }];
}
function _lsj(k, d) { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } }
function achPushNote(icon, text) { try { const b = _lsj("ep-box", {}); b.inbox = b.inbox || []; b.inbox.push({ sys: true, icon, text }); localStorage.setItem("ep-box", JSON.stringify(b)); } catch (e) {} }
function achSync(list) {   // 新達成的成就：收件匣送一則通知（每個成就只通知一次）
  const done = _lsj("ep-ach-notified", []), claimed = _lsj("ep-ach", {});
  list.forEach(a => { if (a.p >= a.n && !claimed[a.t] && !done.includes(a.t)) { done.push(a.t); achPushNote("🏅", `達成成就「${a.t}」！到「我的 → 成就」領取 ${a.fl} 朵小花和稱號。`); } });
  try { localStorage.setItem("ep-ach-notified", JSON.stringify(done)); } catch (e) {}
}
function achUnclaimed() {   // 認養類即時算；其他成就由「我的」頁寫入 ep-ach-other
  const claimed = _lsj("ep-ach", {});
  return adoptAch().filter(a => a.p >= a.n && !claimed[a.t]).length + (+localStorage.getItem("ep-ach-other") || 0);
}
/* 「我的」各分頁的新東西紅點（v0.50.0）：新夥伴、新郵戳、新明信片。ep-seen 記「上次看過」的清單，第一次執行時把現有的當作已看過 */
const SEEN_KEY = "ep-seen";
function curSeenData() {
  let st = ["C", "R", "A"];   // 沒有存檔時，「我的」頁顯示的示範郵戳
  try { const s = JSON.parse(localStorage.getItem("ep-send") || "{}"); if (s.stamps && s.stamps.length) st = [...new Set(s.stamps)]; } catch (e) {}
  return { mates: OWNED.slice(), stamps: st.concat(Object.keys(loadCountryStamps()).map(c => "c:" + c)), pcards: loadPCards().length };
}
function seenData() {
  let s = _lsj(SEEN_KEY, null);
  if (!s) { s = curSeenData(); try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {} }
  return s;
}
function newDots() {   // 每個分頁有幾個新的（還沒看過）
  const c = curSeenData(), s = seenData();
  return { mates: c.mates.filter(k => !(s.mates || []).includes(k)).length,
           stamps: c.stamps.filter(k => !(s.stamps || []).includes(k)).length,
           pcards: Math.max(0, c.pcards - (+s.pcards || 0)) };
}
function markProfileSeen(tab) {   // 看過這個分頁，紅點消失
  if (!["mates", "stamps", "pcards"].includes(tab)) return;
  const s = seenData(), c = curSeenData(); s[tab] = c[tab];
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {}
  try { updateAchDot(); } catch (e) {}
}
function achDotCount() {   // 底部「我的」的紅點：有未領成就，或任何分頁有新東西
  const n = newDots();
  return achUnclaimed() + n.mates + n.stamps + n.pcards;
}
/* 明信片紅點（v0.52.0）：關掉遊戲再打開時，有信送達、有未讀的信、有新通知，底部「明信片」亮紅點（所有頁面）。
   送達與否由 ep-box 的「送信中」紀錄加上離開的時間推算；真正收進收件匣是開明信片頁時。 */
function advanceTrip(o, sec) {   // 送信進度快轉 sec 秒（和 postcard 的 tripRate 同一套算法）
  let el = o.el || 0;
  while (sec > 0 && el < o.h) {
    let rate, end;
    if (!o.intl || !o.l3) { rate = o.k || 2; end = o.h; }
    else { const b1 = o.leg1, b2 = o.h - o.l3, i = el < b1 ? 0 : el < b2 ? 1 : 2, H = [b1, b2 - b1, o.l3][i]; rate = H / Math.max(10, H * 10); end = [b1, b2, o.h][i]; }
    const need = (end - el) / rate;
    if (sec >= need) { el = end; sec -= need; if (end >= o.h) break; } else { el += rate * sec; sec = 0; }
  }
  return el;
}
function mailDotCount() {
  let b = null; try { b = JSON.parse(localStorage.getItem("ep-box") || "null"); } catch (e) {}
  if (!b) return 0;
  const inbox = b.inbox || [], now = Date.now();
  const unread = inbox.filter(m => m.from && !m.read).length;
  const newNotes = Math.max(0, inbox.filter(m => !m.from).length - (+localStorage.getItem("ep-box-seen") || 0));
  const arrived = (b.out || []).filter(o => o.h > 0 && advanceTrip(o, Math.max(0, (now - (o.savedAt || now)) / 1000)) >= o.h).length;
  return unread + newNotes + arrived;
}
function updateAchDot() {   // 底部導覽的紅點：「我的」（成就與新東西）與「明信片」（信與通知）
  if (!document.getElementById("achdot-css")) { const st = document.createElement("style"); st.id = "achdot-css"; st.textContent = ".modes a{position:relative}.achdot{position:absolute;top:.6cqw;left:calc(50% + 1.2cqw);width:1.6cqw;height:1.6cqw;border-radius:50%;background:#d93c2b;border:.25cqw solid #fff8e7;pointer-events:none}"; document.head.appendChild(st); }
  const setDot = (n, on) => {
    const a = document.querySelector(".modes a:nth-child(" + n + ")"); if (!a) return;
    let d = a.querySelector(".achdot");
    if (on) { if (!d) { d = document.createElement("i"); d.className = "achdot"; a.appendChild(d); } } else if (d) d.remove();
  };
  setDot(6, achDotCount() > 0);
  setDot(3, mailDotCount() > 0);
}
function achAfterAdopt() { achSync(adoptAch()); updateAchDot(); }
(function () { const go = () => { try { achSync(adoptAch()); updateAchDot(); } catch (e) {} }; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go(); })();
/* 郵差體力回滿通知（v0.44.4）：待命的郵差體力回到 100%，收件匣「通知」多一則；每次回滿只通知一次，體力再下降後才會再通知。
   開關：設定 → 通知 → 郵差體力回滿（預設開）。第一次執行時，已經是滿的不補通知。每 30 秒檢查一次，每個頁面都會跑。 */
function fullSweep() {
  try {
    const set = _lsj("ep-settings", {}); if (set.nFull === false) return;
    const sta = loadCourierSta().sta, first = localStorage.getItem("ep-full-notified") === null;
    const notified = _lsj("ep-full-notified", []); let ch = first;
    for (const k in sta) {
      if (sta[k] >= 100) {
        if (!notified.includes(k)) { notified.push(k); ch = true; if (!first) {
          const nm = (typeof NAME !== "undefined" && NAME[k]) || k, text = `${nm}休息好了，體力回滿，可以出發寄信了！`;
          if (typeof st !== "undefined" && st && Array.isArray(st.inbox) && typeof render === "function") { st.inbox.push({ sys: true, icon: "🔋", text }); render(); }   // 明信片頁開著：直接加進畫面上的收件匣，避免被存檔蓋掉
          else achPushNote("🔋", text);
        } }
      } else if (notified.includes(k)) { notified.splice(notified.indexOf(k), 1); ch = true; }
    }
    if (ch) localStorage.setItem("ep-full-notified", JSON.stringify(notified));
  } catch (e) {}
}
(function () { const go = () => { setTimeout(fullSweep, 1500); setInterval(fullSweep, 30000); }; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go(); })();
const BUILD = { name: "測試版", ver: "v0.56.0", date: "2026-11-15" };
const BUILD_LABEL = `${BUILD.name} ${BUILD.ver}（${BUILD.date}）`;
(function addBuildBadge() {
  const put = () => {
    const stage = document.querySelector(".stage");
    if (!stage || stage.querySelector(".buildtag")) return;
    const el = document.createElement("div");
    el.className = "buildtag";
    el.textContent = BUILD_LABEL + (typeof IN_SHELL !== "undefined" && IN_SHELL ? "・線上" : "");
    el.style.cssText = "position:absolute;left:50%;bottom:.4cqw;transform:translateX(-50%);font-size:.85cqw;font-weight:900;color:rgba(61,42,23,.55);background:rgba(255,248,231,.7);border-radius:99px;padding:.05cqw .8cqw;pointer-events:none;z-index:5";
    stage.appendChild(el);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", put); else put();
})();

/* 小花（遊戲幣）：每一頁右上方都顯示目前的數量（v0.10.3，使用者決定）。原型起始 20 朵。 */
const FLOWER_KEY = "ep-flowers", FLOWER_START = 20;
function loadFlowers() { try { const v = JSON.parse(localStorage.getItem(FLOWER_KEY) || "null"); return typeof v === "number" ? v : FLOWER_START; } catch (e) { return FLOWER_START; } }
function addFlowers(n) { const v = loadFlowers() + n; try { localStorage.setItem(FLOWER_KEY, JSON.stringify(v)); } catch (e) {} updateFlowerHud(v); return v; }
/* 賺小花（設計稿 7.6 經濟數值，暫定）：觀察紀錄卡每張 5（郵站投稿）、第一次記錄新生物 15、新郵戳 20、新線索 5、收到回信每封 2（每天最多 10）、成就 30～100 */
const EARN = { card: 5, first: 15, stamp: 20, clue: 5, reply: 2, replyMax: 10 };
function replyFlowers() {   // 收到回信 +2；每天最多 10 朵。回傳這次給了幾朵
  const day = new Date().toISOString().slice(0, 10); let L = {};
  try { L = JSON.parse(localStorage.getItem("ep-earn") || "{}"); } catch (e) {}
  if (L.day !== day) L = { day, reply: 0 };
  const g = Math.min(EARN.reply, EARN.replyMax - L.reply); if (g <= 0) return 0;
  L.reply += g; try { localStorage.setItem("ep-earn", JSON.stringify(L)); } catch (e) {}
  addFlowers(g); return g;
}
/* 觀察紀錄卡：探索時每次成功記錄得 1 張，到郵站櫃台「自然觀察站」投稿換小花 */
function loadObsCards() { try { return JSON.parse(localStorage.getItem("ep-items") || "{}").obscards || []; } catch (e) { return []; } }
function addObsCard(c) { try { const inv = JSON.parse(localStorage.getItem("ep-items") || "{}"); inv.obscards = (inv.obscards || []).concat([c]); localStorage.setItem("ep-items", JSON.stringify(inv)); } catch (e) {} }
function updateFlowerHud(n) {
  const el = document.querySelector(".stage .flowerhud");
  if (el) el.querySelector(".fl b").textContent = n == null ? loadFlowers() : n;
}
/* 精神標籤（v0.54.0）：和小花同一個位置、同一個圓角標籤（小花的左邊），只在「探索」與「我的」頁顯示 */
function updateSpiritHud() {
  const el = document.querySelector(".stage .flowerhud .sphud"); if (!el) return;
  const s = loadSpirit(), max = spiritMax();
  el.querySelector("img").src = s.v ? "art/ui/ic_spirit.png" : "art/ui/ic_rest.png";
  el.querySelector("b").textContent = s.v ? s.v + "／" + max : "休息中・約 " + minutesToNextSpirit(s) + " 分";
  el.parentNode.title = s.v ? "精神 " + s.v + "／" + max + "，每次探索 -1；" + (s.v < max ? "約 " + minutesToNextSpirit(s) + " 分鐘後 +1" : "已回滿") : "精神用完了，約 " + minutesToNextSpirit(s) + " 分鐘後 +1";
}
(function addFlowerHud() {
  const put = () => {
    const stage = document.querySelector(".stage");
    if (!stage || stage.querySelector(".flowerhud")) return;
    const el = document.createElement("div");
    el.className = "flowerhud";
    el.title = "小花（遊戲幣）";
    el.innerHTML = `<span class="fl" style="display:flex;align-items:center;gap:.4cqw"><img src="art/flower.webp" alt="小花"><b>${loadFlowers()}</b></span>`;
    el.style.cssText = "position:absolute;right:42.6cqw;top:2cqw;z-index:6;display:flex;align-items:center;gap:.4cqw;background:rgba(255,248,231,.95);border:.2cqw solid #efdfb8;border-radius:99px;padding:.25cqw 1cqw .25cqw .35cqw;font-weight:900;font-size:1.3cqw;color:#3d2a17;box-shadow:0 .25cqw 0 rgba(0,0,0,.12);pointer-events:none";
    el.querySelector("img").style.cssText = "width:2.2cqw;height:2.2cqw;display:block";
    if (document.getElementById("mapme") || document.getElementById("pcard")) {   // 探索頁、我的頁才有精神
      const sp = document.createElement("span");
      sp.className = "sphud"; sp.style.cssText = "display:flex;align-items:center;gap:.4cqw;padding-right:.9cqw;margin-right:.7cqw;border-right:.2cqw solid #efdfb8";
      sp.innerHTML = `<img src="art/ui/ic_spirit.png" alt="精神" style="width:2.2cqw;height:2.2cqw;display:block"><b></b>`;
      el.insertBefore(sp, el.firstChild);
    }
    stage.appendChild(el);
    try { updateSpiritHud(); } catch (e) {}
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", put); else put();
  window.addEventListener("storage", e => { if (e.key === FLOWER_KEY) updateFlowerHud(); });
  setInterval(() => { try { updateSpiritHud(); } catch (e) {} }, 20000);
})();

/* 線上版外框切換：畫面放在入口頁的框裡時，切換連結改成通知外框（線上版只允許發布時就存在的程式，
   所以這段寫在共用的 player.js，不能由外框另外塞程式進來）。直接開檔時照一般連結運作。 */
const IN_SHELL = (() => { try { return window.parent !== window && JSON.parse(window.name || "{}").shell === true; } catch (e) { return false; } })();
window.__search = (() => { try { return IN_SHELL ? (JSON.parse(window.name).search || "") : location.search; } catch (e) { return ""; } })();
function goTo(url) {
  /* 換頁會把整個畫面（連同還在響的點擊聲）丟掉，所以剛響過聲音時，晚約 0.15 秒再換 */
  const go = () => {
    if (!IN_SHELL) { location.href = url; return; }
    try { if (typeof parent.__load === "function") { parent.__load(String(url)); return; } } catch (e) {}
    try { parent.postMessage({ __nav: String(url) }, "*"); } catch (e) {}
  };
  /* 這個處理比音效的點擊處理先跑，所以先讓出一個時間片，等音效處理完再判斷有沒有剛響過 */
  setTimeout(() => { const wait = (window.EPSFX && EPSFX.recent && EPSFX.recent()) ? 150 : 0; if (wait) setTimeout(go, wait); else go(); }, 0);
}
try { Object.defineProperty(window, "__nav", { set: goTo, configurable: true }); } catch (e) {}
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
  const h = a.getAttribute("href"); if (/^https?:/.test(h)) return;
  if (!IN_SHELL && (!h || h === "#" || a.target)) return;   // 直接開檔時只處理一般換頁連結（為了讓點擊聲播完）
  e.preventDefault(); if (h && h !== "#") goTo(h);
}, true);

/* 2D 圖示（2026-11-11）：各頁資料列前面的 emoji（.ic）自動換成 GPT 畫的彩色小圖示。
   還沒畫的圖示（第三批 ui/x_*.png）載入失敗時，自動退回原本的 emoji。 */
const EMOJI_ICON = (() => {
  const m = {}, put = (list, file) => [...list].forEach(e => m[e] = file);
  put(["🗺", "📍"], "ui/nav_explore.png"); put(["📖", "📗"], "ui/nav_dex.png");
  put(["📮", "✉", "📨"], "ui/ic_mail.png"); put(["🖼"], "ui/nav_postcard.png");
  put(["🛡"], "ui/ic_conserve.png"); put(["🌸"], "flower.webp"); put(["🔋"], "ui/ic_stamina.png");
  put(["⏱", "🪽"], "ui/ic_speed.png"); put(["🛤"], "ui/ic_route.png"); put(["🌤", "🌦"], "ui/nav_sun.png");
  put(["👀", "🔭"], "ui/ic_observe.png"); put(["🧭"], "ui/x_compass.png");
  put(["🍎", "🍊", "🍒", "🫐", "🐟", "🪱", "🪲", "🐍", "🌱", "🌗", "🦴"], "ui/ic_diet.png");
  put(["🏘", "🌿", "🏡"], "ui/ic_habitat.png");
  put(["⛰"], "ui/h_mountain.png"); put(["🌳", "🌲"], "ui/h_forest.png"); put(["🏞"], "ui/h_river.png");
  put(["🌾"], "ui/h_farm.png"); put(["🏙"], "ui/h_park.png"); put(["🌊"], "ui/h_coast.png");
  put(["🦅"], "ui/ic_bird.png"); put(["🐾"], "ui/ic_all.png");
  put(["🔒"], "ui/x_lock.png"); put(["🔍", "🔎"], "ui/x_magnifier.png"); put(["📝", "✍"], "ui/x_notebook.png");
  put(["⭐"], "ui/x_star.png"); put(["⚠", "🚸", "🚧"], "ui/x_warning.png"); put(["🥚", "🐣", "🪵"], "ui/x_egg.png");
  put(["📏"], "ui/x_ruler.png"); put(["🚶", "👣"], "ui/x_footprints.png"); put(["💡"], "ui/x_bulb.png");
  put(["👋", "🤝"], "ui/x_wave.png"); put(["🤫"], "ui/x_hourglass.png"); put(["🎯"], "ui/x_clover.png");
  put(["✨"], "ui/x_sparkle.png"); put(["🛫"], "ui/x_plane.png"); put(["🚚"], "ui/x_bag.png"); put(["🎒"], "ui/x_restkit.png"); put(["🍾"], "ui/x_match.png"); put(["🎲"], "ui/x_dice.png");
  put(["🔔"], "ui/x_bell.png"); put(["🕒"], "ui/x_clock.png"); put(["💗", "👥"], "ui/x_heart.png"); put(["🧠"], "ui/ic_spirit.png"); put(["😴"], "ui/ic_rest.png"); put(["📭"], "ui/x_mailbox.png");
  put(["🏷"], "ui/x_tag.png"); put(["🧥"], "ui/x_vest.png"); put(["ℹ"], "ui/x_bubble.png");
  put(["📣"], "ui/y_board.png"); put(["🪴"], "ui/y_sprout.png"); put(["🏅"], "ui/y_medal.png"); put(["🏤"], "ui/y_station.png");
  put(["✅", "✓", "✔"], "ui/y_check.png"); put(["⚙"], "ui/y_gear.png"); put(["✏"], "ui/y_pencil.png"); put(["🥣"], "ui/y_bowl.png");
  put(["🧹"], "ui/y_broom.png"); put(["🛏"], "ui/y_cushion.png"); put(["🪮"], "ui/y_comb.png"); put(["🦉"], "ui/y_owl.png");
  put(["🎂"], "ui/y_cake.png"); put(["🔁"], "ui/y_loop.png"); put(["💧"], "ui/y_drop.png"); put(["🌙"], "ui/y_moon.png");
  put(["🧬"], "ui/ic_all.png"); put(["🍂"], "ui/nav_dawn.png"); put(["🍃"], "ui/ic_habitat.png");
  return m;
})();
function iconizeEmoji(root) {
  (root || document).querySelectorAll(".ic").forEach(el => {
    if (el.children.length || el.dataset.iconized) return;
    const raw = el.textContent.trim(), key = raw.replace(/️/g, ""), file = EMOJI_ICON[key];
    if (!file) return;
    el.dataset.iconized = "1";
    const img = new Image(); img.alt = ""; img.src = "art/" + file;
    img.onerror = () => { el.textContent = raw; };
    el.textContent = ""; el.appendChild(img);
  });
}
/* 文字裡夾的表情符號（提示、按鈕、標題等不在 .ic 裡的）也換成同一組圖示，用小圖接在字旁邊 */
const EMOJI_RE = new RegExp("(" + Object.keys(EMOJI_ICON).map(k => k + "\\uFE0F?").join("|") + ")", "gu");
function iconizeText(root) {
  const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: n => /^(SCRIPT|STYLE|TEXTAREA|TITLE|text|tspan)$/.test(n.parentNode.nodeName) || n.parentNode.closest(".ic,svg") ? NodeFilter.FILTER_REJECT
      : (EMOJI_RE.lastIndex = 0, EMOJI_RE.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => {
    const frag = document.createDocumentFragment(); let last = 0; const t = n.nodeValue; EMOJI_RE.lastIndex = 0;
    for (let m; (m = EMOJI_RE.exec(t));) {
      frag.appendChild(document.createTextNode(t.slice(last, m.index))); last = m.index + m[0].length;
      const raw = m[0], img = new Image(); img.alt = ""; img.className = "ei"; img.src = "art/" + EMOJI_ICON[raw.replace(/\uFE0F/g, "")];
      img.style.cssText = "height:1.15em;width:auto;vertical-align:-.2em;margin:0 .1em";
      img.onerror = () => img.replaceWith(document.createTextNode(raw)); frag.appendChild(img);
    }
    frag.appendChild(document.createTextNode(t.slice(last))); n.replaceWith(frag);
  });
}
(() => {
  const start = () => {
    iconizeEmoji(); iconizeText();
    new MutationObserver(() => { iconizeEmoji(); iconizeText(); }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

/* ===== 音效（v0.44.4）：全部用 Web Audio 即時合成，沒有外部音檔、沒有授權問題。
   音量與靜音讀設定頁的 ep-settings（sfx 0～100、mute）。瀏覽器規定要玩家先點一下畫面才能出聲，所以第一次點擊後才建立 AudioContext。 */
(function () {
  let ctx = null;
  const cfg = () => { try { const s = JSON.parse(localStorage.getItem("ep-settings") || "{}"); return { vol: (typeof s.sfx === "number" ? s.sfx : 70) / 100, mute: !!s.mute }; } catch (e) { return { vol: .7, mute: false }; } };
  const ensure = () => {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ctx = new AC(); } catch (e) { return null; } }
    if (ctx.state !== "running" && ctx.resume) { try { ctx.resume(); } catch (e) {} }   // iPhone 切 app／久沒操作後會變成 interrupted，要叫醒
    return ctx;
  };
  const env = (g, t, a, d, peak) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, .0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const tone = (c, out, t, type, f0, f1, a, d, peak) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d); env(g, t, a, d, peak); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + .05); };
  const noise = (c, out, t, dur, f0, f1, q, peak) => {
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); env(g, t, dur * .25, dur * .75, peak);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + .05);
  };
  const SND = {
    tap:  (c, o, t) => { tone(c, o, t, "sine", 760, 520, .004, .07, .5); },
    nav:  (c, o, t) => { tone(c, o, t, "triangle", 520, 620, .004, .09, .45); tone(c, o, t + .05, "sine", 780, 780, .004, .08, .25); },
    flip: (c, o, t) => { noise(c, o, t, .2, 1100, 3200, 1.2, .5); },
    send: (c, o, t) => { tone(c, o, t, "sine", 150, 55, .004, .12, .9); noise(c, o, t, .06, 900, 500, .8, .35); tone(c, o, t + .16, "sine", 988, 988, .005, .35, .35); tone(c, o, t + .26, "sine", 1319, 1319, .005, .45, .3); }
  };
  let last = {};
  let lastAny = 0;
  window.EPSFX = {
    recent() { return Date.now() - lastAny < 300; },
    play(name) {
      const s = cfg(); if (s.mute || s.vol <= 0 || !SND[name]) return;
      const now = Date.now(); if (last[name] && now - last[name] < 60) return; last[name] = now; lastAny = now;
      const c = ensure(); if (!c) return;
      const go = () => { const out = c.createGain(); out.gain.value = s.vol * .5; out.connect(c.destination); try { SND[name](c, out, c.currentTime + .01); } catch (e) {} };
      if (c.state === "running") go();
      else if (!navigator.userActivation || navigator.userActivation.hasBeenActive) { try { c.resume().then(go).catch(() => {}); } catch (e) {} }   // 玩家還沒點過畫面：靜靜略過
    }
  };
  /* 全域：按鈕、導覽、連結都有點擊聲；翻面鈕用翻面聲；沒有效的（disabled）不響 */
  document.addEventListener("click", e => {
    ensure();
    try { if (window.parent !== window && parent.EPMUSIC) parent.EPMUSIC.kick(); } catch (x) {}   // 背景音樂在入口外框，點擊時叫醒它（v0.44.4）
    const t = e.target.closest("button,a[href],[data-tab],[data-to],.btn,.chip,.act,#go,.pick button");
    if (!t || t.disabled || t.closest("[data-nosfx]")) return;
    if (t.matches("#flip,#rflip")) { EPSFX.play("flip"); return; }
    if (t.matches(".modes a,.tabs button,[data-tab]")) { EPSFX.play("nav"); return; }
    EPSFX.play("tap");
  }, true);
})();
