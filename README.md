<img width="1920" height="1080" alt="Screenshot 2026-05-31 at 22 46 14 (2)" src="https://github.com/user-attachments/assets/6cc9ef0f-dc2b-4256-bbe6-c5c45a6a0259" />

# Little Days Out — the Map Builder

A playful, hand-drawn map maker built into the *Little Days Out* hero. Rather than
embedding a real-world map (Google / Leaflet), it renders an illustrated storybook
park **entirely in SVG** — grass, lakes, winding paths, trees, a fairground, a
chu-chu train — with your activity pins dropped on top. Users can let it
auto-generate a whole scene, or hand-build one piece by piece in a full-screen
editor.

*Little Days Out* itself is a concept for a friendly "what shall we do with the kids
today?" listings app. The map is its hero: planning a day out should feel like
drawing your own adventure, not reading a directory.

---

## Two ways in

- **"New map"** — one click procedurally generates a complete, coherent park from
  scratch.
- **"Edit map"** — opens the full-screen builder to place, draw, reshape, recolour
  and arrange everything by hand.

There's also a **Grown-ups / Kids** toggle in the hero: Kids mode adds a mascot
guide ("Pip the spark"), a *Surprise me* button, a collectible "adventure passport"
and confetti.

---

## How to run it

The app is plain React 18 + Babel-standalone loaded from a CDN — **no build step**.
The `.jsx` files are transpiled in the browser, so they're fetched at runtime and
the page must be served over HTTP (opening `file://` directly will fail on CORS
when Babel tries to fetch the scripts).

From the project root:

```bash
# any static server works — pick one
python3 -m http.server 8000
# or:  npx serve .
```

Then open:

```
http://localhost:8000/Little%20Days%20Out.html
```

- **`Little Days Out.html`** — the current, full app (hero + map builder + kids mode).
- **`Little Days Out v1.html`** — an earlier, simpler iteration (hero + sections only,
  no map builder). Kept for reference.

> An internet connection is needed the first time, to pull React and Babel from
> `unpkg`. Everything else is local.

### Things to try

1. Hit **New map** a few times — every click rolls a fresh, fully-formed park.
2. Pan and zoom the map; click a pin to centre on it and open its detail card.
3. Open **Edit map** and stamp some trees, draw a river, drag a pin, recolour a
   house, then hit **Done**.
4. Switch to **Kids** mode and press **Surprise me**.
5. Open the **Tweaks** panel (bottom-right, in the editing runtime) to recolour the
   brand, swap hero copy and toggle sections live.

Your map is saved to `localStorage`, so it survives a reload. **Reset** restores the
original hand-authored layout; **Clear all** gives you a blank canvas.

---

## The procedural generator (`generateLayout`)

This is the clever bit. It's a **seeded** random generator — the same seed always
produces the same map — that builds a believable park in a deliberate order, with
collision rules so nothing overlaps awkwardly:

1. A **lake** in a random corner, drawn as an irregular 9-point blob.
2. One **winding river** running edge-to-edge (vertical or horizontal).
3. **2–3 roads** crossing the map (tarmac or dirt track).
4. **Placement guards** — every subsequent object is tested against `inWater`,
   `onRoad` and `onGrass`, so trees don't land in the lake and benches don't sit on
   the road.
5. **Terrain** — a mountain range across the back, hills scattered in front.
6. A **forest** — 7–11 clusters of trees plus bushes and rocks.
7. **Flower patches, houses, a playground cluster** (swings / slide / seesaw /
   sandpit) and a **small fair** (big wheel + stall + ice-cream + balloons).
8. **Life** — families with dogs, a child, a picnic; a train riding one of the
   roads; a car or tractor on another.
9. A **windmill and a campsite** (tent + campfire).
10. **Water life** — ducks, lily pads, the occasional swan, all constrained to
    inside the lake.
11. **Place-name labels** drawn from a name pool.

The result is saved to `localStorage` and is fully undoable, so you can keep hitting
**New map** to roll fresh parks freely. Where roads cross water, **bridges are
computed automatically** (`computeBridges`) and stroked along the road's own curve,
so the road never appears to float on the river.

---

## The hand editor (`MapEditor`)

A full-screen, dark-chrome workspace overlaid on the page, with three regions:

- **Tool palette (left)** — quick tools (Select, Move pins) plus drill-down
  categories: *Draw* (paths, traffic roads, dirt tracks, rivers, water), *Nature*,
  *People*, *Play*, *Vehicles*, *Carts*, *Buildings*, *Build*, and *Terrain & camp* —
  roughly **60 stampable element types**.
- **Canvas** — click empty grass to stamp; click-to-lay multi-point paths and lakes
  that auto-smooth; drag to move; drag the dotted vertices to reshape; "+" ghost
  handles to add points; double-click to delete a point.
- **Inspector (right, draggable)** — context-aware controls per element: size, width,
  angle, opacity, colour swatches, facing (flip), text, plus layer ordering (send
  back / bring front) and a per-element **Randomise**.

**Supporting touches:** snap-to-grid, a toggleable grid overlay, a *Random* mode that
jitters each new element as you place it, and full keyboard shortcuts.

| Key | Action |
| --- | --- |
| `⌘Z` / `Ctrl+Z` | Undo |
| `Enter` | Finish the current shape |
| `Esc` | Cancel shape / deselect / close editor |
| `Delete` / `Backspace` | Remove the selected element |
| `V` | Select tool |

---

## Architecture & file map

No framework, no bundler — each file attaches its exports to a `window.LDA_*`
namespace, and the HTML loads them in dependency order via `<script type="text/babel">`.

| File | Role |
| --- | --- |
| `Little Days Out.html` | Entry point — loads React/Babel and every module below |
| `assets/lda.css` | All styling |
| `icons.jsx` | Lucide-style line-icon set (`window.Icon`, `iconFor`) |
| `data.jsx` | Content: categories, activity pins, steps, testimonials (`LDA_DATA`) |
| `maplayout.jsx` | Map data model, default layout, the procedural generator, persistence (`LDA_MAP`) |
| `mapscene.jsx` | Pure, data-driven SVG renderer for a layout (`LDA_SCENE`) |
| `mapeditor.jsx` | The in-place map builder (`LDA_EDITOR`) |
| `hero.jsx` | Pins, zoom control, activity detail card (`LDA_HERO`) |
| `kids.jsx` | Kids mode: mode toggle, mascot, surprise button, passport, confetti (`LDA_KIDS`) |
| `sections.jsx` | Nav, logo and the below-the-fold marketing sections (`LDA_SECTIONS`) |
| `app.jsx` | Composition: hero pan/zoom, mode switching, the App shell, Tweaks wiring |
| `tweaks-panel.jsx` | Reusable live-tweak panel + form controls (shared scaffolding) |
| `image-slot.js` | `<image-slot>` custom element — user-fillable image placeholder (shared scaffolding) |

### Coordinate system

Everything in a layout lives in SVG user space, **0–1600 (x) by 0–1000 (y)**.
Activity pins are the exception: they keep their own `x`/`y` as **percentages** of
the stage (authored in `data.jsx`); the editor writes any moved pin into
`layout.pins` as `{ [actId]: { x, y } }` in that same percent space.

### Persistence

- The **map layout** is stored in `localStorage` under `lda_map_layout_v3`.
- The `<image-slot>` element persists dropped images to a `.image-slots.state.json`
  sidecar via the host "omelette" bridge. Outside that runtime (e.g. a plain static
  server) image slots are **read-only** — the map editor and everything else still
  work fully.

---

## How it fits the brand

The whole thing leans into the warm, friendly *Little Days Out* palette — coral
primary, leaf-green generate button, paper-cream surfaces — and the picture-book
aesthetic makes "planning a day out" feel like drawing your own adventure rather
than reading a listings site.

---

## Naming

Working title for the feature is **Map Maker**, with **"Build my day out"** on the
button. Not yet finalised.
