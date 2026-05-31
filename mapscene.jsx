// mapscene.jsx — pure, data-driven renderer for the map layout.
// Renders areas (water), paths (roads/rivers) and items (trees, houses, benches,
// bushes, rocks, flowers, labels) from a layout object into one SVG. No editing here.

/* ---- Catmull-Rom → smooth bezier path (storybook curves) ---- */
function smoothPath(pts, closed) {
  if (!pts || pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
  const n = pts.length;
  const at = (i) => closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const end = closed ? n : n - 1;
  for (let i = 0; i < end; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  if (closed) d += " Z";
  return d;
}

/* ---- sample a smooth path into points (same curve maths as smoothPath) ---- */
function _bezPt(p1, c1, c2, p2, t) {
  const mt = 1 - t, a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
  return [a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]];
}
function smoothSamples(pts, closed, per) {
  if (!pts || pts.length < 2) return [];
  per = per || 10;
  if (pts.length === 2) {
    const out = [];
    for (let s = 0; s <= per; s++) { const t = s / per; out.push([pts[0][0] + (pts[1][0] - pts[0][0]) * t, pts[0][1] + (pts[1][1] - pts[0][1]) * t]); }
    return out;
  }
  const n = pts.length;
  const at = (i) => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const out = [];
  const end = closed ? n : n - 1;
  for (let i = 0; i < end; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let s = 0; s < per; s++) out.push(_bezPt(p1, c1, c2, p2, s / per));
  }
  if (!closed) out.push(at(end));
  return out;
}
/* segment ↔ segment intersection (null if none) */
function _segInt(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * rx, a[1] + t * ry];
}
/* point in polygon (ray cast) */
function _pip(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi + 1e-12) + xi)) inside = !inside;
  }
  return inside;
}
/* distance from point p to segment a–b */
function _distSeg(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const wx = p[0] - a[0], wy = p[1] - a[1];
  const len2 = vx * vx + vy * vy || 1e-9;
  let t = (wx * vx + wy * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = p[0] - (a[0] + t * vx), dy = p[1] - (a[1] + t * vy);
  return Math.hypot(dx, dy);
}
function _polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

/* Where do roads cross water? For every run of a road that passes over a river
   or a lake, we return the slice of the ROAD CENTRELINE spanning that run
   (with a little margin onto each bank). The bridge is then stroked along that
   exact curve at the road's width, so it follows the road and merges at the
   banks instead of floating as a straight plank. Skips runs that already have a
   hand-placed bridge nearby so manual bridges win. */
function computeBridges(layout) {
  const paths = layout.paths || [];
  const roads = paths.filter((p) => p.kind !== "river");
  const rivers = paths.filter((p) => p.kind === "river");
  const waters = (layout.areas || []).filter((a) => a.kind === "water");
  const manual = (layout.items || []).filter((i) => i.kind === "bridge");
  const out = [];

  // NOTE: (VR) pre-sample every obstacle once, then reuse for all road tests
  const riverLines = rivers.map((rv) => ({ S: smoothSamples(rv.pts, false, 14), half: (rv.w || 40) / 2 + 3 }));
  const waterPolys = waters.map((wa) => smoothSamples(wa.pts, true, 16));
  const overWater = (pt) => {
    for (const poly of waterPolys) if (_pip(pt, poly)) return true;
    for (const r of riverLines) {
      for (let i = 0; i < r.S.length - 1; i++) if (_distSeg(pt, r.S[i], r.S[i + 1]) < r.half) return true;
    }
    return false;
  };

  roads.forEach((road) => {
    const R = smoothSamples(road.pts, false, 16);
    if (R.length < 2) return;
    const flags = R.map(overWater);
    let i = 0;
    while (i < R.length) {
      if (!flags[i]) { i++; continue; }
      let j = i;
      while (j + 1 < R.length && flags[j + 1]) j++;
      // NOTE: (VR) pad one sample onto each bank so the deck lands on solid ground, not mid-water
      const a = Math.max(0, i - 1), b = Math.min(R.length - 1, j + 1);
      const span = R.slice(a, b + 1);
      const mid = span[Math.floor(span.length / 2)];
      const near = manual.some((m) => Math.hypot(m.x - mid[0], m.y - mid[1]) < 50);
      if (_polyLen(span) > 16 && !near) {
        out.push({ id: road.id + "~" + i, pts: span, core: R.slice(i, j + 1), w: road.w || 40, style: "wood" });
      }
      i = j + 1;
    }
  });
  return out;
}

/* ---- tiny seeded RNG for natural scatter ---- */
function seeded(seed) {
  let s = (seed | 0) || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function _hx(h) { const m = (h || "#000").replace("#", ""); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; }
function lighten(h, a) { const [r, g, b] = _hx(h); const f = (c) => Math.round(c + (255 - c) * a); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function darken(h, a) { const [r, g, b] = _hx(h); const f = (c) => Math.round(c * (1 - a)); return `rgb(${f(r)},${f(g)},${f(b)})`; }

/* ---------- item renderers ---------- */
function SceneTree({ x, y, r, variant, color }) {
  const main = color || (variant === "dark" ? "#5BA158" : "#74BA6B");
  const hi = lighten(main, 0.22);
  const tw = r * 0.17;                 // trunk half-width
  const top = y + r * 0.34;            // trunk start (tucked under canopy)
  const bot = y + r * 1.46;            // trunk base
  const flare = r * 0.22;              // where roots begin to splay
  const root = tw * 2.7;               // root spread
  const trunk = `M ${x - tw} ${top}
    L ${x - tw} ${bot - flare}
    C ${x - tw} ${bot}, ${x - root * 0.7} ${bot - 1}, ${x - root} ${bot + r * 0.02}
    L ${x + root} ${bot + r * 0.02}
    C ${x + root * 0.7} ${bot - 1}, ${x + tw} ${bot}, ${x + tw} ${bot - flare}
    L ${x + tw} ${top} Z`;
  return (
    <g>
      <ellipse cx={x} cy={bot + r * 0.04} rx={r * 0.95} ry={r * 0.26} fill="rgba(40,70,30,0.2)" />
      <path d={trunk} fill="#9A6B43" />
      <path d={`M ${x - tw * 0.45} ${top} L ${x - tw * 0.45} ${bot - flare * 0.5} L ${x + tw * 0.15} ${bot - flare * 0.5} L ${x + tw * 0.15} ${top} Z`}
            fill="#B0815A" opacity="0.55" />
      <circle cx={x} cy={y} r={r} fill={main} />
      <circle cx={x - r * 0.3} cy={y - r * 0.34} r={r * 0.5} fill={hi} opacity="0.9" />
      <circle cx={x + r * 0.36} cy={y + r * 0.12} r={r * 0.34} fill={hi} opacity="0.45" />
    </g>
  );
}
function SceneBush({ x, y, count, seed, r, color }) {
  const n = Math.max(1, count || 3);
  const base = r || 16;
  const top = color || "#7EC177";
  const side = darken(top, 0.1);
  const hi = lighten(top, 0.2);
  const rng = seeded((seed || 1) * 13 + n * 7);
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const bx = (i - (n - 1) / 2) * base * 0.92 + (rng() - 0.5) * base * 0.6;
    const by = (rng() - 0.5) * base * 0.55;
    const br = base * (0.72 + rng() * 0.5);
    blobs.push([bx, by, br]);
  }
  blobs.sort((a, b) => a[1] - b[1]);
  const span = (n * base * 0.92) / 2 + base;
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy={base * 0.55} rx={span} ry={base * 0.32} fill="rgba(40,70,30,0.16)" />
      {blobs.map(([bx, by, br], i) => (
        <g key={i}>
          <circle cx={bx - br * 0.55} cy={by} r={br * 0.7} fill={side} />
          <circle cx={bx + br * 0.55} cy={by} r={br * 0.7} fill={side} />
          <circle cx={bx} cy={by - br * 0.3} r={br * 0.85} fill={top} />
          <circle cx={bx - br * 0.2} cy={by - br * 0.4} r={br * 0.4} fill={hi} opacity="0.85" />
        </g>
      ))}
    </g>
  );
}
function SceneRock({ x, y, r }) {
  return (
    <g>
      <ellipse cx={x} cy={y + r * 0.5} rx={r * 1.1} ry={r * 0.28} fill="rgba(40,70,30,0.14)" />
      <path d={`M ${x - r} ${y + r * 0.5} Q ${x - r * 1.05} ${y - r * 0.3} ${x - r * 0.3} ${y - r * 0.65}
                Q ${x + r * 0.5} ${y - r} ${x + r} ${y - r * 0.1} Q ${x + r * 1.1} ${y + r * 0.45} ${x + r * 0.5} ${y + r * 0.5} Z`}
            fill="#B7B0A6" />
      <path d={`M ${x - r * 0.3} ${y - r * 0.65} Q ${x + r * 0.5} ${y - r} ${x + r} ${y - r * 0.1}
                L ${x + r * 0.45} ${y - r * 0.05} Z`} fill="#CFC9C0" opacity="0.7" />
    </g>
  );
}
function SceneFlower({ x, y, color }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos(a * Math.PI / 180) * 5} cy={Math.sin(a * Math.PI / 180) * 5} r="3.4" fill={color} />
      ))}
      <circle cx="0" cy="0" r="2.6" fill="#FFF3E0" />
    </g>
  );
}
function SceneHouse({ x, y, w, roof }) {
  const bh = w * 0.66, rh = w * 0.5;
  return (
    <g>
      <ellipse cx={x} cy={y + bh + 4} rx={w * 0.62} ry={w * 0.16} fill="rgba(40,70,30,0.16)" />
      <rect x={x - w / 2} y={y} width={w} height={bh} rx="6" fill="#F6EAD0" stroke="#E4D2AC" strokeWidth="2" />
      <rect x={x - w * 0.16} y={y + bh * 0.4} width={w * 0.32} height={bh * 0.6} rx="3" fill="#D9A06A" />
      <path d={`M ${x - w / 2 - 7} ${y + 5} L ${x} ${y - rh} L ${x + w / 2 + 7} ${y + 5} Z`} fill={roof} />
      <path d={`M ${x - w / 2 - 7} ${y + 5} L ${x} ${y - rh} L ${x + w / 2 + 7} ${y + 5}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
    </g>
  );
}
function SceneBench({ x, y, rot }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot || 0})`}>
      <ellipse cx="0" cy="9" rx="22" ry="5" fill="rgba(40,70,30,0.16)" />
      <rect x="-20" y="-9" width="40" height="7" rx="3" fill="#C99A63" />
      <rect x="-20" y="0" width="40" height="6" rx="3" fill="#B98A53" />
      <rect x="-17" y="5" width="4" height="8" rx="1.5" fill="#9A7038" />
      <rect x="13" y="5" width="4" height="8" rx="1.5" fill="#9A7038" />
    </g>
  );
}
function SceneLabel({ x, y, text, size, color }) {
  return (
    <text x={x} y={y} className="map-label" textAnchor="middle"
          style={{ fontSize: (size || 26) + "px", fill: color || undefined }}>{text}</text>
  );
}

/* ---- origin-anchored props (feet/base at 0,0; drawn upward) ---- */
function Figure({ h, clothes, skin = "#F3C9A2", hair = "#5A3A26" }) {
  const headR = h * 0.16, headCy = -h + headR, neck = headCy + headR;
  const hip = -h * 0.34, bw = h * 0.19, lw = h * 0.085;
  return (
    <g>
      <ellipse cx="0" cy="1" rx={bw * 1.15} ry={h * 0.05} fill="rgba(40,70,30,0.16)" />
      <line x1={-bw * 0.45} y1={hip} x2={-bw * 0.45} y2={-1} stroke="#3C3A46" strokeWidth={lw} strokeLinecap="round" />
      <line x1={bw * 0.45} y1={hip} x2={bw * 0.45} y2={-1} stroke="#3C3A46" strokeWidth={lw} strokeLinecap="round" />
      <line x1={-bw * 0.8} y1={neck + h * 0.05} x2={-bw * 1.25} y2={hip + h * 0.06} stroke={clothes} strokeWidth={lw} strokeLinecap="round" />
      <line x1={bw * 0.8} y1={neck + h * 0.05} x2={bw * 1.25} y2={hip + h * 0.06} stroke={clothes} strokeWidth={lw} strokeLinecap="round" />
      <path d={`M ${-bw} ${hip} Q ${-bw} ${neck} 0 ${neck} Q ${bw} ${neck} ${bw} ${hip} Z`} fill={clothes} />
      <circle cx="0" cy={headCy} r={headR} fill={skin} />
      <path d={`M ${-headR} ${headCy - headR * 0.1} Q ${-headR} ${headCy - headR * 1.45} 0 ${headCy - headR * 1.3}
                Q ${headR} ${headCy - headR * 1.45} ${headR} ${headCy - headR * 0.1}
                Q ${headR * 0.5} ${headCy - headR * 0.8} 0 ${headCy - headR * 0.78}
                Q ${-headR * 0.5} ${headCy - headR * 0.8} ${-headR} ${headCy - headR * 0.1} Z`} fill={hair} />
    </g>
  );
}
function SceneFamily() {
  return (
    <g>
      <g transform="translate(-9 0)"><Figure h={40} clothes="#2C97E0" hair="#3A2A1E" /></g>
      <g transform="translate(11 0)"><Figure h={25} clothes="#FF5CA0" hair="#5A3A26" /></g>
    </g>
  );
}
function SceneKid() { return <Figure h={27} clothes="#FF6A45" hair="#5A3A26" />; }
function SceneDog({ color }) {
  color = color || "#C98A4B";
  return (
    <g>
      <ellipse cx="-1" cy="0" rx="16" ry="4" fill="rgba(40,70,30,0.16)" />
      <rect x="-9" y="-9" width="3.6" height="9" rx="1.8" fill={color} />
      <rect x="6" y="-9" width="3.6" height="9" rx="1.8" fill={color} />
      <path d="M11 -14 Q18 -18 16 -25" stroke={color} strokeWidth="3.6" fill="none" strokeLinecap="round" />
      <ellipse cx="-1" cy="-12" rx="13" ry="7" fill={color} />
      <circle cx="-12" cy="-16" r="6.6" fill={color} />
      <path d="M-15 -21 Q-20 -17 -16.5 -12 Z" fill="rgba(0,0,0,0.18)" />
      <ellipse cx="-17" cy="-13.5" rx="3.6" ry="2.7" fill="#EAC99F" />
      <circle cx="-19" cy="-14.6" r="1.2" fill="#2E2A2E" />
      <circle cx="-11" cy="-17" r="1" fill="#2E2A2E" />
    </g>
  );
}
function SceneBalloon() {
  const B = [[-9, -46, "#FF5CA0"], [9, -52, "#FFB72E"], [-1, -61, "#2C97E0"]];
  return (
    <g>
      {B.map(([bx, by], i) => (
        <path key={"s" + i} d={`M0 0 Q ${bx * 0.4} ${by * 0.5} ${bx} ${by + 10}`} stroke="rgba(80,70,60,0.45)" strokeWidth="1" fill="none" />
      ))}
      {B.map(([bx, by, c], i) => (
        <g key={"b" + i}>
          <ellipse cx={bx} cy={by} rx="9" ry="11" fill={c} />
          <ellipse cx={bx - 3} cy={by - 3} rx="2.4" ry="3.4" fill="rgba(255,255,255,0.5)" />
          <path d={`M${bx - 2} ${by + 10} L${bx + 2} ${by + 10} L${bx} ${by + 13} Z`} fill={c} />
        </g>
      ))}
    </g>
  );
}
function SceneFerris() {
  const R = 44, hubY = -(R + 18), n = 8;
  const cols = ["#FF6A45", "#2C97E0", "#FFB72E", "#FF5CA0", "#8A5BF0", "#2FB16B", "#14BEBE", "#FF6A45"];
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; pts.push([Math.cos(a) * R, hubY + Math.sin(a) * R]); }
  return (
    <g>
      <ellipse cx="0" cy="1" rx="30" ry="5" fill="rgba(40,70,30,0.18)" />
      <line x1="-20" y1="0" x2="0" y2={hubY} stroke="#7A8089" strokeWidth="4" strokeLinecap="round" />
      <line x1="20" y1="0" x2="0" y2={hubY} stroke="#7A8089" strokeWidth="4" strokeLinecap="round" />
      <line x1="-20" y1="0" x2="20" y2="0" stroke="#7A8089" strokeWidth="4" strokeLinecap="round" />
      {pts.map((p, i) => <line key={i} x1="0" y1={hubY} x2={p[0]} y2={p[1]} stroke="#C9CDD3" strokeWidth="2" />)}
      <circle cx="0" cy={hubY} r={R} fill="none" stroke="#E27A45" strokeWidth="4" />
      <circle cx="0" cy={hubY} r={R * 0.62} fill="none" stroke="#C9CDD3" strokeWidth="2" />
      {pts.map((p, i) => (
        <g key={"g" + i}>
          <line x1={p[0]} y1={p[1]} x2={p[0]} y2={p[1] + 5} stroke="#9AA0A8" strokeWidth="1.5" />
          <path d={`M ${p[0] - 5} ${p[1] + 5} h10 v5 q0 4 -5 4 q-5 0 -5 -4 Z`} fill={cols[i]} />
        </g>
      ))}
      <circle cx="0" cy={hubY} r="5" fill="#5A6069" />
    </g>
  );
}
function SceneCar({ color }) {
  color = color || "#FF6A45";
  return (
    <g>
      <ellipse cx="0" cy="2" rx="28" ry="5" fill="rgba(40,70,30,0.18)" />
      <path d="M-26 -4 Q-26 -12 -16 -12 L-12 -12 Q-8 -22 2 -22 L8 -22 Q18 -22 20 -12 L22 -12 Q27 -12 27 -5 L27 -1 Q27 1 24 1 L-23 1 Q-26 1 -26 -2 Z" fill={color} />
      <path d="M-9 -13 Q-6 -20 2 -20 L7 -20 Q14 -20 16 -13 Z" fill="#CDEBF7" />
      <path d="M2 -19 L2 -13 L6 -13 L6 -19 Z" fill="rgba(255,255,255,0.45)" />
      <circle cx="-14" cy="0" r="7.5" fill="#2E2A2E" />
      <circle cx="14" cy="0" r="7.5" fill="#2E2A2E" />
      <circle cx="-14" cy="0" r="3.2" fill="#D9D4CF" />
      <circle cx="14" cy="0" r="3.2" fill="#D9D4CF" />
      <rect x="24" y="-9" width="3.5" height="3.5" rx="1.5" fill="#FFE08A" />
    </g>
  );
}
function SceneTractor({ color }) {
  color = color || "#2FB16B";
  return (
    <g>
      <ellipse cx="0" cy="3" rx="30" ry="5" fill="rgba(40,70,30,0.18)" />
      <path d="M-24 -8 L-7 -8 L-3 -21 L6 -21 L6 -8 L24 -8 L24 -1 L-24 -1 Z" fill={color} />
      <rect x="-2" y="-27" width="11" height="8" rx="2" fill={color} />
      <rect x="-20" y="-23" width="3" height="15" rx="1.5" fill="#555B61" />
      <circle cx="13" cy="-2" r="16" fill="#2E2A2E" />
      <circle cx="13" cy="-2" r="6.5" fill="#E8B23A" />
      <circle cx="-16" cy="2" r="9" fill="#2E2A2E" />
      <circle cx="-16" cy="2" r="3.4" fill="#D9D4CF" />
    </g>
  );
}
function ScenePicnic() {
  return (
    <g>
      <ellipse cx="0" cy="3" rx="26" ry="6" fill="rgba(40,70,30,0.14)" />
      <path d="M-22 1 L-8 -10 L26 -2 L12 9 Z" fill="#E8617A" />
      <line x1="-15" y1="-4.5" x2="19" y2="3.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <line x1="-15" y1="4.5" x2="1" y2="-8.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <line x1="-2" y1="7" x2="18" y2="-5.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M2 -6 q6 -3 12 0 l-1.5 8 q-4.5 2 -9 0 Z" fill="#B5793D" />
      <path d="M2 -6 q6 -3 12 0" fill="none" stroke="#8A5A2A" strokeWidth="2" />
      <path d="M4 -6.5 q4 -7 8 0" fill="none" stroke="#8A5A2A" strokeWidth="1.5" />
    </g>
  );
}
function SceneDuck() {
  // NOTE: (VR) faces left and floats — light ripple stands in for the ground shadow
  return (
    <g>
      <ellipse cx="0" cy="1" rx="13" ry="3" fill="rgba(255,255,255,0.4)" />
      <path d="M0 1 a13 4 0 0 0 12 -1" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <ellipse cx="0" cy="-5" rx="11" ry="7" fill="#F4D63E" />
      <path d="M8 -8 Q15 -11 12.5 -4 Z" fill="#F0C92F" />
      <ellipse cx="-1" cy="-6" rx="7" ry="4.5" fill="#E6C636" opacity="0.7" />
      <circle cx="-9" cy="-12" r="5.4" fill="#F4D63E" />
      <path d="M-13.5 -12.5 q-5 -0.5 -5.5 1.5 q0.5 2 5.5 1.4 Z" fill="#F2952F" />
      <circle cx="-10" cy="-13.2" r="1.2" fill="#2E2A2E" />
    </g>
  );
}
function SceneKite() {
  const kx = 7, ky = -56;
  return (
    <g>
      <path d={`M0 0 Q ${kx * 0.3} ${ky * 0.5} ${kx} ${ky + 15}`} stroke="rgba(80,70,60,0.5)" strokeWidth="1" fill="none" />
      <g transform={`translate(${kx} ${ky})`}>
        <path d="M0 -15 L11 0 L0 15 L-11 0 Z" fill="#FF6A45" />
        <path d="M0 -15 L11 0 L0 0 Z" fill="#FFB72E" />
        <path d="M0 0 L11 0 L0 15 Z" fill="#E8557E" />
        <path d="M0 -15 L0 15 M-11 0 L11 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
        <path d="M0 -15 L11 0 L0 15 L-11 0 Z" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" />
        <path d="M0 15 q5 6 0 11 q-5 6 0 11" stroke="#2C97E0" strokeWidth="1.4" fill="none" />
        <path d="M-2 21 l4 1 -4 1Z" fill="#FFB72E" /><path d="M-2 30 l4 1 -4 1Z" fill="#FF6A45" />
      </g>
    </g>
  );
}
function CartBase({ body, stripe }) {
  const x0 = -26, sw = 52 / 8;
  return (
    <g>
      <ellipse cx="0" cy="2" rx="27" ry="5" fill="rgba(40,70,30,0.18)" />
      <circle cx="-13" cy="0" r="6.5" fill="#3A3A40" /><circle cx="13" cy="0" r="6.5" fill="#3A3A40" />
      <circle cx="-13" cy="0" r="2.6" fill="#C9C4C0" /><circle cx="13" cy="0" r="2.6" fill="#C9C4C0" />
      <rect x="-22" y="-22" width="44" height="20" rx="3" fill={body} />
      <rect x="-22" y="-22" width="44" height="5" rx="3" fill="rgba(255,255,255,0.25)" />
      <rect x="-22" y="-44" width="3" height="22" fill="#9AA0A8" /><rect x="19" y="-44" width="3" height="22" fill="#9AA0A8" />
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={"s" + i} x={x0 + i * sw} y="-50" width={sw + 0.5} height="10" fill={i % 2 ? stripe : body} />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={"c" + i} d={`M ${x0 + i * sw} -40 a ${sw / 2} ${sw / 2} 0 0 0 ${sw} 0 Z`} fill={i % 2 ? stripe : body} />
      ))}
      <rect x="-27" y="-51" width="54" height="2" rx="1" fill="rgba(0,0,0,0.08)" />
    </g>
  );
}
function SceneIceCream() {
  return (
    <g>
      <CartBase body="#FFF3E0" stripe="#FF7BAC" />
      <g transform="translate(0 -54)">
        <path d="M-5 -5 L5 -5 L0 7 Z" fill="#D9A06A" />
        <circle cx="0" cy="-7" r="6" fill="#FFE08A" />
        <circle cx="0" cy="-12" r="5" fill="#FF9ED1" />
        <circle cx="0" cy="-16" r="2.4" fill="#E8617A" />
      </g>
    </g>
  );
}
function SceneHotdog() {
  return (
    <g>
      <CartBase body="#E8617A" stripe="#FFF3E0" />
      <g transform="translate(0 -52)">
        <rect x="-13" y="-17" width="26" height="13" rx="3" fill="#FFF3E0" />
        <rect x="-13" y="-17" width="26" height="13" rx="3" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        <rect x="-9" y="-12.5" width="18" height="5.5" rx="2.7" fill="#E0A24A" />
        <rect x="-8" y="-11.5" width="16" height="3.5" rx="1.7" fill="#C0452F" />
        <path d="M-7 -10 q3 -2 6 0 q3 2 6 0" stroke="#FFD54A" strokeWidth="1.1" fill="none" />
      </g>
    </g>
  );
}
function SceneBalloonCart() {
  const B = [[-4, -60, "#FF5CA0"], [9, -66, "#FFB72E"], [-1, -74, "#2C97E0"]];
  return (
    <g>
      <CartBase body="#2C97E0" stripe="#FFF3E0" />
      {B.map(([bx, by], i) => (
        <path key={"s" + i} d={`M20 -44 Q ${bx * 0.5 + 10} ${by * 0.6} ${bx} ${by + 10}`} stroke="rgba(80,70,60,0.4)" strokeWidth="1" fill="none" />
      ))}
      {B.map(([bx, by, c], i) => (
        <g key={"b" + i}>
          <ellipse cx={bx} cy={by} rx="9" ry="11" fill={c} />
          <ellipse cx={bx - 3} cy={by - 3} rx="2.4" ry="3.4" fill="rgba(255,255,255,0.5)" />
          <path d={`M${bx - 2} ${by + 10} L${bx + 2} ${by + 10} L${bx} ${by + 13} Z`} fill={c} />
        </g>
      ))}
    </g>
  );
}
function SceneLilypad({ x, y, seed }) {
  const rng = seeded((seed || 3) * 11);
  const pads = [[0, 0, 11], [-11, 5, 8], [12, 5, 9], [2, -8, 7]];
  return (
    <g transform={`translate(${x} ${y})`}>
      {pads.slice(0, 3 + Math.round(rng())).map(([px, py, pr], i) => (
        <g key={i}>
          <ellipse cx={px} cy={py} rx={pr} ry={pr * 0.66} fill="#7BCB86" />
          <path d={`M ${px} ${py} L ${px + pr * 0.7} ${py - pr * 0.45}`} stroke="#5FAF6E" strokeWidth="1.4" />
        </g>
      ))}
      <g transform="translate(2 -2)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={Math.cos(a * Math.PI / 180) * 3} cy={Math.sin(a * Math.PI / 180) * 3} rx="2.1" ry="3.4"
                   fill="#FF9ED1" transform={`rotate(${a} ${Math.cos(a * Math.PI / 180) * 3} ${Math.sin(a * Math.PI / 180) * 3})`} />
        ))}
        <circle cx="0" cy="0" r="2" fill="#FFE08A" />
      </g>
    </g>
  );
}
function SceneFountain() {
  return (
    <g>
      <ellipse cx="0" cy="3" rx="30" ry="8" fill="rgba(40,70,30,0.16)" />
      <ellipse cx="0" cy="-4" rx="28" ry="10" fill="#6FC4DF" />
      <ellipse cx="0" cy="-6" rx="28" ry="10" fill="#A7E0F0" />
      <ellipse cx="0" cy="-6" rx="28" ry="10" fill="none" stroke="#CFC9C0" strokeWidth="3" />
      <rect x="-4" y="-26" width="8" height="20" fill="#C9C4C0" />
      <ellipse cx="0" cy="-26" rx="13" ry="4.5" fill="#D9D4CF" />
      <ellipse cx="0" cy="-27.5" rx="12" ry="4" fill="#A7E0F0" />
      <path d="M0 -29 q-9 -6 -11 4" fill="none" stroke="#BFE9F4" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M0 -29 q9 -6 11 4" fill="none" stroke="#BFE9F4" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M0 -31 v-7" fill="none" stroke="#BFE9F4" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}
function SceneSwing() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="30" ry="5" fill="rgba(40,70,30,0.16)" />
      <line x1="-22" y1="-34" x2="22" y2="-34" stroke="#B98A53" strokeWidth="4" strokeLinecap="round" />
      <line x1="-22" y1="-34" x2="-30" y2="0" stroke="#C99A63" strokeWidth="4" strokeLinecap="round" />
      <line x1="-22" y1="-34" x2="-14" y2="0" stroke="#C99A63" strokeWidth="4" strokeLinecap="round" />
      <line x1="22" y1="-34" x2="30" y2="0" stroke="#C99A63" strokeWidth="4" strokeLinecap="round" />
      <line x1="22" y1="-34" x2="14" y2="0" stroke="#C99A63" strokeWidth="4" strokeLinecap="round" />
      <line x1="-8" y1="-33" x2="-8" y2="-12" stroke="#7A8089" strokeWidth="1.5" />
      <line x1="-2" y1="-33" x2="-2" y2="-12" stroke="#7A8089" strokeWidth="1.5" />
      <rect x="-10" y="-12" width="10" height="3" rx="1.5" fill="#E8617A" />
      <line x1="4" y1="-33" x2="4" y2="-12" stroke="#7A8089" strokeWidth="1.5" />
      <line x1="10" y1="-33" x2="10" y2="-12" stroke="#7A8089" strokeWidth="1.5" />
      <rect x="3" y="-12" width="10" height="3" rx="1.5" fill="#2C97E0" />
    </g>
  );
}
function SceneSlide() {
  return (
    <g>
      <ellipse cx="-3" cy="2" rx="30" ry="5" fill="rgba(40,70,30,0.16)" />
      <path d="M-22 -34 L-12 -34 L24 -2 L14 -2 Z" fill="#6FB7E0" />
      <path d="M-12 -34 L24 -2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <rect x="-31" y="-40" width="15" height="6" rx="2" fill="#E8B23A" />
      <line x1="-28" y1="0" x2="-28" y2="-38" stroke="#C99A63" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="-18" y1="0" x2="-18" y2="-38" stroke="#C99A63" strokeWidth="3.5" strokeLinecap="round" />
      <g stroke="#B98A53" strokeWidth="2.5"><path d="M-28 -8H-18 M-28 -18H-18 M-28 -28H-18" /></g>
    </g>
  );
}
function SceneStall({ stripe }) {
  stripe = stripe || "#E8617A";
  const x0 = -32, sw = 64 / 8;
  return (
    <g>
      <ellipse cx="0" cy="2" rx="36" ry="6" fill="rgba(40,70,30,0.16)" />
      <rect x="-31" y="-30" width="3" height="30" fill="#B98A53" /><rect x="28" y="-30" width="3" height="30" fill="#B98A53" />
      <rect x="-32" y="-14" width="64" height="14" rx="2" fill="#E4D2AC" />
      <rect x="-32" y="-14" width="64" height="4" fill="#D9C49A" />
      <rect x="-24" y="-20" width="11" height="6" rx="1.5" fill="#FFB72E" />
      <rect x="-5" y="-20" width="11" height="6" rx="1.5" fill="#2FB16B" />
      <rect x="14" y="-20" width="11" height="6" rx="1.5" fill="#FF5CA0" />
      <path d="M-37 -30 L0 -48 L37 -30 Z" fill={stripe} />
      <path d="M0 -48 L37 -30 L0 -30 Z" fill="#FFF3E0" opacity="0.9" />
      <path d="M-37 -30 L37 -30 L37 -28 L-37 -28 Z" fill="rgba(0,0,0,0.08)" />
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d={`M ${x0 + i * sw} -30 a ${sw / 2} ${sw / 2} 0 0 0 ${sw} 0 Z`} fill={i % 2 ? stripe : "#FFF3E0"} />
      ))}
    </g>
  );
}
function SceneLamp() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="9" ry="3" fill="rgba(40,70,30,0.16)" />
      <rect x="-6" y="-3" width="12" height="4" rx="2" fill="#3C4650" />
      <rect x="-2" y="-50" width="4" height="48" rx="2" fill="#3C4650" />
      <circle cx="0" cy="-56" r="11" fill="#FFE08A" opacity="0.3" />
      <path d="M-7 -54 L7 -54 L5 -64 L-5 -64 Z" fill="#3C4650" />
      <rect x="-5" y="-62.5" width="10" height="8.5" rx="1" fill="#FFE9A8" />
      <ellipse cx="0" cy="-65" rx="8" ry="3.5" fill="#3C4650" />
    </g>
  );
}
function SceneSignpost() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="8" ry="3" fill="rgba(40,70,30,0.16)" />
      <rect x="-2" y="-42" width="4" height="42" rx="2" fill="#9A6B43" />
      <path d="M2 -39 L2 -31 L-16 -31 L-22 -35 L-16 -39 Z" fill="#2FB16B" />
      <path d="M-2 -27 L-2 -19 L16 -19 L22 -23 L16 -27 Z" fill="#2C97E0" />
    </g>
  );
}
function SceneBridge({ len, style }) {
  const L = (len || 90) / 2;
  const wood = style === "stone" ? "#CFC9C0" : "#C99A63";
  const hi = style === "stone" ? "#E6E1DA" : "#E0C9A0";
  const dk = style === "stone" ? "#A29C94" : "#9A6B43";
  const peak = 9;
  const arch = (x) => -peak * (1 - (x / L) * (x / L));
  const N = 12;
  const xs = [];
  for (let i = 0; i <= N; i++) xs.push(-L + (2 * L * i) / N);
  const topY = (x) => arch(x) + 2;
  const botY = (x) => arch(x) + 12;
  let deck = `M ${(-L).toFixed(1)} ${topY(-L).toFixed(1)}`;
  xs.forEach((x) => deck += ` L ${x.toFixed(1)} ${topY(x).toFixed(1)}`);
  [...xs].reverse().forEach((x) => deck += ` L ${x.toFixed(1)} ${botY(x).toFixed(1)}`);
  deck += " Z";
  let topEdge = `M ${(-L).toFixed(1)} ${topY(-L).toFixed(1)}`;
  xs.forEach((x) => topEdge += ` L ${x.toFixed(1)} ${topY(x).toFixed(1)}`);
  let rail = `M ${(-L).toFixed(1)} ${(arch(-L) - 1).toFixed(1)}`;
  xs.forEach((x) => rail += ` L ${x.toFixed(1)} ${(arch(x) - 1).toFixed(1)}`);
  const planks = [];
  for (let i = 1; i < N; i++) { const x = xs[i]; planks.push(<line key={i} x1={x} y1={topY(x)} x2={x} y2={botY(x)} stroke={dk} strokeWidth="0.8" opacity="0.45" />); }
  const posts = [];
  [-L, -L / 2, 0, L / 2, L].forEach((x, i) => posts.push(<line key={i} x1={x} y1={arch(x) - 1} x2={x} y2={arch(x) + 3} stroke={dk} strokeWidth="2" strokeLinecap="round" />));
  return (
    <g>
      <ellipse cx="0" cy="13" rx={L + 3} ry="4.5" fill="rgba(40,70,30,0.18)" />
      <path d={deck} fill={wood} />
      <path d={topEdge} fill="none" stroke={hi} strokeWidth="2" />
      {planks}
      <path d={rail} fill="none" stroke={dk} strokeWidth="2.5" strokeLinecap="round" />
      {posts}
    </g>
  );
}

/* Auto road-bridge: the deck IS the road (same casing + fill) stroked along the
   full padded span, so it follows every bend and runs straight onto the bank.
   Parapet rails, plank ticks and the elevation shadow stay on the over-water
   core, so the bridge ends exactly at the banks with no blunt edge. */
function RoadBridge({ pts, core, w, style }) {
  if (!pts || pts.length < 2) return null;
  const d = smoothPath(pts, false);
  const cd = smoothPath((core && core.length >= 2 ? core : pts), false);
  const stone = style === "stone";
  const wood = stone ? "#CFC9C0" : "#C99A63";
  const hi = stone ? "#ECE7E0" : "#E2CCA3";
  const dk = stone ? "#9E988F" : "#9A6B43";
  const rail = Math.max(5, w * 0.16);
  // NOTE: (VR) plank ticks run perpendicular to the deck, over the water core only
  const S = smoothSamples(core && core.length >= 2 ? core : pts, false, 6);
  const planks = [];
  const hw = w / 2 - 1.5;
  for (let i = 2; i < S.length - 2; i += 3) {
    const a = S[i - 1], b = S[i + 1];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    planks.push(
      <line key={i} x1={(S[i][0] - nx * hw).toFixed(1)} y1={(S[i][1] - ny * hw).toFixed(1)}
            x2={(S[i][0] + nx * hw).toFixed(1)} y2={(S[i][1] + ny * hw).toFixed(1)}
            stroke={dk} strokeWidth="1.1" opacity="0.32" />
    );
  }
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* elevation shadow — water core only */}
      <path d={cd} stroke="rgba(16,44,58,0.26)" strokeWidth={w + rail * 2 + 4} transform="translate(0,5)" />
      {/* parapet band (rail on each side of the deck) — water core only */}
      <path d={cd} stroke={wood} strokeWidth={w + rail * 2} />
      {/* the deck = the road itself, full span, so both ends merge into the road */}
      <path d={d} stroke="#E8D9BC" strokeWidth={w + 6} />
      <path d={d} stroke="var(--map-path)" strokeWidth={w} />
      {/* soft highlight down the middle of the deck (core only) */}
      <path d={cd} stroke={hi} strokeWidth={Math.max(2, w * 0.18)} opacity="0.25" />
      {planks}
    </g>
  );
}

/* ---- buildings & park props (origin-anchored: footprint at y=0, drawn up) ---- */
function SceneMuseum() {
  return (
    <g>
      <ellipse cx="0" cy="3" rx="42" ry="7" fill="rgba(40,70,30,0.16)" />
      <rect x="-38" y="-5" width="76" height="7" fill="#CFC9C0" />
      <rect x="-33" y="-31" width="66" height="26" fill="#ECE6DB" />
      {[-27, -16.2, -5.4, 5.4, 16.2, 27].map((x, i) => (
        <g key={i}>
          <rect x={x - 2.6} y="-31" width="5.2" height="26" fill="#FBF8F2" />
          <rect x={x - 2.6} y="-31" width="1.4" height="26" fill="#E0D8CB" />
        </g>
      ))}
      <path d="M-42 -31 L0 -52 L42 -31 Z" fill="#E2DACD" />
      <path d="M-42 -31 L0 -52 L42 -31" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <path d="M-42 -31 L42 -31 L42 -27 L-42 -27 Z" fill="#CFC9C0" />
      <circle cx="0" cy="-38" r="3.4" fill="#C9A23A" opacity="0.65" />
    </g>
  );
}
function SceneCafe({ stripe }) {
  stripe = stripe || "#E0673F";
  const x0 = -24, sw = 48 / 6;
  return (
    <g>
      <ellipse cx="0" cy="3" rx="30" ry="6" fill="rgba(40,70,30,0.16)" />
      <rect x="-24" y="-32" width="48" height="32" rx="2" fill="#F6EAD0" stroke="#E4D2AC" strokeWidth="2" />
      <rect x="-19" y="-20" width="10" height="9" rx="1" fill="#A7CFE0" />
      <rect x="9" y="-20" width="10" height="9" rx="1" fill="#A7CFE0" />
      <rect x="-5" y="-18" width="11" height="18" rx="1" fill="#9A6B43" />
      <circle cx="3" cy="-9" r="1" fill="#E8B23A" />
      <rect x="-26" y="-36" width="52" height="5" rx="2" fill={stripe} />
      {Array.from({ length: 6 }).map((_, i) => (
        <path key={i} d={`M ${x0 + i * sw} -31 a ${sw / 2} ${sw / 2} 0 0 0 ${sw} 0 Z`} fill={i % 2 ? stripe : "#FFF3E0"} />
      ))}
      <rect x="-13" y="-45" width="26" height="8" rx="2" fill="#5C4A33" />
      <circle cx="-6" cy="-41" r="1.4" fill="#E8B23A" /><circle cx="0" cy="-41" r="1.4" fill="#E8B23A" /><circle cx="6" cy="-41" r="1.4" fill="#E8B23A" />
    </g>
  );
}
function SceneShop({ stripe }) {
  stripe = stripe || "#2C97E0";
  return (
    <g>
      <ellipse cx="0" cy="3" rx="28" ry="6" fill="rgba(40,70,30,0.16)" />
      <rect x="-24" y="-30" width="48" height="30" rx="2" fill="#EFE3CC" stroke="#E4D2AC" strokeWidth="2" />
      <rect x="-24" y="-30" width="48" height="6" fill="#5C4A33" />
      <rect x="-19" y="-21" width="38" height="13" rx="1.5" fill="#BFE0EC" />
      <rect x="-19" y="-14.5" width="38" height="6.5" fill="#9CC6D8" />
      <rect x="-6" y="-8" width="12" height="8" rx="1" fill="#9A6B43" />
      <path d="M-27 -24 L27 -24 L23 -16 L-23 -16 Z" fill={stripe} />
      <path d="M-23 -16 L23 -16" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
    </g>
  );
}
function SceneToilets() {
  return (
    <g>
      <ellipse cx="0" cy="3" rx="22" ry="5" fill="rgba(40,70,30,0.16)" />
      <rect x="-18" y="-26" width="36" height="26" rx="2" fill="#E7EBEE" stroke="#CBD3D8" strokeWidth="2" />
      <path d="M-20 -26 L0 -38 L20 -26 Z" fill="#7A8089" />
      <path d="M-20 -26 L0 -38 L20 -26" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <rect x="-12" y="-18" width="9" height="18" rx="1" fill="#9AA6AE" />
      <rect x="3" y="-18" width="9" height="18" rx="1" fill="#9AA6AE" />
      <rect x="-9" y="-23" width="18" height="6" rx="1.5" fill="#2C97E0" />
      <circle cx="-3.5" cy="-20" r="1.2" fill="#fff" /><circle cx="3.5" cy="-20" r="1.2" fill="#fff" />
    </g>
  );
}
function SceneGazebo() {
  return (
    <g>
      <ellipse cx="0" cy="3" rx="32" ry="7" fill="rgba(40,70,30,0.16)" />
      <ellipse cx="0" cy="0" rx="28" ry="7" fill="#D9C49A" />
      <ellipse cx="0" cy="-2" rx="28" ry="7" fill="#E4D2AC" />
      {[-24, -9, 9, 24].map((x, i) => <rect key={i} x={x - 1.5} y="-32" width="3" height="31" fill="#CFC9C0" />)}
      <path d="M-34 -30 L0 -52 L34 -30 Z" fill="#7BA86A" />
      <path d="M-34 -30 L0 -52 L34 -30" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
      <path d="M-34 -30 L34 -30 L34 -27 L-34 -27 Z" fill="#5E8A50" />
      <circle cx="0" cy="-54" r="3" fill="#E8B23A" />
    </g>
  );
}
function SceneStatue() {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="18" ry="5" fill="rgba(40,70,30,0.16)" />
      <rect x="-14" y="-2" width="28" height="4" rx="1.5" fill="#A29C94" />
      <rect x="-11" y="-12" width="22" height="11" rx="1" fill="#B7B0A6" />
      <rect x="-11" y="-15" width="22" height="3" fill="#CFC9C0" />
      <g transform="translate(0 -12)" fill="#C9C4C0">
        <path d="M-7 0 Q-8 -16 0 -16 Q8 -16 7 0 Z" />
        <circle cx="0" cy="-20" r="5" />
        <path d="M-6 -6 L-13 -15" stroke="#C9C4C0" strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <path d="M6 -6 L12 -14" stroke="#C9C4C0" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}
function SceneSeesaw() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="30" ry="5" fill="rgba(40,70,30,0.16)" />
      <path d="M-7 0 L0 -13 L7 0 Z" fill="#7A8089" />
      <g transform="rotate(-11)">
        <rect x="-30" y="-15" width="60" height="6" rx="3" fill="#E8617A" />
        <rect x="-27.5" y="-23" width="2.6" height="9" rx="1.3" fill="#C0452F" />
        <rect x="24.9" y="-23" width="2.6" height="9" rx="1.3" fill="#C0452F" />
        <circle cx="-26" cy="-12" r="3.6" fill="#FFB72E" />
        <circle cx="26" cy="-12" r="3.6" fill="#2C97E0" />
      </g>
    </g>
  );
}
function SceneSandpit() {
  return (
    <g>
      <ellipse cx="0" cy="3" rx="30" ry="6" fill="rgba(40,70,30,0.14)" />
      <rect x="-26" y="-16" width="52" height="22" rx="5" fill="#B98A53" />
      <rect x="-22" y="-12" width="44" height="16" rx="3" fill="#F2DEA8" />
      <ellipse cx="-8" cy="-3" rx="10" ry="4" fill="#E8CB86" />
      <path d="M8 -8 h9 l-1.4 8 h-6.2 Z" fill="#FF6A45" />
      <path d="M8 -8 q4.5 -3.4 9 0" fill="none" stroke="#E0522F" strokeWidth="1.4" />
      <line x1="21" y1="-13" x2="15.5" y2="-2" stroke="#2C97E0" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="19.5" y="-15" width="4" height="3" rx="1" fill="#2C97E0" />
    </g>
  );
}
function SceneRoundabout() {
  const cols = ["#FF6A45", "#FFB72E", "#2C97E0", "#2FB16B", "#8A5BF0", "#FF5CA0"];
  const rx = 27, ry = 13;
  const seg = (i) => {
    const a0 = (i / 6) * 2 * Math.PI, a1 = ((i + 1) / 6) * 2 * Math.PI;
    return `M0 -8 L${(Math.cos(a0) * rx).toFixed(1)} ${(-8 + Math.sin(a0) * ry).toFixed(1)} A ${rx} ${ry} 0 0 1 ${(Math.cos(a1) * rx).toFixed(1)} ${(-8 + Math.sin(a1) * ry).toFixed(1)} Z`;
  };
  return (
    <g>
      <ellipse cx="0" cy="2" rx={rx} ry="6" fill="rgba(40,70,30,0.16)" />
      <ellipse cx="0" cy="-4" rx={rx} ry={ry} fill="#A29C94" />
      {cols.map((c, i) => <path key={i} d={seg(i)} fill={c} />)}
      <ellipse cx="0" cy="-8" rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <line x1="0" y1="-8" x2="0" y2="-25" stroke="#7A8089" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-14 -10 Q0 -27 14 -10" fill="none" stroke="#7A8089" strokeWidth="2" />
      <circle cx="0" cy="-8" r="2.6" fill="#5A6069" />
    </g>
  );
}
function SceneSwan() {
  // NOTE: (VR) floats facing left — ripple stands in for the ground shadow
  return (
    <g>
      <ellipse cx="0" cy="1" rx="16" ry="3" fill="rgba(255,255,255,0.4)" />
      <path d="M0 1 a16 4 0 0 0 14 -1" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <ellipse cx="1" cy="-6" rx="13" ry="8" fill="#FBFBFA" />
      <path d="M10 -10 Q18 -18 13 -6 Z" fill="#F0EEEA" />
      <path d="M-8 -8 Q-17 -10 -16 -21 Q-15 -28 -9 -27" fill="none" stroke="#FBFBFA" strokeWidth="5" strokeLinecap="round" />
      <circle cx="-9" cy="-27.5" r="4" fill="#FBFBFA" />
      <path d="M-12.5 -27.5 q-4.5 0 -5 1.6 q0.5 1.6 5 1.2 Z" fill="#F2952F" />
      <path d="M-11 -29 l3 -1 -3 -1 Z" fill="#2E2A2E" />
      <circle cx="-8.5" cy="-28.5" r="1" fill="#2E2A2E" />
    </g>
  );
}
function SceneSheep() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="15" ry="4" fill="rgba(40,70,30,0.16)" />
      <line x1="-7" y1="-4" x2="-7" y2="1" stroke="#3C3A40" strokeWidth="3" strokeLinecap="round" />
      <line x1="6" y1="-4" x2="6" y2="1" stroke="#3C3A40" strokeWidth="3" strokeLinecap="round" />
      <g fill="#F2F0EC">
        <circle cx="-7" cy="-9" r="6" /><circle cx="1" cy="-11" r="7" /><circle cx="9" cy="-8" r="6" />
        <circle cx="-2" cy="-6" r="7" /><circle cx="6" cy="-5" r="5.5" />
      </g>
      <ellipse cx="-12" cy="-11" rx="4.4" ry="5.4" fill="#3C3A40" />
      <ellipse cx="-15.6" cy="-13" rx="1.8" ry="2.6" fill="#2A282E" />
      <ellipse cx="-11" cy="-15.4" rx="1.8" ry="2.6" fill="#2A282E" />
      <circle cx="-12.4" cy="-11" r="0.9" fill="#fff" />
    </g>
  );
}

function SceneTrain({ color }) {
  const body = color || "#E8617A";
  const wheel = (cx, r) => (
    <g key={cx}>
      <circle cx={cx} cy={-r} r={r} fill="#3C3A40" />
      <circle cx={cx} cy={-r} r={r * 0.46} fill="#9AA0A8" />
      <circle cx={cx} cy={-r} r="1.3" fill="#3C3A40" />
    </g>
  );
  return (
    <g>
      <ellipse cx="-10" cy="6" rx="58" ry="7" fill="rgba(40,70,30,0.16)" />
      {/* track */}
      <line x1="-64" y1="0" x2="42" y2="0" stroke="#8A8F97" strokeWidth="2.5" />
      {[-58, -46, -34, -22, -10, 2, 14, 26, 38].map((x, i) => <line key={i} x1={x} y1="-1" x2={x} y2="5" stroke="#9A6B43" strokeWidth="3" strokeLinecap="round" opacity="0.5" />)}
      {/* carriage */}
      <g>
        <rect x="-62" y="-34" width="34" height="8" rx="3" fill="#E8617A" />
        <rect x="-60" y="-30" width="30" height="20" rx="3" fill="#FFD54A" />
        <rect x="-56" y="-26" width="9" height="9" rx="1.5" fill="#BFE0EC" />
        <rect x="-44" y="-26" width="9" height="9" rx="1.5" fill="#BFE0EC" />
        <circle cx="-51.5" cy="-23" r="2.6" fill="#F4C29A" />
        <circle cx="-39.5" cy="-23" r="2.6" fill="#E8B27E" />
        <line x1="-30" y1="-8" x2="-24" y2="-8" stroke="#5A6069" strokeWidth="2.5" strokeLinecap="round" />
        {wheel(-54, 5)}{wheel(-36, 5)}
      </g>
      {/* engine */}
      <g>
        <rect x="-26" y="-44" width="22" height="5" rx="2.5" fill="#3C3A40" />
        <rect x="-24" y="-42" width="18" height="32" rx="3" fill={body} />
        <rect x="-21" y="-38" width="12" height="11" rx="1.5" fill="#BFE0EC" />
        <rect x="-8" y="-28" width="40" height="20" rx="10" fill={body} />
        <ellipse cx="31" cy="-18" rx="3.6" ry="10" fill="#3C3A40" />
        <path d="M6 -28 a6 6 0 0 1 12 0 Z" fill="#3C3A40" />
        <rect x="21" y="-42" width="10" height="4" rx="2" fill="#3C3A40" />
        <path d="M24 -28 l-2 -12 h8 l-2 12 Z" fill="#3C3A40" />
        <circle cx="33" cy="-22" r="2.6" fill="#FFE08A" />
        <path d="M32 -10 L40 -10 L34 0 L32 0 Z" fill="#5A6069" />
        {wheel(-14, 9)}{wheel(10, 6)}{wheel(26, 6)}
      </g>
      {/* smoke */}
      <g fill="#FBFBFA">
        <circle cx="26" cy="-46" r="4" opacity="0.92" />
        <circle cx="22" cy="-52" r="5" opacity="0.78" />
        <circle cx="15" cy="-58" r="6" opacity="0.6" />
        <circle cx="6" cy="-63" r="7" opacity="0.4" />
      </g>
    </g>
  );
}
function SceneHill() {
  return (
    <g>
      <ellipse cx="0" cy="4" rx="64" ry="9" fill="rgba(40,70,30,0.14)" />
      <path d="M-62 2 Q-52 -22 -22 -28 Q0 -33 28 -26 Q54 -20 62 2 Z" fill="#7AB96A" />
      <path d="M-60 2 Q-40 -36 -2 -38 Q38 -38 60 2 Z" fill="#8FCB7E" />
      <path d="M-30 -10 Q-16 -33 6 -33" fill="none" stroke="#AEDD96" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <g stroke="#5BA158" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M-30 0 q2 -5 4 0" /><path d="M-24 1 q2 -5 4 0" />
        <path d="M22 0 q2 -5 4 0" /><path d="M30 1 q2 -4 4 0" />
      </g>
    </g>
  );
}
function SceneMountain() {
  return (
    <g>
      <ellipse cx="0" cy="5" rx="72" ry="10" fill="rgba(40,70,30,0.16)" />
      {/* back peak */}
      <path d="M-26 2 L20 -64 L54 2 Z" fill="#8E97A3" />
      <path d="M20 -64 L54 2 L30 2 Z" fill="#7E8794" />
      {/* front peak */}
      <path d="M-66 2 L-14 -94 L48 2 Z" fill="#A8B0BA" />
      <path d="M-14 -94 L48 2 L12 2 Z" fill="#8E97A3" />
      <path d="M-66 2 L-14 -94 L48 2" fill="none" stroke="#7E8794" strokeWidth="1.5" opacity="0.5" />
      {/* snow cap */}
      <path d="M-14 -94 L8 -60 Q0 -54 -7 -59 Q-15 -54 -23 -59 Q-30 -55 -33 -60 Z" fill="#FBFBFA" />
      <path d="M-14 -94 L-1 -74 Q-6 -71 -10 -75 Z" fill="#E7ECF1" />
    </g>
  );
}
function SceneWindmill() {
  return (
    <g>
      <ellipse cx="0" cy="4" rx="28" ry="7" fill="rgba(40,70,30,0.16)" />
      <path d="M-16 0 L-11 -44 L11 -44 L16 0 Z" fill="#EFE8D8" stroke="#DCD2BC" strokeWidth="2" />
      <path d="M0 0 L11 -44 L16 0 Z" fill="rgba(0,0,0,0.06)" />
      <rect x="-5" y="-15" width="10" height="15" rx="2" fill="#9A6B43" />
      <circle cx="0" cy="-30" r="3.4" fill="#BFE0EC" />
      <path d="M-15 -44 L0 -58 L15 -44 Z" fill="#7BA86A" />
      <path d="M-15 -44 L0 -58 L15 -44" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" />
      <g transform="translate(0 -47)">
        {[45, 135, 225, 315].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <rect x="2.5" y="-3.6" width="24" height="7.2" rx="1.5" fill="#F4E7CF" stroke="#C9A23A" strokeWidth="1.2" />
            <line x1="3" y1="0" x2="26" y2="0" stroke="#C9A23A" strokeWidth="1" />
          </g>
        ))}
        <circle r="3.4" fill="#5C4A33" />
      </g>
    </g>
  );
}
function SceneTent() {
  return (
    <g>
      <ellipse cx="-3" cy="3" rx="36" ry="6" fill="rgba(40,70,30,0.16)" />
      <line x1="-16" y1="-38" x2="-31" y2="0" stroke="#9A6B43" strokeWidth="1.2" />
      <line x1="20" y1="-34" x2="35" y2="0" stroke="#9A6B43" strokeWidth="1.2" />
      <path d="M2 0 L20 -34 L34 0 Z" fill="#E0673F" />
      <path d="M-34 0 L-16 -38 L2 0 Z" fill="#FF6A45" />
      <path d="M-16 -38 L20 -34" stroke="#C0452F" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-16 -38 L-7 0 L-25 0 Z" fill="#5C4A33" />
      <path d="M-16 -38 L-12 -2" stroke="#3C2E22" strokeWidth="1.3" />
      <path d="M-16 -38 v-9" stroke="#5C4A33" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-16 -47 l9 2.5 -9 2.5 Z" fill="#FFD54A" />
    </g>
  );
}
function SceneCampfire() {
  return (
    <g>
      <ellipse cx="0" cy="3" rx="20" ry="5" fill="rgba(40,70,30,0.16)" />
      <g fill="#B7B0A6">
        <ellipse cx="-13" cy="-1" rx="4" ry="2.6" /><ellipse cx="13" cy="-1" rx="4" ry="2.6" />
        <ellipse cx="0" cy="1" rx="4.4" ry="2.8" />
      </g>
      <g stroke="#9A6B43" strokeWidth="6" strokeLinecap="round">
        <line x1="-13" y1="-3" x2="13" y2="-7" /><line x1="-13" y1="-7" x2="13" y2="-3" />
      </g>
      <circle cx="-13" cy="-5" r="2.1" fill="#7A5230" /><circle cx="13" cy="-5" r="2.1" fill="#7A5230" />
      <path d="M0 -8 C-8 -16 -6 -25 0 -34 C6 -25 8 -16 0 -8 Z" fill="#FF6A45" />
      <path d="M0 -9 C-4 -15 -3 -21 0 -28 C3 -21 4 -15 0 -9 Z" fill="#FFB72E" />
      <path d="M0 -11 C-2 -14 -1 -18 0 -22 C1 -18 2 -14 0 -11 Z" fill="#FFE08A" />
      <circle cx="6" cy="-30" r="1.2" fill="#FFD54A" /><circle cx="-5" cy="-26" r="1" fill="#FF6A45" />
    </g>
  );
}

const ABS_KINDS = new Set(["tree", "bush", "rock", "flower", "house", "bench", "label", "lilypad"]);
function SceneItem({ it }) {
  const op = it.o == null ? 1 : it.o;
  if (ABS_KINDS.has(it.kind)) {
    let node = null;
    switch (it.kind) {
      case "tree":    node = <SceneTree {...it} />; break;
      case "bush":    node = <SceneBush {...it} />; break;
      case "rock":    node = <SceneRock {...it} />; break;
      case "flower":  node = <SceneFlower {...it} />; break;
      case "house":   node = <SceneHouse {...it} />; break;
      case "bench":   node = <SceneBench {...it} />; break;
      case "label":   node = <SceneLabel {...it} />; break;
      case "lilypad": node = <SceneLilypad {...it} />; break;
      default:        return null;
    }
    return op < 1 ? <g opacity={op}>{node}</g> : node;
  }
  const s = it.s || 1, sx = (it.flip ? -1 : 1) * s;
  let inner = null;
  switch (it.kind) {
    case "family":      inner = <SceneFamily />; break;
    case "kid":         inner = <SceneKid />; break;
    case "dog":         inner = <SceneDog color={it.color} />; break;
    case "balloon":     inner = <SceneBalloon />; break;
    case "ferriswheel": inner = <SceneFerris />; break;
    case "car":         inner = <SceneCar color={it.color} />; break;
    case "tractor":     inner = <SceneTractor color={it.color} />; break;
    case "picnic":      inner = <ScenePicnic />; break;
    case "duck":        inner = <SceneDuck />; break;
    case "kite":        inner = <SceneKite />; break;
    case "icecream":    inner = <SceneIceCream />; break;
    case "hotdog":      inner = <SceneHotdog />; break;
    case "ballooncart": inner = <SceneBalloonCart />; break;
    case "fountain":    inner = <SceneFountain />; break;
    case "swing":       inner = <SceneSwing />; break;
    case "slide":       inner = <SceneSlide />; break;
    case "stall":       inner = <SceneStall stripe={it.stripe} />; break;
    case "lamp":        inner = <SceneLamp />; break;
    case "signpost":    inner = <SceneSignpost />; break;
    case "train":       inner = <SceneTrain color={it.color} />; break;
    case "hill":        inner = <SceneHill />; break;
    case "mountain":    inner = <SceneMountain />; break;
    case "windmill":    inner = <SceneWindmill />; break;
    case "tent":        inner = <SceneTent />; break;
    case "campfire":    inner = <SceneCampfire />; break;
    case "bridge":      inner = <SceneBridge len={it.len} style={it.style} />; break;
    case "museum":      inner = <SceneMuseum />; break;
    case "cafe":        inner = <SceneCafe stripe={it.stripe} />; break;
    case "shop":        inner = <SceneShop stripe={it.stripe} />; break;
    case "toilets":     inner = <SceneToilets />; break;
    case "gazebo":      inner = <SceneGazebo />; break;
    case "statue":      inner = <SceneStatue />; break;
    case "seesaw":      inner = <SceneSeesaw />; break;
    case "sandpit":     inner = <SceneSandpit />; break;
    case "roundabout":  inner = <SceneRoundabout />; break;
    case "swan":        inner = <SceneSwan />; break;
    case "sheep":       inner = <SceneSheep />; break;
    default: return null;
  }
  return <g opacity={op} transform={`translate(${it.x} ${it.y}) rotate(${it.rot || 0}) scale(${sx} ${s})`}>{inner}</g>;
}

/* ---------- defs (shared gradients) ---------- */
function SceneDefs() {
  return (
    <defs>
      <radialGradient id="grassGrad" cx="40%" cy="32%" r="92%">
        <stop offset="0%" stopColor="var(--map-grass)" />
        <stop offset="100%" stopColor="var(--map-grass3)" />
      </radialGradient>
      <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--map-water)" />
        <stop offset="100%" stopColor="var(--map-water2)" />
      </linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="16" /></filter>
    </defs>
  );
}

// Renders the background + soft grass mottling (non-editable bed).
function SceneBackground() {
  return (
    <>
      <rect x="0" y="0" width="1600" height="1000" fill="url(#grassGrad)" />
      <g opacity="0.5" filter="url(#soft)">
        <ellipse cx="300" cy="240" rx="300" ry="210" fill="var(--map-grass2)" />
        <ellipse cx="1180" cy="540" rx="360" ry="270" fill="var(--map-grass2)" />
        <ellipse cx="760" cy="870" rx="400" ry="210" fill="var(--map-grass3)" />
        <ellipse cx="980" cy="180" rx="280" ry="170" fill="var(--map-grass3)" />
      </g>
    </>
  );
}

// One filled water/grass blob.
function SceneArea({ a }) {
  const fill = a.kind === "water" ? "url(#waterGrad)" : "var(--map-grass2)";
  const base = a.kind === "water" ? 0.92 : 0.6;
  return <path d={smoothPath(a.pts, true)} fill={fill} opacity={base * (a.o == null ? 1 : a.o)} />;
}

// Per-kind road styling (casing + fill + optional centre markings).
function roadStyle(p) {
  const w = p.w || 40;
  switch (p.kind) {
    case "traffic": return { casing: "#5C616B", cw: w + 10, fill: "#9AA0A8", fw: w, center: "#F2ECDC", cdash: "20 18", cw2: Math.max(2.4, w * 0.07) };
    case "dirt":    return { casing: "#A8855A", cw: w + 8,  fill: "#C8A671", fw: w, center: null };
    default:        return { casing: "#E8D9BC", cw: w + 14, fill: "var(--map-path)", fw: w, center: null };
  }
}

// One road (double stroke: casing + inner fill) or river (water stroke).
function ScenePath({ p }) {
  const d = smoothPath(p.pts, false);
  const op = p.o == null ? 1 : p.o;
  if (p.kind === "river") {
    return <path d={d} fill="none" stroke="url(#waterGrad)" strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" opacity={0.82 * op} />;
  }
  const s = roadStyle(p);
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={op}>
      <path d={d} stroke={s.casing} strokeWidth={s.cw} />
      <path d={d} stroke={s.fill} strokeWidth={s.fw} />
      {s.center && <path d={d} stroke={s.center} strokeWidth={s.cw2} strokeDasharray={s.cdash} opacity="0.85" />}
    </g>
  );
}

// The whole scene. `layout` is the data; items are depth-sorted by y so foliage overlaps nicely.
function MapScene({ layout }) {
  const items = [...(layout.items || [])].sort((a, b) => ((a.z || 0) - (b.z || 0)) || ((a.y || 0) - (b.y || 0)));
  const areas = [...(layout.areas || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  const allPaths = [...(layout.paths || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  const rivers = allPaths.filter((p) => p.kind === "river");
  const roads = allPaths.filter((p) => p.kind !== "river");
  const bridges = computeBridges(layout);
  return (
    <svg className="map-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <SceneDefs />
      <SceneBackground />
      <g>{areas.map((a) => <SceneArea key={a.id} a={a} />)}</g>
      <g>{rivers.map((p) => <ScenePath key={p.id} p={p} />)}</g>
      {/* NOTE: (VR) draw roads in passes so intersecting roads of a kind merge into clean junctions */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {roads.map((p) => { const s = roadStyle(p); return <path key={p.id + "c"} d={smoothPath(p.pts, false)} stroke={s.casing} strokeWidth={s.cw} opacity={p.o == null ? 1 : p.o} />; })}
        {roads.map((p) => { const s = roadStyle(p); return <path key={p.id + "f"} d={smoothPath(p.pts, false)} stroke={s.fill} strokeWidth={s.fw} opacity={p.o == null ? 1 : p.o} />; })}
        {roads.map((p) => { const s = roadStyle(p); return s.center ? <path key={p.id + "m"} d={smoothPath(p.pts, false)} stroke={s.center} strokeWidth={s.cw2} strokeDasharray={s.cdash} opacity={0.85 * (p.o == null ? 1 : p.o)} /> : null; })}
      </g>
      {/* NOTE: (VR) bridges go where roads cross water, so the road never floats on the river */}
      <g>{bridges.map((b) => <RoadBridge key={b.id} {...b} />)}</g>
      <g>{items.map((it) => <SceneItem key={it.id} it={it} />)}</g>
    </svg>
  );
}

window.LDA_SCENE = {
  MapScene, SceneDefs, SceneBackground, SceneArea, ScenePath, SceneItem,
  SceneTree, SceneBush, SceneRock, SceneFlower, SceneHouse, SceneBench, SceneLabel,
  smoothPath,
};
