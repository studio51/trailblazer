// maplayout.jsx: map data model, default layout (the hand-drawn map as data), persistence.
//
// COORDINATE SYSTEM: everything lives in the SVG user space 0..1600 (x) by 0..1000 (y).
// Activity pins keep their own x/y as PERCENT (authored in data.jsx); the editor writes
// any moved pin into layout.pins as { [actId]: {x,y} } in the SAME percent space.

const LDA_MAP_KEY = "lda_map_layout_v3";

let __uid = 0;
function uid(p) { return (p || "el") + "_" + (Date.now().toString(36)) + "_" + (__uid++).toString(36); }

/* ---- seeded scatter, used only to build the default forest ---- */
function _seeded(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function _defaultTrees() {
  const rnd = _seeded(7);
  const clusters = [
    [80, 90, 300, 230], [560, 60, 460, 150], [1160, 70, 380, 230],
    [40, 470, 240, 360], [1360, 330, 220, 520], [380, 840, 520, 150],
    [900, 720, 360, 240], [1280, 740, 300, 220], [720, 410, 200, 150],
    [210, 250, 210, 170], [1040, 470, 190, 170],
  ];
  const out = [];
  clusters.forEach(([bx, by, bw, bh]) => {
    const n = 5 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      out.push({
        id: uid("tree"), kind: "tree",
        x: Math.round(bx + rnd() * bw), y: Math.round(by + rnd() * bh),
        r: Math.round(16 + rnd() * 20), variant: rnd() > 0.5 ? "dark" : "light",
      });
    }
  });
  return out.sort((a, b) => a.y - b.y);
}

function _defaultFlowers() {
  const src = [
    [250, 560, "#FF7BAC"], [292, 578, "#FFD54A"], [268, 602, "#7FB0FF"],
    [470, 250, "#FFD54A"], [510, 268, "#FF7BAC"], [444, 276, "#FF7BAC"],
    [1396, 712, "#7FB0FF"], [1436, 730, "#FFD54A"], [1414, 688, "#FF7BAC"],
    [612, 930, "#FFD54A"], [656, 946, "#FF7BAC"],
  ];
  return src.map(([x, y, c]) => ({ id: uid("flw"), kind: "flower", x, y, color: c }));
}

function defaultLayout() {
  return {
    v: 3,
    // filled blobs: water bodies (and optionally grass patches)
    areas: [
      { id: uid("water"), kind: "water",
        pts: [[-60, 740], [180, 678], [372, 690], [520, 760], [546, 880], [430, 982], [150, 1010], [-60, 980]] },
      { id: uid("water"), kind: "water",
        pts: [[1212, 250], [1290, 176], [1392, 182], [1452, 252], [1392, 322], [1288, 322]] },
    ],
    // polylines: roads (tan) and rivers (blue)
    paths: [
      { id: uid("road"), kind: "road", w: 46,
        pts: [[-60, 420], [262, 360], [462, 470], [702, 540], [902, 504], [1122, 500], [1302, 566], [1660, 600]] },
      { id: uid("road"), kind: "road", w: 34,
        pts: [[360, -40], [410, 182], [360, 380], [330, 560], [470, 712], [560, 862], [560, 1060]] },
      { id: uid("road"), kind: "road", w: 28,
        pts: [[1660, 240], [1382, 300], [1242, 240], [1060, 200], [902, 300], [822, 520]] },
      { id: uid("river"), kind: "river", w: 40,
        pts: [[640, -30], [716, 168], [902, 240], [1100, 300], [1184, 520], [1216, 706], [1120, 916]] },
    ],
    // point objects
    items: [
      // houses (roofed buildings)
      { id: uid("house"), kind: "house", x: 1175, y: 150, w: 58, roof: "#C77BAE" },
      { id: uid("house"), kind: "house", x: 205, y: 556, w: 62, roof: "#7FB0DD" },
      { id: uid("house"), kind: "house", x: 1080, y: 452, w: 50, roof: "#7BA86A" },
      { id: uid("house"), kind: "house", x: 690, y: 150, w: 46, roof: "#E8A24A" },
      // benches along the main path
      { id: uid("bench"), kind: "bench", x: 540, y: 506, rot: -8 },
      { id: uid("bench"), kind: "bench", x: 980, y: 470, rot: 6 },
      // bushes for foliage variety (seeded clusters)
      { id: uid("bush"), kind: "bush", x: 470, y: 700, r: 16, count: 4, seed: 1487 },
      { id: uid("bush"), kind: "bush", x: 1240, y: 640, r: 17, count: 5, seed: 9021 },
      { id: uid("bush"), kind: "bush", x: 150, y: 360, r: 15, count: 3, seed: 5530 },
      { id: uid("bush"), kind: "bush", x: 1150, y: 800, r: 16, count: 4, seed: 3344 },
      // rocks
      { id: uid("rock"), kind: "rock", x: 1320, y: 470, r: 18 },
      { id: uid("rock"), kind: "rock", x: 380, y: 470, r: 14 },
      // labels
      { id: uid("label"), kind: "label", x: 250, y: 880, text: "Willow Lake", size: 26 },
      { id: uid("label"), kind: "label", x: 980, y: 880, text: "The Meadows", size: 26 },
      // life & rides
      { id: uid("fw"), kind: "ferriswheel", x: 858, y: 718, s: 1.1 },
      { id: uid("fam"), kind: "family", x: 690, y: 566, s: 1 },
      { id: uid("dog"), kind: "dog", x: 734, y: 572, s: 0.9, color: "#C98A4B", flip: true },
      { id: uid("bal"), kind: "balloon", x: 772, y: 690, s: 1 },
      { id: uid("pic"), kind: "picnic", x: 1086, y: 838, s: 1.1 },
      { id: uid("car"), kind: "car", x: 300, y: 470, s: 1, color: "#2C97E0", flip: false },
      { id: uid("trc"), kind: "tractor", x: 1146, y: 414, s: 1, color: "#2FB16B", flip: true },
      { id: uid("kid"), kind: "kid", x: 256, y: 472, s: 1 },
      { id: uid("ice"), kind: "icecream", x: 948, y: 706, s: 1 },
      { id: uid("hd"), kind: "hotdog", x: 700, y: 742, s: 1 },
      { id: uid("kite"), kind: "kite", x: 1230, y: 560, s: 1, flip: false },
      { id: uid("duck"), kind: "duck", x: 300, y: 912, s: 1, flip: false },
      { id: uid("duck"), kind: "duck", x: 346, y: 928, s: 0.9, flip: false },
      { id: uid("duck"), kind: "duck", x: 250, y: 936, s: 0.85, flip: true },
      { id: uid("ftn"), kind: "fountain", x: 1280, y: 470, s: 1.1 },
      { id: uid("swg"), kind: "swing", x: 430, y: 612, s: 1 },
      { id: uid("sld"), kind: "slide", x: 508, y: 614, s: 1, flip: false },
      { id: uid("lmp"), kind: "lamp", x: 612, y: 524, s: 1 },
      { id: uid("lmp"), kind: "lamp", x: 1186, y: 548, s: 1 },
      { id: uid("stl"), kind: "stall", x: 636, y: 762, s: 1, stripe: "#2C97E0" },
      { id: uid("sgn"), kind: "signpost", x: 772, y: 540, s: 1, flip: false },
      { id: uid("brg"), kind: "bridge", x: 1185, y: 523, rot: 20, len: 100, style: "wood" },
      { id: uid("brg"), kind: "bridge", x: 966, y: 259, rot: -32, len: 86, style: "wood" },
      // terrain: hills & a little mountain range (drawn behind via y-sort)
      { id: uid("mtn"), kind: "mountain", x: 215, y: 252, s: 1.35 },
      { id: uid("mtn"), kind: "mountain", x: 392, y: 214, s: 0.95 },
      { id: uid("hill"), kind: "hill", x: 1024, y: 360, s: 1.05 },
      { id: uid("hill"), kind: "hill", x: 1452, y: 420, s: 0.82 },
      // chu-chu train on the main road
      { id: uid("trn"), kind: "train", x: 556, y: 498, s: 0.9, color: "#E8617A", flip: false },
      // windmill + camp
      { id: uid("wml"), kind: "windmill", x: 1430, y: 300, s: 1 },
      { id: uid("tnt"), kind: "tent", x: 1146, y: 892, s: 1 },
      { id: uid("fire"), kind: "campfire", x: 1196, y: 902, s: 0.9 },
      { id: uid("lp"), kind: "lilypad", x: 210, y: 948, seed: 7 },
      { id: uid("lp"), kind: "lilypad", x: 362, y: 958, seed: 21 },
      { id: uid("lp"), kind: "lilypad", x: 1330, y: 250, seed: 33 },
      // foliage + flowers
      ..._defaultTrees(),
      ..._defaultFlowers(),
    ],
    // pin position overrides (percent space), keyed by activity id
    pins: {},
  };
}

/* ---------------- procedural map generator ----------------
   Builds a complete, playable map from scratch: a lake, a winding river,
   a few crossing roads (auto-bridges appear where they meet water), then
   scatters terrain, foliage, buildings, play areas, a fair, a train and a
   little camp, all kept clear of water and roads. Deterministic for a given
   seed; pass nothing for a fresh random map. */
const _PLACE_NAMES = ["Willow Lake", "The Meadows", "Oak Common", "Bluebell Wood",
  "Riverside", "Sunny Field", "Hilltop", "Fox Hollow", "Cedar Park", "Mill Pond"];
const _ROOFS = ["#C77BAE", "#7FB0DD", "#7BA86A", "#E8A24A", "#E8617A"];
const _TRAIN_COLS = ["#E8617A", "#2C97E0", "#2FB16B", "#FFB72E", "#8A5BF0"];
const _CAR_COLS = ["#FF6A45", "#2C97E0", "#FFB72E", "#FF5CA0", "#8A5BF0"];

function generateLayout(seed) {
  seed = (seed == null) ? Math.floor(Math.random() * 1e9) : (seed | 0);
  const rnd = _seeded(seed || 1);
  const ri = (a, b) => Math.round(a + rnd() * (b - a));
  const rf = (a, b) => +(a + rnd() * (b - a)).toFixed(2);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  const W = 1600, H = 1000;
  const areas = [], paths = [], items = [];

  /* geometry helpers */
  const pip = (p, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  };
  const dseg = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };

  /* ---- lake in a random corner ---- */
  const corner = pick([[0, 0], [W, 0], [0, H], [W, H]]);
  const lakeCx = corner[0] + (corner[0] === 0 ? ri(120, 280) : -ri(120, 280));
  const lakeCy = corner[1] + (corner[1] === 0 ? ri(110, 240) : -ri(110, 240));
  const lakeR = ri(210, 320);
  const lakePts = [];
  const NL = 9;
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * Math.PI * 2, rr = lakeR * (0.72 + rnd() * 0.5);
    lakePts.push([Math.round(lakeCx + Math.cos(a) * rr * 1.12), Math.round(lakeCy + Math.sin(a) * rr * 0.9)]);
  }
  areas.push({ id: uid("water"), kind: "water", pts: lakePts });

  /* ---- one winding river edge-to-edge ---- */
  const vertical = chance(0.55);
  const river = [];
  const riverW = ri(34, 50);
  if (vertical) {
    let x = ri(W * 0.34, W * 0.7);
    for (let y = -40; y <= H + 60; y += ri(150, 200)) { x = Math.max(150, Math.min(W - 150, x + ri(-150, 150))); river.push([x, y]); }
  } else {
    let y = ri(H * 0.3, H * 0.7);
    for (let x = -40; x <= W + 60; x += ri(190, 240)) { y = Math.max(150, Math.min(H - 150, y + ri(-140, 140))); river.push([x, y]); }
  }
  paths.push({ id: uid("river"), kind: "river", w: riverW, pts: river });

  /* ---- 2-3 roads crossing the map ---- */
  const roadList = [];
  const nRoads = ri(2, 3);
  for (let r = 0; r < nRoads; r++) {
    const horiz = (r % 2 === 0);
    const road = [];
    if (horiz) {
      let y = ri(H * 0.22, H * 0.82);
      for (let x = -60; x <= W + 60; x += ri(190, 260)) { y = Math.max(110, Math.min(H - 110, y + ri(-85, 85))); road.push([x, y]); }
    } else {
      let x = ri(W * 0.2, W * 0.85);
      for (let y = -60; y <= H + 60; y += ri(190, 260)) { x = Math.max(110, Math.min(W - 110, x + ri(-85, 85))); road.push([x, y]); }
    }
    const kind = chance(0.78) ? "road" : "dirt";
    const w = ri(28, 46);
    paths.push({ id: uid("road"), kind, w, pts: road });
    roadList.push({ pts: road, w });
  }

  /* ---- placement guards ---- */
  const inWater = (x, y, m = 0) => {
    if (pip([x, y], lakePts)) return true;
    for (let i = 0; i < river.length - 1; i++) if (dseg([x, y], river[i], river[i + 1]) < riverW / 2 + 8 + m) return true;
    return false;
  };
  const onRoad = (x, y, m = 0) => {
    for (const rd of roadList) for (let i = 0; i < rd.pts.length - 1; i++) if (dseg([x, y], rd.pts[i], rd.pts[i + 1]) < rd.w / 2 + 10 + m) return true;
    return false;
  };
  const onGrass = (x, y, m = 30) => !inWater(x, y, m) && !onRoad(x, y, m);
  const place = (make, opt) => {
    opt = opt || {};
    const x0 = opt.x0 == null ? 70 : opt.x0, x1 = opt.x1 == null ? W - 70 : opt.x1;
    const y0 = opt.y0 == null ? 70 : opt.y0, y1 = opt.y1 == null ? H - 70 : opt.y1;
    for (let t = 0; t < 26; t++) {
      const x = ri(x0, x1), y = ri(y0, y1);
      const ok = opt.water ? (pip([x, y], lakePts) && !onRoad(x, y)) : onGrass(x, y, opt.margin);
      if (ok) { items.push(make(x, y)); return [x, y]; }
    }
    return null;
  };

  /* ---- terrain: mountains along the back, hills scattered ---- */
  const mtnY = corner[1] === 0 ? 250 : 250;            // NOTE: (VR) keep the range near the top whichever corner the lake landed in
  const nMtn = ri(2, 3);
  for (let i = 0; i < nMtn; i++) {
    const x = Math.round((i + 0.5) * (W / nMtn) + ri(-90, 90));
    if (!pip([x, mtnY], lakePts)) items.push({ id: uid("mtn"), kind: "mountain", x, y: ri(200, 280), s: rf(0.85, 1.4) });
  }
  for (let i = 0; i < ri(2, 4); i++) place((x, y) => ({ id: uid("hill"), kind: "hill", x, y, s: rf(0.7, 1.15) }), { margin: 20, y0: 280 });

  /* ---- forest: clustered trees + bushes ---- */
  const nClusters = ri(7, 11);
  for (let c = 0; c < nClusters; c++) {
    let cx = 0, cy = 0, found = false;
    for (let t = 0; t < 20 && !found; t++) { cx = ri(120, W - 120); cy = ri(120, H - 120); if (onGrass(cx, cy, 10)) found = true; }
    if (!found) continue;
    const n = ri(4, 8);
    for (let i = 0; i < n; i++) {
      const x = Math.round(cx + ri(-110, 110)), y = Math.round(cy + ri(-80, 80));
      if (onGrass(x, y, 8)) items.push({ id: uid("tree"), kind: "tree", x, y, r: ri(16, 38), variant: chance(0.5) ? "dark" : "light" });
    }
  }
  for (let i = 0; i < ri(4, 7); i++) place((x, y) => ({ id: uid("bush"), kind: "bush", x, y, r: ri(13, 20), count: ri(3, 6), seed: ri(1, 1e6) }), { margin: 16 });
  for (let i = 0; i < ri(4, 6); i++) place((x, y) => ({ id: uid("rock"), kind: "rock", x, y, r: ri(12, 22) }), { margin: 16 });

  /* ---- flowers in little patches ---- */
  const fcols = ["#FF7BAC", "#FFD54A", "#7FB0FF", "#FF6A45", "#B98AF0"];
  for (let p = 0; p < ri(3, 5); p++) {
    let cx = ri(120, W - 120), cy = ri(120, H - 120);
    if (!onGrass(cx, cy, 12)) continue;
    const col = pick(fcols);
    for (let i = 0; i < ri(3, 5); i++) { const x = cx + ri(-28, 28), y = cy + ri(-22, 22); if (onGrass(x, y, 6)) items.push({ id: uid("flw"), kind: "flower", x, y, color: col }); }
  }

  /* ---- houses ---- */
  for (let i = 0; i < ri(3, 5); i++) place((x, y) => ({ id: uid("house"), kind: "house", x, y, w: ri(46, 78), roof: pick(_ROOFS) }), { margin: 34 });

  /* ---- a playground cluster ---- */
  const pg = place(() => ({ id: uid("nil"), kind: "rock", x: 0, y: 0, r: 0 }), { margin: 60 });
  if (pg) {
    items.pop(); // NOTE: (VR) drop the throwaway probe item, we only wanted its position
    const [px, py] = pg;
    const playKinds = ["swing", "slide", "seesaw", "sandpit", "roundabout"];
    const shuffled = playKinds.sort(() => rnd() - 0.5).slice(0, ri(3, 4));
    shuffled.forEach((k, i) => {
      const x = Math.round(px + (i - 1.5) * 56 + ri(-10, 10)), y = Math.round(py + ri(-24, 24));
      if (onGrass(x, y, 6)) items.push({ id: uid(k), kind: k, x, y, s: rf(0.85, 1.1), flip: chance(0.5) });
    });
  }

  /* ---- a small fair ---- */
  const fair = place(() => ({ id: uid("nil"), kind: "rock", x: 0, y: 0, r: 0 }), { margin: 70, y0: H * 0.45 });
  if (fair) {
    items.pop();
    const [fx, fy] = fair;
    items.push({ id: uid("fw"), kind: "ferriswheel", x: fx, y: fy, s: rf(0.95, 1.2) });
    if (onGrass(fx + 70, fy + 8, 6)) items.push({ id: uid("stl"), kind: "stall", x: fx + 70, y: fy + 8, s: 1, stripe: pick(fcols) });
    if (onGrass(fx - 60, fy + 18, 6)) items.push({ id: uid("ice"), kind: "icecream", x: fx - 60, y: fy + 18, s: 1 });
    items.push({ id: uid("bal"), kind: "balloon", x: fx + 30, y: fy - 6, s: 1 });
  }

  /* ---- people & a dog ---- */
  for (let i = 0; i < ri(1, 2); i++) { const pos = place((x, y) => ({ id: uid("fam"), kind: "family", x, y, s: 1 }), { margin: 18 }); if (pos && chance(0.7)) items.push({ id: uid("dog"), kind: "dog", x: pos[0] + 34, y: pos[1] + 6, s: 0.9, color: "#C98A4B", flip: true }); }
  place((x, y) => ({ id: uid("kid"), kind: "kid", x, y, s: 1 }), { margin: 14 });
  place((x, y) => ({ id: uid("pic"), kind: "picnic", x, y, s: rf(0.9, 1.1) }), { margin: 26 });

  /* ---- a chu-chu train riding one of the roads ---- */
  const trainRoad = roadList[0];
  if (trainRoad) {
    for (let t = 0; t < 18; t++) {
      const k = Math.floor(rnd() * (trainRoad.pts.length - 1));
      const a = trainRoad.pts[k], b = trainRoad.pts[k + 1];
      const mx = Math.round((a[0] + b[0]) / 2), my = Math.round((a[1] + b[1]) / 2);
      if (mx > 40 && mx < W - 40 && my > 40 && my < H - 40 && !inWater(mx, my)) {
        items.push({ id: uid("trn"), kind: "train", x: mx, y: my, s: rf(0.8, 1), color: pick(_TRAIN_COLS), flip: b[0] < a[0] });
        break;
      }
    }
  }

  /* ---- a car or tractor on a road ---- */
  const vRoad = roadList[roadList.length - 1];
  if (vRoad) {
    for (let t = 0; t < 14; t++) {
      const k = Math.floor(rnd() * (vRoad.pts.length - 1));
      const p = vRoad.pts[k];
      if (p[0] > 60 && p[0] < W - 60 && p[1] > 60 && p[1] < H - 60 && !inWater(p[0], p[1])) {
        items.push(chance(0.5)
          ? { id: uid("car"), kind: "car", x: p[0], y: p[1], s: 1, color: pick(_CAR_COLS), flip: chance(0.5) }
          : { id: uid("trc"), kind: "tractor", x: p[0], y: p[1], s: 1, color: "#2FB16B", flip: chance(0.5) });
        break;
      }
    }
  }

  /* ---- windmill + a camp ---- */
  place((x, y) => ({ id: uid("wml"), kind: "windmill", x, y, s: rf(0.9, 1.1) }), { margin: 30 });
  const camp = place((x, y) => ({ id: uid("tnt"), kind: "tent", x, y, s: 1 }), { margin: 36 });
  if (camp && onGrass(camp[0] + 48, camp[1] + 6, 8)) items.push({ id: uid("fire"), kind: "campfire", x: camp[0] + 48, y: camp[1] + 6, s: 0.9 });

  /* ---- water life ---- */
  for (let i = 0; i < ri(3, 6); i++) place((x, y) => ({ id: uid("duck"), kind: "duck", x, y, s: rf(0.8, 1), flip: chance(0.5) }), { water: true });
  for (let i = 0; i < ri(2, 4); i++) place((x, y) => ({ id: uid("lp"), kind: "lilypad", x, y, seed: ri(1, 1e6) }), { water: true });
  if (chance(0.7)) place((x, y) => ({ id: uid("swn"), kind: "swan", x, y, s: 1, flip: chance(0.5) }), { water: true });

  /* ---- a couple of place-name labels ---- */
  const names = _PLACE_NAMES.slice().sort(() => rnd() - 0.5);
  items.push({ id: uid("label"), kind: "label", x: Math.round(lakeCx), y: Math.round(lakeCy), text: names[0], size: 26 });
  place((x, y) => ({ id: uid("label"), kind: "label", x, y, text: names[1], size: 26 }), { margin: 30 });

  return { v: 3, seed, areas, paths, items, pins: {} };
}

function generateAndSave(seed) {
  const layout = generateLayout(seed);
  saveLayout(layout);
  return layout;
}

/* a completely blank canvas: no roads, water, foliage or props.
   pins stay empty so activity markers fall back to their authored positions. */
function emptyLayout() {
  return { v: 3, areas: [], paths: [], items: [], pins: {} };
}

/* ---------------- persistence ---------------- */
function loadLayout() {
  try {
    const raw = localStorage.getItem(LDA_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 3) return parsed;
    }
  } catch (e) { /* ignore */ }
  return defaultLayout();
}
function saveLayout(layout) {
  try { localStorage.setItem(LDA_MAP_KEY, JSON.stringify(layout)); } catch (e) { /* ignore */ }
}
function resetLayout() {
  try { localStorage.removeItem(LDA_MAP_KEY); } catch (e) { /* ignore */ }
  return defaultLayout();
}

function clearLayout() {
  const empty = emptyLayout();
  saveLayout(empty);
  return empty;
}

window.LDA_MAP = { defaultLayout, emptyLayout, loadLayout, saveLayout, resetLayout, clearLayout, generateLayout, generateAndSave, uid, LDA_MAP_KEY };
