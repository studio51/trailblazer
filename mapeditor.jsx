// mapeditor.jsx: in-place map builder overlaid on the hero.
// Edits the same layout the hero renders. Tools: select/reshape, draw roads & rivers,
// draw water, stamp trees/bushes/houses/benches/rocks/flowers/labels, move pins, delete.

const { useState, useRef, useEffect, useCallback } = React;
const SCENE = window.LDA_SCENE;
const MAPDATA = window.LDA_MAP;

/* quick-access tools (always visible) */
const QUICK = [
  { id: "select", label: "Select", icon: "navigation" },
  { id: "pin", label: "Move pins", icon: "pin" },
];
/* drill-down categories */
const CATS = [
  { group: "Draw", icon: "mapIcon", items: [
    { id: "road", label: "Path", icon: "navigation" },
    { id: "traffic", label: "Traffic road", icon: "car" },
    { id: "dirt", label: "Dirt track", icon: "navigation" },
    { id: "river", label: "River", icon: "waves" },
    { id: "water", label: "Water", icon: "droplets" },
  ]},
  { group: "Nature", icon: "treePine", items: [
    { id: "tree", label: "Tree", icon: "treePine" },
    { id: "bush", label: "Bush", icon: "trees" },
    { id: "rock", label: "Rock", icon: "sparkles" },
    { id: "flower", label: "Flower", icon: "sun" },
    { id: "sheep", label: "Sheep", icon: "sheep" },
    { id: "duck", label: "Duck", icon: "duck" },
    { id: "swan", label: "Swan", icon: "swan" },
    { id: "lilypad", label: "Lily pads", icon: "lilypad" },
    { id: "fountain", label: "Fountain", icon: "fountain" },
  ]},
  { group: "People", icon: "users", items: [
    { id: "family", label: "Family", icon: "users" },
    { id: "kid", label: "Child", icon: "walk" },
    { id: "dog", label: "Dog", icon: "dog" },
  ]},
  { group: "Play", icon: "ferris", items: [
    { id: "swing", label: "Swings", icon: "swing" },
    { id: "slide", label: "Slide", icon: "slide" },
    { id: "seesaw", label: "Seesaw", icon: "seesaw" },
    { id: "sandpit", label: "Sandpit", icon: "sandpit" },
    { id: "roundabout", label: "Roundabout", icon: "roundabout" },
    { id: "ferriswheel", label: "Big wheel", icon: "ferris" },
    { id: "balloon", label: "Balloons", icon: "balloon" },
    { id: "kite", label: "Kite", icon: "kite" },
  ]},
  { group: "Vehicles", icon: "car", items: [
    { id: "car", label: "Car", icon: "car" },
    { id: "tractor", label: "Tractor", icon: "tractor" },
    { id: "train", label: "Chu-chu train", icon: "train" },
  ]},
  { group: "Carts", icon: "cart", items: [
    { id: "icecream", label: "Ice cream", icon: "icecream" },
    { id: "hotdog", label: "Hot dog", icon: "hotdog" },
    { id: "ballooncart", label: "Balloon cart", icon: "balloon" },
    { id: "stall", label: "Market stall", icon: "stall" },
  ]},
  { group: "Buildings", icon: "landmark", items: [
    { id: "house", label: "House", icon: "landmark" },
    { id: "museum", label: "Museum", icon: "landmark" },
    { id: "cafe", label: "Café", icon: "cafe" },
    { id: "shop", label: "Shop", icon: "shop" },
    { id: "toilets", label: "Toilets", icon: "toilets" },
    { id: "gazebo", label: "Bandstand", icon: "gazebo" },
  ]},
  { group: "Build", icon: "bridge", items: [
    { id: "bench", label: "Bench", icon: "users" },
    { id: "bridge", label: "Bridge", icon: "bridge" },
    { id: "statue", label: "Statue", icon: "statue" },
    { id: "lamp", label: "Lamp post", icon: "lamp" },
    { id: "signpost", label: "Signpost", icon: "signpost" },
    { id: "picnic", label: "Picnic", icon: "heart" },
    { id: "label", label: "Label", icon: "book" },
  ]},
  { group: "Terrain & camp", icon: "mountain", items: [
    { id: "hill", label: "Hill", icon: "hill" },
    { id: "mountain", label: "Mountain", icon: "mountain" },
    { id: "windmill", label: "Windmill", icon: "windmill" },
    { id: "tent", label: "Tent", icon: "tent" },
    { id: "campfire", label: "Campfire", icon: "campfire" },
  ]},
];
const DRAW_TOOLS = ["road", "traffic", "dirt", "river", "water"];
const STAMP_TOOLS = ["tree", "bush", "house", "bench", "rock", "flower", "label",
  "family", "kid", "dog", "balloon", "ferriswheel", "car", "tractor", "picnic",
  "duck", "kite", "icecream", "hotdog", "ballooncart",
  "lilypad", "fountain", "swing", "slide", "stall", "lamp", "signpost", "bridge",
  "museum", "cafe", "shop", "toilets", "gazebo", "statue", "seesaw", "sandpit", "roundabout", "swan", "sheep",
  "train", "hill", "mountain", "windmill", "tent", "campfire"];
const FLOWER_COLORS = ["#FF7BAC", "#FFD54A", "#7FB0FF", "#FF6A45", "#B98AF0"];
const ROOF_COLORS = ["#C77BAE", "#7FB0DD", "#7BA86A", "#E8A24A", "#E8617A"];
const CAR_COLORS = ["#FF6A45", "#2C97E0", "#FFB72E", "#FF5CA0", "#8A5BF0"];
const TRACTOR_COLORS = ["#2FB16B", "#FF6A45", "#2C97E0", "#FFB72E", "#14BEBE"];
const TRAIN_COLORS = ["#E8617A", "#2C97E0", "#2FB16B", "#FFB72E", "#8A5BF0"];
const DOG_COLORS = ["#C98A4B", "#8A5A30", "#3C3A40", "#E0C088", "#D9D4CF"];
const TREE_COLORS = ["#74BA6B", "#5BA158", "#8FCB7E", "#E8A24A", "#E0673F", "#C9A23A"];
const BUSH_COLORS = ["#7EC177", "#6FB36A", "#9ED68C", "#5BA158", "#C77BAE"];
const STALL_COLORS = ["#E8617A", "#2C97E0", "#FFB72E", "#2FB16B", "#8A5BF0"];
const CAFE_COLORS = ["#E0673F", "#E8617A", "#2FB16B", "#C77BAE", "#E8A24A"];
const SHOP_COLORS = ["#2C97E0", "#E8617A", "#2FB16B", "#FFB72E", "#8A5BF0"];
const LABEL_COLORS = ["#5C4A33", "#2C97E0", "#E8617A", "#2FB16B", "#8A5BF0"];
const SCALE_KINDS = new Set(["family", "kid", "dog", "balloon", "ferriswheel", "car", "tractor", "picnic",
  "duck", "kite", "icecream", "hotdog", "ballooncart", "fountain", "swing", "slide", "stall", "lamp", "signpost",
  "museum", "cafe", "shop", "toilets", "gazebo", "statue", "seesaw", "sandpit", "roundabout", "swan", "sheep",
  "train", "hill", "mountain", "windmill", "tent", "campfire"]);
const FLIP_KINDS = new Set(["car", "tractor", "dog", "duck", "kite", "slide", "signpost", "swan", "train"]);
const STRIPE_KINDS = new Set(["stall", "cafe", "shop"]);
const STRIPE_PALETTES = { stall: STALL_COLORS, cafe: CAFE_COLORS, shop: SHOP_COLORS };
const COLOR_KINDS = { flower: FLOWER_COLORS, car: CAR_COLORS, tractor: TRACTOR_COLORS, dog: DOG_COLORS,
  tree: TREE_COLORS, bush: BUSH_COLORS, label: LABEL_COLORS, stall: STALL_COLORS, cafe: CAFE_COLORS, shop: SHOP_COLORS,
  train: TRAIN_COLORS };
const GRID = 40;
const rseed = () => Math.floor(Math.random() * 1e6);

function makeItem(kind, x, y) {
  const u = MAPDATA.uid;
  x = Math.round(x); y = Math.round(y);
  switch (kind) {
    case "tree":   return { id: u("tree"), kind, x, y, r: 24, variant: "light" };
    case "bush":   return { id: u("bush"), kind, x, y, r: 16, count: 3, seed: rseed() };
    case "rock":   return { id: u("rock"), kind, x, y, r: 16 };
    case "flower": return { id: u("flw"), kind, x, y, color: "#FF7BAC" };
    case "house":  return { id: u("house"), kind, x, y, w: 56, roof: "#C77BAE" };
    case "bench":  return { id: u("bench"), kind, x, y, rot: 0 };
    case "label":  return { id: u("label"), kind, x, y, text: "New label", size: 26 };
    case "family": return { id: u("fam"), kind, x, y, s: 1 };
    case "kid":    return { id: u("kid"), kind, x, y, s: 1 };
    case "dog":    return { id: u("dog"), kind, x, y, s: 1, color: "#C98A4B", flip: false };
    case "balloon": return { id: u("bal"), kind, x, y, s: 1 };
    case "ferriswheel": return { id: u("fw"), kind, x, y, s: 1 };
    case "car":    return { id: u("car"), kind, x, y, s: 1, color: "#FF6A45", flip: false };
    case "tractor": return { id: u("trc"), kind, x, y, s: 1, color: "#2FB16B", flip: false };
    case "picnic": return { id: u("pic"), kind, x, y, s: 1 };
    case "duck":   return { id: u("duck"), kind, x, y, s: 1, flip: false };
    case "kite":   return { id: u("kite"), kind, x, y, s: 1, flip: false };
    case "icecream":    return { id: u("ice"), kind, x, y, s: 1 };
    case "hotdog":      return { id: u("hd"), kind, x, y, s: 1 };
    case "ballooncart": return { id: u("bc"), kind, x, y, s: 1 };
    case "lilypad": return { id: u("lp"), kind, x, y, seed: rseed() };
    case "fountain": return { id: u("ftn"), kind, x, y, s: 1 };
    case "swing":   return { id: u("swg"), kind, x, y, s: 1 };
    case "slide":   return { id: u("sld"), kind, x, y, s: 1, flip: false };
    case "stall":   return { id: u("stl"), kind, x, y, s: 1, stripe: "#E8617A" };
    case "lamp":    return { id: u("lmp"), kind, x, y, s: 1 };
    case "signpost": return { id: u("sgn"), kind, x, y, s: 1, flip: false };
    case "bridge":  return { id: u("brg"), kind, x, y, rot: 0, len: 96, style: "wood" };
    case "museum":  return { id: u("mus"), kind, x, y, s: 1 };
    case "cafe":    return { id: u("cafe"), kind, x, y, s: 1, stripe: "#E0673F" };
    case "shop":    return { id: u("shop"), kind, x, y, s: 1, stripe: "#2C97E0" };
    case "toilets": return { id: u("wc"), kind, x, y, s: 1 };
    case "gazebo":  return { id: u("gaz"), kind, x, y, s: 1 };
    case "statue":  return { id: u("sta"), kind, x, y, s: 1 };
    case "seesaw":  return { id: u("see"), kind, x, y, s: 1 };
    case "sandpit": return { id: u("snd"), kind, x, y, s: 1 };
    case "roundabout": return { id: u("rnd"), kind, x, y, s: 1 };
    case "swan":    return { id: u("swn"), kind, x, y, s: 1, flip: false };
    case "sheep":   return { id: u("shp"), kind, x, y, s: 1 };
    case "train":   return { id: u("trn"), kind, x, y, s: 1, color: "#E8617A", flip: false };
    case "hill":    return { id: u("hill"), kind, x, y, s: 1 };
    case "mountain": return { id: u("mtn"), kind, x, y, s: 1 };
    case "windmill": return { id: u("wml"), kind, x, y, s: 1 };
    case "tent":    return { id: u("tnt"), kind, x, y, s: 1 };
    case "campfire": return { id: u("fire"), kind, x, y, s: 1 };
    default:       return null;
  }
}

/* random helpers */
const _rnd = (a, b) => a + Math.random() * (b - a);
const _pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* a patch of randomised props for whatever options this element has */
function randomPatch(el, type) {
  const k = el.kind, p = {};
  if (type === "path") {
    p.w = Math.round(_rnd(20, 64));
    p.o = +_rnd(0.7, 1).toFixed(2);
    return p;
  }
  if (type === "area") { p.o = +_rnd(0.55, 1).toFixed(2); return p; }
  if (k === "tree" || k === "rock") p.r = Math.round(_rnd(14, 52));
  if (k === "tree") p.variant = _pick(["light", "dark"]);
  if (k === "bush") { p.count = 1 + Math.floor(Math.random() * 8); p.seed = rseed(); p.r = Math.round(_rnd(12, 22)); }
  if (k === "lilypad") p.seed = rseed();
  if (k === "house") { p.w = Math.round(_rnd(40, 100)); p.roof = _pick(ROOF_COLORS); }
  if (k === "label") p.size = Math.round(_rnd(18, 46));
  if (k === "bench") p.rot = Math.round(_rnd(-40, 40));
  if (k === "bridge") { p.rot = Math.round(_rnd(-40, 40)); p.len = Math.round(_rnd(60, 180)); p.style = _pick(["wood", "stone"]); }
  if (SCALE_KINDS.has(k)) p.s = +_rnd(0.7, 1.7).toFixed(2);
  if (COLOR_KINDS[k]) p.color = _pick(COLOR_KINDS[k]);
  if (STRIPE_KINDS.has(k)) p.stripe = _pick(STRIPE_PALETTES[k] || STALL_COLORS);
  if (FLIP_KINDS.has(k)) p.flip = Math.random() < 0.5;
  p.o = +_rnd(0.82, 1).toFixed(2);
  return p;
}

function MapEditor({ layout, setLayout, activities, cats, onClose }) {
  const [tool, setTool] = useState("select");
  const [draft, setDraft] = useState(null);          // { kind, pts:[] } while drawing
  const [sel, setSel] = useState(null);              // { type:'item'|'path'|'area'|'pin', id }
  const [scale, setScale] = useState(0.5);
  const [openGroup, setOpenGroup] = useState(null);  // drilled-in category, or null
  const [snap, setSnap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [random, setRandom] = useState(false);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const undoRef = useRef([]);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const randomRef = useRef(random);
  randomRef.current = random;
  const snapV = (v) => snapRef.current ? Math.round(v / GRID) * GRID : Math.round(v);

  /* keep a live scale (svg units → px) for sizing handles */
  useEffect(() => {
    const measure = () => {
      const el = canvasRef.current;
      if (el) setScale(el.getBoundingClientRect().width / 1600);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* commit a layout change (with undo + persist) */
  const commit = useCallback((next) => {
    undoRef.current.push(JSON.stringify(layout));
    if (undoRef.current.length > 40) undoRef.current.shift();
    MAPDATA.saveLayout(next);
    setLayout(next);
  }, [layout, setLayout]);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    const p = JSON.parse(prev);
    MAPDATA.saveLayout(p);
    setLayout(p);
    setSel(null); setDraft(null);
  }, [setLayout]);

  /* pointer → svg user coords */
  const toSvg = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const s = r.width / 1600;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };

  /* bring selection to front / send to back via z-order */
  const reorder = useCallback((dir) => {
    if (!sel) return;
    const next = JSON.parse(JSON.stringify(layout));
    const coll = sel.type === "item" ? next.items : sel.type === "path" ? next.paths : sel.type === "area" ? next.areas : null;
    if (!coll) return;
    const el = coll.find((x) => x.id === sel.id);
    if (!el) return;
    const zs = coll.map((x) => x.z || 0);
    el.z = dir === "front" ? Math.max(...zs, 0) + 1 : Math.min(...zs, 0) - 1;
    commit(next);
  }, [sel, layout, commit]);

  /* ---- delete current selection ---- */
  const deleteSel = useCallback(() => {
    if (!sel) return;
    const next = JSON.parse(JSON.stringify(layout));
    if (sel.type === "item")  next.items = next.items.filter((i) => i.id !== sel.id);
    if (sel.type === "path")  next.paths = next.paths.filter((p) => p.id !== sel.id);
    if (sel.type === "area")  next.areas = next.areas.filter((a) => a.id !== sel.id);
    if (sel.type === "pin")   { delete next.pins[sel.id]; }
    commit(next);
    setSel(null);
  }, [sel, layout, commit]);

  /* ---- finish / cancel an in-progress shape ---- */
  const finishDraft = useCallback(() => {
    if (!draft) return;
    const need = draft.kind === "water" ? 3 : 2;
    if (draft.pts.length < need) { setDraft(null); return; }
    const next = JSON.parse(JSON.stringify(layout));
    if (draft.kind === "water") {
      next.areas.push({ id: MAPDATA.uid("water"), kind: "water", pts: draft.pts });
    } else {
      const W = { road: 40, traffic: 56, dirt: 38, river: 40 }[draft.kind] || 40;
      next.paths.push({ id: MAPDATA.uid(draft.kind), kind: draft.kind, w: W, pts: draft.pts });
    }
    commit(next);
    setDraft(null);
  }, [draft, layout, commit]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (e.key === "Enter" && draft) { e.preventDefault(); finishDraft(); }
      else if (e.key === "Escape") { if (draft) setDraft(null); else if (sel) setSel(null); else onClose(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteSel(); }
      else if (e.key === "v") setTool("select");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, sel, undo, finishDraft, deleteSel, onClose]);

  /* ---- canvas pointer handlers ---- */
  const onCanvasDown = (e) => {
    const p = toSvg(e);
    const t = e.target;
    const hitType = t.getAttribute && t.getAttribute("data-htype");
    const hitId = t.getAttribute && t.getAttribute("data-hid");
    const vtx = t.getAttribute && t.getAttribute("data-vtx");
    const ins = t.getAttribute && t.getAttribute("data-ins");

    if (DRAW_TOOLS.includes(tool)) {
      setDraft((d) => {
        const kind = tool;
        const np = [snapV(p.x), snapV(p.y)];
        const pts = d && d.kind === kind ? [...d.pts, np] : [np];
        return { kind, pts };
      });
      return;
    }

    // NOTE: (VR) reshape handles on the selected path/area work in select + stamp modes
    if (ins != null && sel && (sel.type === "path" || sel.type === "area")) {
      const idx = +ins;
      const next = JSON.parse(JSON.stringify(layout));
      const el = (sel.type === "path" ? next.paths : next.areas).find((x) => x.id === sel.id);
      el.pts.splice(idx, 0, [snapV(p.x), snapV(p.y)]);
      commit(next);
      dragRef.current = { mode: "vertex", idx, start: p, orig: JSON.parse(JSON.stringify(next)) };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (vtx != null && sel && (sel.type === "path" || sel.type === "area")) {
      dragRef.current = { mode: "vertex", idx: +vtx, start: p, orig: JSON.parse(JSON.stringify(layout)) };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // NOTE: (VR) clicking an existing element selects and drags it, in select or stamp mode
    if (hitType && hitId) {
      if (hitType === "pin") {
        if (tool === "pin") {
          setSel({ type: "pin", id: hitId });
          dragRef.current = { mode: "pin", id: hitId, start: p, orig: JSON.parse(JSON.stringify(layout)) };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      } else if (tool === "select" || STAMP_TOOLS.includes(tool)) {
        setSel({ type: hitType, id: hitId });
        dragRef.current = { mode: "move", type: hitType, id: hitId, start: p, orig: JSON.parse(JSON.stringify(layout)) };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    // NOTE: (VR) empty space + a stamp tool places a new element
    if (STAMP_TOOLS.includes(tool)) {
      const it = makeItem(tool, snapV(p.x), snapV(p.y));
      if (it && randomRef.current) Object.assign(it, randomPatch(it, "item"));
      const next = JSON.parse(JSON.stringify(layout));
      next.items.push(it);
      commit(next);
      setSel({ type: "item", id: it.id });   // NOTE: (VR) keep the tool active so you can place more
      return;
    }
    // NOTE: (VR) empty space with any other tool deselects
    setSel(null);
  };

  const onCanvasMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toSvg(e);
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    const next = JSON.parse(JSON.stringify(d.orig));
    if (d.mode === "pin") {
      const a = activities.find((x) => x.id === d.id);
      const base = (d.orig.pins && d.orig.pins[d.id]) || { x: a.x, y: a.y };
      next.pins[d.id] = {
        x: Math.max(0, Math.min(100, +(base.x + dx / 16).toFixed(2))),
        y: Math.max(0, Math.min(100, +(base.y + dy / 10).toFixed(2))),
      };
    } else if (d.mode === "move") {
      if (d.type === "item") {
        const it = next.items.find((i) => i.id === d.id);
        const o = d.orig.items.find((i) => i.id === d.id);
        it.x = snapV(o.x + dx); it.y = snapV(o.y + dy);
      } else {
        const sdx = snapRef.current ? Math.round(dx / GRID) * GRID : Math.round(dx);
        const sdy = snapRef.current ? Math.round(dy / GRID) * GRID : Math.round(dy);
        const arr = d.type === "path" ? next.paths : next.areas;
        const oarr = d.type === "path" ? d.orig.paths : d.orig.areas;
        const el = arr.find((x) => x.id === d.id);
        const oel = oarr.find((x) => x.id === d.id);
        el.pts = oel.pts.map(([x, y]) => [x + sdx, y + sdy]);
      }
    } else if (d.mode === "vertex") {
      const arr = sel.type === "path" ? next.paths : next.areas;
      const oarr = sel.type === "path" ? d.orig.paths : d.orig.areas;
      const el = arr.find((x) => x.id === sel.id);
      const oel = oarr.find((x) => x.id === sel.id);
      el.pts = oel.pts.map((pt, i) => i === d.idx ? [snapV(pt[0] + dx), snapV(pt[1] + dy)] : pt);
    }
    setLayout(next); // NOTE: (VR) live update only; history is recorded once on pointer-up
  };

  const onCanvasUp = (e) => {
    const d = dragRef.current;
    if (d) {
      // NOTE: (VR) record one history entry for the whole drag, then persist
      undoRef.current.push(JSON.stringify(d.orig));
      if (undoRef.current.length > 40) undoRef.current.shift();
      MAPDATA.saveLayout(layout);
      dragRef.current = null;
    }
  };

  /* double-click: finish a draft, or delete a vertex of the selected shape */
  const onCanvasDouble = (e) => {
    if (draft) { finishDraft(); return; }
    const vtx = e.target.getAttribute && e.target.getAttribute("data-vtx");
    if (vtx != null && sel && (sel.type === "path" || sel.type === "area")) {
      const idx = +vtx;
      const arr = sel.type === "path" ? layout.paths : layout.areas;
      const el = arr.find((x) => x.id === sel.id);
      const min = sel.type === "area" ? 3 : 2;
      if (!el || el.pts.length <= min) return;
      const next = JSON.parse(JSON.stringify(layout));
      (sel.type === "path" ? next.paths : next.areas).find((x) => x.id === sel.id).pts.splice(idx, 1);
      commit(next);
    }
  };
  const updateSel = (patch) => {
    const next = JSON.parse(JSON.stringify(layout));
    let el;
    if (sel.type === "item") el = next.items.find((i) => i.id === sel.id);
    if (sel.type === "path") el = next.paths.find((p) => p.id === sel.id);
    if (sel.type === "area") el = next.areas.find((a) => a.id === sel.id);
    if (el) { Object.assign(el, patch); commit(next); }
  };

  const resetAll = () => {
    if (!window.confirm("Reset the map to the original layout? Your changes will be lost.")) return;
    const fresh = MAPDATA.resetLayout();
    undoRef.current = [];
    setSel(null); setDraft(null);
    setLayout(fresh);
  };

  const clearAll = () => {
    if (!window.confirm("Clear the whole map and start from scratch? Everything will be removed.")) return;
    undoRef.current.push(JSON.stringify(layout));
    if (undoRef.current.length > 40) undoRef.current.shift();
    const blank = MAPDATA.clearLayout();
    setSel(null); setDraft(null);
    setLayout(blank);
  };

  // build a brand-new random map from scratch (undoable, so roll freely)
  const generateMap = () => {
    undoRef.current.push(JSON.stringify(layout));
    if (undoRef.current.length > 40) undoRef.current.shift();
    const fresh = MAPDATA.generateAndSave();
    setSel(null); setDraft(null);
    setLayout(fresh);
  };

  const hr = 7 / scale;   // handle radius in svg units (constant screen size)
  const selEl = sel && (
    sel.type === "item" ? layout.items.find((i) => i.id === sel.id) :
    sel.type === "path" ? layout.paths.find((p) => p.id === sel.id) :
    sel.type === "area" ? layout.areas.find((a) => a.id === sel.id) : null
  );

  return (
    <div className="maped">
      {/* top bar */}
      <div className="maped__bar">
        <div className="maped__title"><Icon name="mapIcon" size={18} stroke={2.2} /> Map builder</div>
        <div className="maped__hint">{hintFor(tool, draft)}</div>
        <div className="maped__baracts">
          <button className={"maped__toggle" + (showGrid ? " is-on" : "")} onClick={() => setShowGrid((v) => !v)} title="Show grid"><Icon name="mapIcon" size={14} stroke={2.2} /> Grid</button>
          <button className={"maped__toggle" + (snap ? " is-on" : "")} onClick={() => setSnap((v) => !v)} title="Snap to grid"><Icon name="navigation" size={14} stroke={2.2} /> Snap</button>
          <button className={"maped__toggle" + (random ? " is-on" : "")} onClick={() => setRandom((v) => !v)} title="Randomise each new element as you place it"><Icon name="sparkles" size={14} stroke={2.2} /> Random</button>
          <span className="maped__bardiv" />
          <button className="maped__btn maped__btn--gen" onClick={generateMap} title="Generate a brand-new random map"><Icon name="sparkles" size={15} stroke={2.4} /> New map</button>
          <button className="maped__btn" onClick={undo} title="Undo (⌘Z)"><Icon name="chevronL" size={15} stroke={2.4} /> Undo</button>
          <button className="maped__btn" onClick={resetAll}>Reset</button>
          <button className="maped__btn" onClick={clearAll}>Clear all</button>
          <button className="maped__btn maped__btn--primary" onClick={onClose}><Icon name="check" size={15} stroke={3} /> Done</button>
        </div>
      </div>

      {/* toolbar: nested drill-down */}
      <div className="maped__tools">
        <div className="maped__quickrow">
          {QUICK.map((tl) => (
            <button key={tl.id} className={"maped__quick" + (tool === tl.id ? " is-on" : "")}
                    onClick={() => { setTool(tl.id); setDraft(null); }} title={tl.label}>
              <Icon name={tl.icon} size={17} stroke={2.1} /><span>{tl.label}</span>
            </button>
          ))}
        </div>
        <div className="maped__divider" />
        {openGroup == null ? (
          <div className="maped__nav">
            {CATS.map((g) => (
              <button key={g.group} className="maped__navrow" onClick={() => setOpenGroup(g.group)}>
                <Icon name={g.icon} size={18} stroke={2.1} />
                <span>{g.group}</span>
                <Icon name="chevronR" size={15} stroke={2.4} className="maped__navchev" />
              </button>
            ))}
          </div>
        ) : (
          <div className="maped__group">
            <button className="maped__back" onClick={() => setOpenGroup(null)}>
              <Icon name="chevronL" size={16} stroke={2.4} /> {openGroup}
            </button>
            {(CATS.find((g) => g.group === openGroup) || { items: [] }).items.map((tl) => (
              <button key={tl.id} className={"maped__tool" + (tool === tl.id ? " is-on" : "")}
                      onClick={() => { setTool(tl.id); setDraft(null); }} title={tl.label}>
                <Icon name={tl.icon} size={18} stroke={2.1} /><span>{tl.label}</span>
              </button>
            ))}
          </div>
        )}
        {draft && (
          <button className="maped__finish" onClick={finishDraft}>
            <Icon name="check" size={15} stroke={3} /> Finish shape ({draft.pts.length})
          </button>
        )}
      </div>

      {/* stage */}
      <div className="maped__stagewrap">
        <div className="maped__canvas" ref={canvasRef}
             onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp}
             onDoubleClick={onCanvasDouble}
             data-tool={tool}>
          <SCENE.MapScene layout={layout} />
          <EditorOverlay
            layout={layout} sel={sel} draft={draft} tool={tool} hr={hr} showGrid={showGrid}
            activities={activities} cats={cats} />
        </div>
      </div>

      {/* inspector */}
      {selEl && (
        <Inspector sel={sel} el={selEl} onChange={updateSel} onDelete={deleteSel} onReorder={reorder} />
      )}
    </div>
  );
}

function hintFor(tool, draft) {
  if (draft) return "Click to add points · double-click or Enter to finish · Esc to cancel";
  switch (tool) {
    case "select": return "Click an element to select · drag to move · drag a dot to reshape · Delete to remove";
    case "pin":    return "Drag any activity pin to reposition it";
    case "road":   return "Click to lay path points · click an existing element to select it instead";
    case "traffic": return "Click to lay the road route · double-click or Enter to finish";
    case "dirt":   return "Click to wind the dirt track point by point";
    case "river":  return "Click to wind the river point by point";
    case "water":  return "Click around the edge of a lake or pond, it fills automatically";
    default:       return "Click empty grass to place · click an existing element to select it";
  }
}

/* ---------- interactive overlay (hit targets, handles, draft preview, pins) ---------- */
function EditorOverlay({ layout, sel, draft, tool, hr, showGrid, activities, cats }) {
  const selectish = tool === "select";
  const pinnish = tool === "pin";
  const hits = tool === "select" || STAMP_TOOLS.includes(tool);   // clickable for selection
  return (
    <svg className="maped__overlay" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      {/* full grid */}
      {showGrid && (
        <g className="maped__grid">
          {Array.from({ length: 1600 / GRID + 1 }).map((_, i) => (
            <line key={"v" + i} x1={i * GRID} y1="0" x2={i * GRID} y2="1000" strokeWidth={i % 5 === 0 ? 1.4 : 0.7} />
          ))}
          {Array.from({ length: 1000 / GRID + 1 }).map((_, i) => (
            <line key={"h" + i} x1="0" y1={i * GRID} x2="1600" y2={i * GRID} strokeWidth={i % 5 === 0 ? 1.4 : 0.7} />
          ))}
        </g>
      )}
      {/* hit targets for paths */}
      {hits && layout.paths.map((p) => (
        <path key={p.id} data-htype="path" data-hid={p.id}
              d={SCENE.smoothPath(p.pts, false)} fill="none" stroke="rgba(0,0,0,0.001)"
              strokeWidth={Math.max(p.w + 18, 26)} strokeLinecap="round" className="maped__hit" />
      ))}
      {/* hit targets for areas */}
      {hits && layout.areas.map((a) => (
        <path key={a.id} data-htype="area" data-hid={a.id}
              d={SCENE.smoothPath(a.pts, true)} fill="rgba(0,0,0,0.001)" className="maped__hit" />
      ))}
      {/* hit targets for items */}
      {hits && layout.items.map((it) => {
        const g = hitGeom(it);
        return (
          <circle key={it.id} data-htype="item" data-hid={it.id}
                  cx={g.cx} cy={g.cy} r={g.r} fill="rgba(0,0,0,0.001)" className="maped__hit" />
        );
      })}

      {/* selection outline */}
      {sel && sel.type === "item" && (() => {
        const it = layout.items.find((i) => i.id === sel.id);
        if (!it) return null;
        const g = hitGeom(it);
        return <circle cx={g.cx} cy={g.cy} r={g.r + 4} className="maped__selring" />;
      })()}
      {sel && (sel.type === "path" || sel.type === "area") && (() => {
        const el = (sel.type === "path" ? layout.paths : layout.areas).find((x) => x.id === sel.id);
        if (!el) return null;
        const ghosts = ghostHandles(el.pts, sel.type === "area");
        return (
          <g>
            <path d={SCENE.smoothPath(el.pts, sel.type === "area")} fill="none" className="maped__seloutline" />
            {/* "+" handles: click to add a point */}
            {ghosts.map((g, i) => (
              <g key={"g" + i} data-ins={g.ins} className="maped__add" transform={`translate(${g.x} ${g.y})`}>
                <circle data-ins={g.ins} r={hr * 0.92} className="maped__adddot" />
                <line data-ins={g.ins} x1={-hr * 0.45} y1="0" x2={hr * 0.45} y2="0" className="maped__addplus" />
                <line data-ins={g.ins} x1="0" y1={-hr * 0.45} x2="0" y2={hr * 0.45} className="maped__addplus" />
              </g>
            ))}
            {el.pts.map((pt, i) => (
              <circle key={i} data-vtx={i} cx={pt[0]} cy={pt[1]} r={hr} className="maped__vtx" />
            ))}
          </g>
        );
      })()}

      {/* draft preview */}
      {draft && (
        <g>
          <path d={SCENE.smoothPath(draft.pts, draft.kind === "water")} fill={draft.kind === "water" ? "rgba(120,200,225,0.4)" : "none"}
                className={"maped__draft maped__draft--" + draft.kind}
                strokeWidth={draft.kind === "water" ? 3 / (hr / 7) : 40} />
          {draft.pts.map((pt, i) => (
            <circle key={i} cx={pt[0]} cy={pt[1]} r={hr * 0.8} className="maped__draftpt" />
          ))}
        </g>
      )}

      {/* pins (draggable in pin mode, shown always for context) */}
      {activities.map((a) => {
        const pos = (layout.pins && layout.pins[a.id]) || { x: a.x, y: a.y };
        const cx = pos.x * 16, cy = pos.y * 10;
        const c = cats[a.cat];
        const on = sel && sel.type === "pin" && sel.id === a.id;
        return (
          <g key={a.id} className={"maped__pin" + (pinnish ? " is-live" : "") + (on ? " is-on" : "")}
             data-htype="pin" data-hid={a.id} transform={`translate(${cx} ${cy})`}>
            <circle r="20" className="maped__pindot" style={{ fill: c.color }} data-htype="pin" data-hid={a.id} />
            <g transform="translate(-10 -10)" style={{ pointerEvents: "none", color: "#fff" }}>
              <Icon name={iconFor(a, c)} size={20} stroke={2.2} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function ghostHandles(pts, closed) {
  if (!pts || pts.length < 2) return [];
  const n = pts.length, out = [];
  // NOTE: (VR) one "+" handle at the midpoint of every segment
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    out.push({ ins: i + 1, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 });
  }
  // NOTE: (VR) for open paths, also offer a handle to extend beyond each end
  if (!closed) {
    const [a0, a1] = [pts[0], pts[1]];
    out.push({ ins: 0, x: a0[0] - (a1[0] - a0[0]) * 0.5, y: a0[1] - (a1[1] - a0[1]) * 0.5 });
    const [b0, b1] = [pts[n - 1], pts[n - 2]];
    out.push({ ins: n, x: b0[0] - (b1[0] - b0[0]) * 0.5, y: b0[1] - (b1[1] - b0[1]) * 0.5 });
  }
  return out;
}

function hitGeom(it) {
  const s = it.s || 1;
  switch (it.kind) {
    case "house":       return { cx: it.x, cy: it.y + (it.w || 56) * 0.33, r: (it.w || 56) * 0.62 };
    case "label":       return { cx: it.x, cy: it.y - 8, r: 28 };
    case "bench":       return { cx: it.x, cy: it.y, r: 24 };
    case "flower":      return { cx: it.x, cy: it.y, r: 12 };
    case "bush":        return { cx: it.x, cy: it.y, r: ((it.count || 3) * (it.r || 16) * 0.92) / 2 + (it.r || 16) };
    case "family":      return { cx: it.x, cy: it.y - 22 * s, r: 28 * s };
    case "kid":         return { cx: it.x, cy: it.y - 14 * s, r: 18 * s };
    case "dog":         return { cx: it.x, cy: it.y - 11 * s, r: 20 * s };
    case "balloon":     return { cx: it.x, cy: it.y - 42 * s, r: 28 * s };
    case "ferriswheel": return { cx: it.x, cy: it.y - 62 * s, r: 50 * s };
    case "car":         return { cx: it.x, cy: it.y - 9 * s, r: 30 * s };
    case "tractor":     return { cx: it.x, cy: it.y - 11 * s, r: 32 * s };
    case "picnic":      return { cx: it.x, cy: it.y - 4 * s, r: 28 * s };
    case "duck":        return { cx: it.x, cy: it.y - 7 * s, r: 16 * s };
    case "kite":        return { cx: it.x, cy: it.y - 40 * s, r: 40 * s };
    case "icecream":    return { cx: it.x, cy: it.y - 34 * s, r: 34 * s };
    case "hotdog":      return { cx: it.x, cy: it.y - 34 * s, r: 34 * s };
    case "ballooncart": return { cx: it.x, cy: it.y - 40 * s, r: 40 * s };
    case "lilypad":     return { cx: it.x, cy: it.y, r: 20 };
    case "fountain":    return { cx: it.x, cy: it.y - 14 * s, r: 32 * s };
    case "swing":       return { cx: it.x, cy: it.y - 18 * s, r: 32 * s };
    case "slide":       return { cx: it.x, cy: it.y - 20 * s, r: 30 * s };
    case "stall":       return { cx: it.x, cy: it.y - 26 * s, r: 40 * s };
    case "lamp":        return { cx: it.x, cy: it.y - 44 * s, r: 20 * s };
    case "signpost":    return { cx: it.x, cy: it.y - 28 * s, r: 24 * s };
    case "museum":      return { cx: it.x, cy: it.y - 26 * s, r: 46 * s };
    case "cafe":        return { cx: it.x, cy: it.y - 22 * s, r: 34 * s };
    case "shop":        return { cx: it.x, cy: it.y - 18 * s, r: 32 * s };
    case "toilets":     return { cx: it.x, cy: it.y - 16 * s, r: 26 * s };
    case "gazebo":      return { cx: it.x, cy: it.y - 26 * s, r: 36 * s };
    case "statue":      return { cx: it.x, cy: it.y - 14 * s, r: 22 * s };
    case "seesaw":      return { cx: it.x, cy: it.y - 12 * s, r: 32 * s };
    case "sandpit":     return { cx: it.x, cy: it.y - 6 * s, r: 30 * s };
    case "roundabout":  return { cx: it.x, cy: it.y - 8 * s, r: 30 * s };
    case "swan":        return { cx: it.x, cy: it.y - 14 * s, r: 20 * s };
    case "sheep":       return { cx: it.x, cy: it.y - 8 * s, r: 18 * s };
    case "train":       return { cx: it.x - 10 * s, cy: it.y - 28 * s, r: 64 * s };
    case "hill":        return { cx: it.x, cy: it.y - 18 * s, r: 64 * s };
    case "mountain":    return { cx: it.x - 10 * s, cy: it.y - 44 * s, r: 80 * s };
    case "windmill":    return { cx: it.x, cy: it.y - 30 * s, r: 34 * s };
    case "tent":        return { cx: it.x - 4 * s, cy: it.y - 20 * s, r: 40 * s };
    case "campfire":    return { cx: it.x, cy: it.y - 16 * s, r: 24 * s };
    case "bridge":      return { cx: it.x, cy: it.y, r: ((it.len || 96) / 2 + 12) };
    default:            return { cx: it.x, cy: it.y, r: (it.r || 22) + 4 };
  }
}

/* ---------- inspector ---------- */
function Inspector({ sel, el, onChange, onDelete, onReorder }) {
  const colorOpts = sel.type === "item" ? COLOR_KINDS[el.kind] : null;
  const stripey = STRIPE_KINDS.has(el.kind);
  const colorVal = stripey ? el.stripe : el.color;
  const setColor = (v) => onChange(stripey ? { stripe: v } : { color: v });
  const [pos, setPos] = useState(null);              // {x,y} drag offset from default corner
  const dragRef = useRef(null);
  const onGrab = (e) => {
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos ? pos.x : 0, oy: pos ? pos.y : 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
  };
  const onDrop = () => { dragRef.current = null; };
  const style = pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined;
  return (
    <div className="maped__inspector" style={style}>
      <div className="maped__insphead" onPointerDown={onGrab} onPointerMove={onMove} onPointerUp={onDrop}>
        <Icon name="navigation" size={13} stroke={2.2} className="maped__inspgrip" />
        <span className="maped__inspname">{labelFor(sel, el)}</span>
      </div>
      <div className="maped__inspbody">
        <button className="maped__randomize" onClick={() => onChange(randomPatch(el, sel.type))}>
          <Icon name="sparkles" size={14} stroke={2.2} /> Randomise
        </button>
        {el.kind === "label" && (
          <label className="maped__field">Text
            <input value={el.text} onChange={(e) => onChange({ text: e.target.value })} />
          </label>
        )}
        {(el.kind === "tree" || el.kind === "rock") && (
          <Slider label="Size" min={10} max={60} value={el.r} onChange={(v) => onChange({ r: v })} />
        )}
        {el.kind === "bush" && (
          <>
            <Slider label="Amount" min={1} max={9} value={el.count || 3} onChange={(v) => onChange({ count: v })} />
            <button className="maped__reshuffle" onClick={() => onChange({ seed: Math.floor(Math.random() * 1e6) })}>
              <Icon name="sparkles" size={14} stroke={2.2} /> Reshuffle
            </button>
          </>
        )}
        {el.kind === "house" && (
          <>
            <Slider label="Width" min={36} max={110} value={el.w} onChange={(v) => onChange({ w: v })} />
            <Swatches label="Roof" value={el.roof} options={ROOF_COLORS} onChange={(v) => onChange({ roof: v })} />
          </>
        )}
        {el.kind === "bench" && (
          <Slider label="Angle" min={-90} max={90} value={el.rot || 0} onChange={(v) => onChange({ rot: v })} />
        )}
        {el.kind === "bridge" && (
          <>
            <Slider label="Length" min={40} max={220} value={el.len || 96} onChange={(v) => onChange({ len: v })} />
            <Slider label="Angle" min={-90} max={90} value={el.rot || 0} onChange={(v) => onChange({ rot: v })} />
            <Seg label="Style" value={el.style || "wood"} options={["wood", "stone"]} onChange={(v) => onChange({ style: v })} />
          </>
        )}
        {colorOpts && (
          <Swatches label="Colour" value={colorVal} options={colorOpts} onChange={setColor} />
        )}
        {FLIP_KINDS.has(el.kind) && (
          <Seg label="Facing" value={el.flip ? "right" : "left"} options={["left", "right"]} onChange={(v) => onChange({ flip: v === "right" })} />
        )}
        {SCALE_KINDS.has(el.kind) && (
          <Slider label="Size" min={50} max={220} value={Math.round((el.s || 1) * 100)} onChange={(v) => onChange({ s: +(v / 100).toFixed(2) })} />
        )}
        {el.kind === "label" && (
          <Slider label="Text size" min={16} max={56} value={el.size} onChange={(v) => onChange({ size: v })} />
        )}
        {(sel.type === "path") && (
          <Slider label="Width" min={14} max={80} value={el.w} onChange={(v) => onChange({ w: v })} />
        )}

        {/* universal */}
        <Slider label="Opacity" min={10} max={100} value={Math.round((el.o == null ? 1 : el.o) * 100)} onChange={(v) => onChange({ o: +(v / 100).toFixed(2) })} />
        <div className="maped__field">Layer
          <div className="maped__order">
            <button onClick={() => onReorder("back")}>Send back</button>
            <button onClick={() => onReorder("front")}>Bring front</button>
          </div>
        </div>
      </div>
      <button className="maped__del" onClick={onDelete}>Delete element</button>
    </div>
  );
}
function labelFor(sel, el) {
  if (sel.type === "path") return el.kind === "river" ? "River" : el.kind === "traffic" ? "Traffic road" : el.kind === "dirt" ? "Dirt track" : "Path";
  if (sel.type === "area") return "Water";
  const names = { tree: "Tree", bush: "Bush", rock: "Rock", flower: "Flower", house: "House",
    bench: "Bench", label: "Label", family: "Family", kid: "Child", dog: "Dog", balloon: "Balloons",
    ferriswheel: "Big wheel", car: "Car", tractor: "Tractor", picnic: "Picnic", duck: "Duck", kite: "Kite",
    icecream: "Ice cream cart", hotdog: "Hot dog cart", ballooncart: "Balloon cart",
    lilypad: "Lily pads", fountain: "Fountain", swing: "Swings", slide: "Slide", stall: "Market stall",
    lamp: "Lamp post", signpost: "Signpost", bridge: "Bridge",
    museum: "Museum", cafe: "Caf\u00e9", shop: "Shop", toilets: "Toilets", gazebo: "Bandstand",
    statue: "Statue", seesaw: "Seesaw", sandpit: "Sandpit", roundabout: "Roundabout", swan: "Swan", sheep: "Sheep",
    train: "Chu-chu train", hill: "Hill", mountain: "Mountain", windmill: "Windmill", tent: "Tent", campfire: "Campfire" };
  return names[el.kind] || "Element";
}
function Slider({ label, min, max, value, onChange }) {
  return (
    <label className="maped__field">{label}
      <span className="maped__sliderrow">
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} />
        <b>{value}</b>
      </span>
    </label>
  );
}
function Seg({ label, value, options, onChange }) {
  return (
    <div className="maped__field">{label}
      <div className="maped__seg">
        {options.map((o) => (
          <button key={o} className={value === o ? "is-on" : ""} onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}
function Swatches({ label, value, options, onChange }) {
  return (
    <div className="maped__field">{label}
      <div className="maped__swatches">
        {options.map((o) => (
          <button key={o} className={"maped__sw" + (value === o ? " is-on" : "")}
                  style={{ background: o }} onClick={() => onChange(o)} />
        ))}
      </div>
    </div>
  );
}

window.LDA_EDITOR = { MapEditor };
