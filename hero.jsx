// hero.jsx — illustrated park map: rich SVG art, glossy pins, zoom control, detail card

const { useState, useMemo, useRef, useEffect } = React;

/* ---------- deterministic scatter ---------- */
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function buildTrees() {
  const rnd = seeded(7);
  const clusters = [
    [80, 90, 300, 230], [560, 60, 460, 150], [1160, 70, 380, 230],
    [40, 470, 240, 440], [1360, 330, 220, 560], [360, 820, 560, 180],
    [880, 700, 380, 260], [1260, 730, 320, 230], [720, 410, 200, 150],
    [200, 250, 220, 180], [1040, 470, 200, 180],
  ];
  const trees = [];
  clusters.forEach(([bx, by, bw, bh]) => {
    const n = 5 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      trees.push({ x: bx + rnd() * bw, y: by + rnd() * bh, r: 16 + rnd() * 21, dark: rnd() > 0.5 });
    }
  });
  return trees.sort((a, b) => a.y - b.y);
}
const TREES = buildTrees();

const FLOWERS = [
  { x: 250, y: 560, c: "#FF7BAC" }, { x: 292, y: 578, c: "#FFD54A" }, { x: 268, y: 602, c: "#7FB0FF" },
  { x: 470, y: 250, c: "#FFD54A" }, { x: 510, y: 268, c: "#FF7BAC" }, { x: 444, y: 276, c: "#FF7BAC" },
  { x: 1396, y: 712, c: "#7FB0FF" }, { x: 1436, y: 730, c: "#FFD54A" }, { x: 1414, y: 688, c: "#FF7BAC" },
  { x: 612, y: 930, c: "#FFD54A" }, { x: 656, y: 946, c: "#FF7BAC" },
];

function MapArt() {
  return (
    <svg className="map-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="grassGrad" cx="40%" cy="32%" r="92%">
          <stop offset="0%" stopColor="var(--map-grass)" />
          <stop offset="100%" stopColor="var(--map-grass3)" />
        </radialGradient>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--map-water)" />
          <stop offset="100%" stopColor="var(--map-water2)" />
        </linearGradient>
        <radialGradient id="pondGrad" cx="40%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#A7E0F0" /><stop offset="100%" stopColor="var(--map-water2)" />
        </radialGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="16" /></filter>
      </defs>

      <rect width="1600" height="1000" fill="url(#grassGrad)" />

      <g opacity="0.5" filter="url(#soft)">
        <ellipse cx="300" cy="240" rx="300" ry="210" fill="var(--map-grass2)" />
        <ellipse cx="1180" cy="540" rx="360" ry="270" fill="var(--map-grass2)" />
        <ellipse cx="760" cy="870" rx="400" ry="210" fill="var(--map-grass3)" />
        <ellipse cx="980" cy="180" rx="280" ry="170" fill="var(--map-grass3)" />
      </g>

      {/* lake + river */}
      <path d="M -40 720 Q 220 660 380 700 Q 560 748 520 860 Q 480 980 240 980 L -40 980 Z" fill="url(#waterGrad)" opacity="0.92" />
      <path d="M 640 -20 Q 700 180 900 240 Q 1120 305 1180 520 Q 1230 700 1120 900" fill="none" stroke="url(#waterGrad)" strokeWidth="42" strokeLinecap="round" opacity="0.82" />
      {/* small pond */}
      <ellipse cx="1330" cy="250" rx="120" ry="80" fill="url(#pondGrad)" opacity="0.9" />
      <g fill="#7BCB86" opacity="0.85">
        <ellipse cx="1300" cy="240" rx="16" ry="11" /><ellipse cx="1360" cy="270" rx="14" ry="9" /><ellipse cx="1340" cy="220" rx="12" ry="8" />
      </g>
      {/* lily pads on the lake */}
      <g fill="#7BCB86" opacity="0.82">
        <ellipse cx="170" cy="858" rx="16" ry="10" /><ellipse cx="312" cy="902" rx="14" ry="9" /><ellipse cx="240" cy="930" rx="12" ry="8" />
      </g>

      {/* paths */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -40 420 Q 260 360 420 460 Q 600 570 820 520 Q 1060 465 1240 560 Q 1420 650 1660 600" stroke="#E8D9BC" strokeWidth="56" />
        <path d="M -40 420 Q 260 360 420 460 Q 600 570 820 520 Q 1060 465 1240 560 Q 1420 650 1660 600" stroke="var(--map-path)" strokeWidth="42" />
        <path d="M 360 -40 Q 420 220 360 380 Q 300 560 460 700 Q 600 820 560 1040" stroke="#E8D9BC" strokeWidth="46" />
        <path d="M 360 -40 Q 420 220 360 380 Q 300 560 460 700 Q 600 820 560 1040" stroke="var(--map-path)" strokeWidth="34" />
        <path d="M 1640 240 Q 1380 300 1240 240 Q 1060 170 900 300 Q 760 410 820 520" stroke="#E8D9BC" strokeWidth="40" />
        <path d="M 1640 240 Q 1380 300 1240 240 Q 1060 170 900 300 Q 760 410 820 520" stroke="var(--map-path)" strokeWidth="28" />
      </g>

      {/* bridge across the river */}
      <g transform="translate(905 250) rotate(28)">
        <rect x="-44" y="-13" width="88" height="26" rx="5" fill="#C99A63" />
        <g stroke="#A87B45" strokeWidth="2.5">
          <path d="M-30 -13V13M-12 -13V13M6 -13V13M24 -13V13" />
        </g>
      </g>

      {/* carousel near the fair */}
      <g transform="translate(770 760)">
        <ellipse cx="0" cy="34" rx="62" ry="16" fill="rgba(40,70,30,0.16)" />
        <circle cx="0" cy="0" r="48" fill="#F6EAD4" />
        <circle cx="0" cy="0" r="48" fill="none" stroke="#E3CFA8" strokeWidth="3" />
        <path d="M-54 -6 Q0 -64 54 -6 Z" fill="#E8617A" />
        <path d="M-54 -6 Q0 -64 54 -6" fill="none" stroke="#fff" strokeWidth="3" />
        <g stroke="#C0452F" strokeWidth="5" strokeLinecap="round"><path d="M-34 -2V30M0 -6V34M34 -2V30" /></g>
        <circle cx="0" cy="-52" r="6" fill="#FFD54A" />
      </g>

      {/* playground: slide + swing */}
      <g transform="translate(250 380)">
        <ellipse cx="6" cy="40" rx="46" ry="12" fill="rgba(40,70,30,0.15)" />
        <path d="M-30 36 L-30 -2 L2 36 Z" fill="#6FB7E0" />
        <rect x="-34" y="-8" width="10" height="46" rx="4" fill="#D98C5F" />
        <g stroke="#8A6A45" strokeWidth="4" strokeLinecap="round"><path d="M20 -8 L40 36M52 -8 L40 36M28 -8H46" /></g>
        <rect x="28" y="20" width="14" height="6" rx="2" fill="#E8617A" />
      </g>

      {/* pavilion / bandstand */}
      <g transform="translate(1080 470)">
        <ellipse cx="0" cy="26" rx="40" ry="11" fill="rgba(40,70,30,0.15)" />
        <rect x="-30" y="-4" width="60" height="30" rx="5" fill="#F4E7CF" />
        <path d="M-38 -2 L0 -34 L38 -2 Z" fill="#7BA86A" />
        <path d="M-38 -2 L0 -34 L38 -2" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.6" />
      </g>

      {/* roofs */}
      <Roof x={1175} y={150} w={56} fill="#C77BAE" />
      <Roof x={205} y={560} w={60} fill="#7FB0DD" />

      {/* flowers */}
      <g>{FLOWERS.map((f, i) => <Flower key={i} {...f} />)}</g>

      {/* forest */}
      <g>{TREES.map((t, i) => <Tree key={i} {...t} />)}</g>
    </svg>
  );
}

function Roof({ x, y, w, fill }) {
  const h = w * 0.62;
  return (
    <g>
      <rect x={x - w / 2} y={y} width={w} height={h} rx="6" fill="#F4E7CF" />
      <path d={`M ${x - w / 2 - 6} ${y + 4} L ${x} ${y - h * 0.55} L ${x + w / 2 + 6} ${y + 4} Z`} fill={fill} />
    </g>
  );
}
function Tree({ x, y, r, dark }) {
  const main = dark ? "#5FA35C" : "#73B86B";
  const hi = dark ? "#7CC077" : "#94D389";
  return (
    <g>
      <ellipse cx={x} cy={y + r * 0.78} rx={r * 0.95} ry={r * 0.34} fill="rgba(40,70,30,0.18)" />
      <circle cx={x} cy={y} r={r} fill={main} />
      <circle cx={x - r * 0.32} cy={y - r * 0.34} r={r * 0.55} fill={hi} opacity="0.9" />
    </g>
  );
}
function Flower({ x, y, c }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos(a * Math.PI / 180) * 5} cy={Math.sin(a * Math.PI / 180) * 5} r="3.4" fill={c} />
      ))}
      <circle cx="0" cy="0" r="2.6" fill="#FFF3E0" />
    </g>
  );
}

/* ---------- Pin ---------- */
function Pin({ act, cat, selected, showLabel, pinStyle, kids, onClick, index }) {
  const style = { left: act.x + "%", top: act.y + "%", "--delay": (index * 0.11) + "s", zIndex: selected ? 30 : 10 };
  return (
    <button
      className={"pin pin--" + pinStyle + (selected ? " pin--on" : "") + (kids ? " pin--kids" : "")}
      style={style}
      onClick={(e) => { e.stopPropagation(); onClick(act.id); }}
      aria-label={act.name}
    >
      <span className="pin__float">
        <span className="pin__badge" style={{ "--pc": cat.color }}>
          <Icon name={iconFor(act, cat)} size={kids ? 21 : 19} stroke={2} />
        </span>
        {(showLabel || selected) && <span className="pin__label" style={{ "--pc": cat.color }}>{act.name}</span>}
      </span>
    </button>
  );
}

/* ---------- Zoom control ---------- */
function ZoomControl({ zoom, min, max, onZoom }) {
  const pct = Math.round(zoom * 100);
  return (
    <div className="zoomctl">
      <button aria-label="Zoom out" onClick={() => onZoom(Math.max(min, +(zoom - 0.15).toFixed(2)))}>
        <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </button>
      <input type="range" min={min * 100} max={max * 100} value={pct}
             onChange={(e) => onZoom(+(e.target.value / 100).toFixed(2))} />
      <span className="zoomctl__val">{pct}%</span>
      <button aria-label="Zoom in" onClick={() => onZoom(Math.min(max, +(zoom + 0.15).toFixed(2)))}>
        <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

/* ---------- Detail card ---------- */
function DetailCard({ act, cat, kids, collected, onPrev, onNext, onGo }) {
  return (
    <aside className={"detail" + (kids ? " detail--kids" : "")} key={act.id}>
      <div className="detail__media" style={{ "--pc": cat.color, "--pcs": cat.soft }}>
        <div className="detail__mediaGlyph"><Icon name={iconFor(act, cat)} size={62} stroke={1.7} /></div>
        <span className="detail__price">{act.price}</span>
        <div className="detail__nav">
          <button onClick={onPrev} aria-label="Previous place"><Icon name="chevronL" size={18} stroke={2.6} /></button>
          <button onClick={onNext} aria-label="Next place"><Icon name="chevronR" size={18} stroke={2.6} /></button>
        </div>
        <span className="detail__cat" style={{ background: cat.color }}>
          <Icon name={cat.icon} size={13} stroke={2.6} /> {cat.label}
        </span>
      </div>

      <div className="detail__body">
        <div className="detail__head">
          <h3>{act.name}</h3>
          <span className="detail__rate"><Icon name="star" size={14} stroke={0} style={{ fill: "var(--sun)" }} />{act.rating}</span>
        </div>

        {kids ? (
          <div className="detail__kidline" style={{ "--pc": cat.color }}>
            <Icon name="sparkles" size={16} stroke={2.4} /> {act.kid}
          </div>
        ) : (
          <div className="detail__row"><Icon name="pin" size={16} stroke={2.2} style={{ color: cat.color }} />
            <span>{act.where} · <b>{act.distance}</b></span>
          </div>
        )}

        <div className="detail__meta">
          <div><span className="detail__metaLabel"><Icon name="users" size={14} stroke={2.2} /> Ages</span><b>{act.age}</b></div>
          <div><span className="detail__metaLabel"><Icon name="clock" size={14} stroke={2.2} /> Opening</span><b>{act.hours}</b></div>
        </div>

        {!kids && <p className="detail__blurb">{act.blurb}</p>}

        <div className="detail__tags">
          {act.tags.map((t) => <span key={t} className="chiplet">{t}</span>)}
        </div>

        {kids ? (
          <button className={"btn btn--block btn--kidgo" + (collected ? " is-collected" : "")} style={{ background: cat.color }} onClick={onGo}>
            {collected ? (<><Icon name="check" size={18} stroke={3} /> Stamp collected!</>) : (<><Icon name="sparkles" size={17} stroke={2.4} /> Let’s go here — collect a stamp!</>)}
          </button>
        ) : (
          <button className="btn btn--block" style={{ background: cat.color }}>
            View details &amp; plan a visit <Icon name="arrowRight" size={17} stroke={2.4} />
          </button>
        )}
      </div>
    </aside>
  );
}

window.LDA_HERO = { MapArt, Pin, DetailCard, ZoomControl };
