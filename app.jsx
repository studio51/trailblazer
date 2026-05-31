// app.jsx — hero composition (pan/zoom + parents/kids modes) + App shell + Tweaks

const { MapScene } = window.LDA_SCENE;
const { MapEditor } = window.LDA_EDITOR;
const { Pin, DetailCard, ZoomControl } = window.LDA_HERO;
const { Nav, HowItWorks, Featured, Categories, Parents, Waitlist, Footer } = window.LDA_SECTIONS;
const { ModeToggle, Mascot, SurpriseButton, Passport, ldaConfetti } = window.LDA_KIDS;
const D = window.LDA_DATA;

const STAGE = 1.18;       // map stage is 118% of the hero
const ZMIN = 0.85, ZMAX = 1.8;

function HeroSection({ headline, subhead, pinStyle, mode, setMode, layout, setLayout, editing, setEditing }) {
  const [activeCat, setActiveCat] = useState("all");
  const [selectedId, setSelectedId] = useState("wonderlab");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [stamps, setStamps] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [excited, setExcited] = useState(false);

  const heroRef = useRef(null);
  const dragRef = useRef(null);
  const excitedT = useRef(null);

  const visible = useMemo(
    () => D.ACTIVITIES.filter((a) => activeCat === "all" || a.cat === activeCat),
    [activeCat]
  );
  useEffect(() => {
    if (!visible.find((a) => a.id === selectedId) && visible.length) setSelectedId(visible[0].id);
  }, [activeCat]); // eslint-disable-line

  const selected = D.ACTIVITIES.find((a) => a.id === selectedId) || visible[0];
  const selCat = D.CAT[selected.cat];

  /* ---- pan / zoom maths ---- */
  const size = () => {
    const el = heroRef.current;
    return el ? { w: el.offsetWidth, h: el.offsetHeight } : { w: 1440, h: 800 };
  };
  const clampPan = (p, z) => {
    const { w, h } = size();
    const maxX = Math.max(0, (w * STAGE * z - w) / 2);
    const maxY = Math.max(0, (h * STAGE * z - h) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) };
  };
  const computePan = (act, z) => {
    const { w, h } = size();
    const SW = w * STAGE, SH = h * STAGE;
    const pinX = (act.x / 100) * SW, pinY = (act.y / 100) * SH;
    const focalX = (mode === "kids" ? -0.16 : -0.14) * w;   // NOTE: (VR) nudge left of centre so the card doesn't cover the pin
    const focalY = -0.06 * h;
    return clampPan({ x: focalX - (pinX - SW / 2) * z, y: focalY - (pinY - SH / 2) * z }, z);
  };
  const centerOn = (act, z = zoom) => setPan(computePan(act, z));

  const onZoom = (z) => { setZoom(z); setPan((p) => clampPan(p, z)); };

  /* ---- drag to pan ---- */
  const onPointerDown = (e) => {
    if (e.target.closest(".pin")) return;       // NOTE: (VR) let pins handle their own click, don't start a pan
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.px + (e.clientX - d.sx), ny = d.py + (e.clientY - d.sy);
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 3) d.moved = true;
    setPan(clampPan({ x: nx, y: ny }, zoom));
  };
  const onPointerUp = () => { dragRef.current = null; setDragging(false); };

  /* ---- selecting a pin ---- */
  const flashExcited = () => {
    setExcited(true);
    clearTimeout(excitedT.current);
    excitedT.current = setTimeout(() => setExcited(false), 1400);
  };
  const collect = (id) => setStamps((s) => (s.includes(id) ? s : [...s, id]));

  const selectPin = (id, ev) => {
    const act = D.ACTIVITIES.find((a) => a.id === id);
    setSelectedId(id);
    centerOn(act);
    if (mode === "kids") {
      const had = stamps.includes(id);
      collect(id);
      if (ev && ev.clientX != null) ldaConfetti(ev.clientX, ev.clientY);
      if (!had) flashExcited();
    }
  };

  /* ---- surprise me ---- */
  const surprise = () => {
    if (spinning || !visible.length) return;
    setSpinning(true);
    let i = 0;
    const order = [...visible].sort(() => Math.random() - 0.5);
    const final = order[Math.floor(Math.random() * order.length)];
    const tick = () => {
      const a = order[i % order.length];
      setSelectedId(a.id);
      i++;
      if (i < 14) {
        setTimeout(tick, 70 + i * 14);
      } else {
        setSelectedId(final.id);
        centerOn(final, Math.max(zoom, 1.2));
        if (zoom < 1.2) setZoom(1.2);
        collect(final.id);
        flashExcited();
        const r = heroRef.current.getBoundingClientRect();
        ldaConfetti(r.left + r.width * (mode === "kids" ? 0.34 : 0.36), r.top + r.height * 0.44);
        setSpinning(false);
      }
    };
    tick();
  };

  /* ---- mode switch ---- */
  const switchMode = (m) => {
    setMode(m);
    setPan({ x: 0, y: 0 }); setZoom(1);
  };

  const labelled = new Set(["treetops", "fair"]);
  const kids = mode === "kids";

  const mascotLine = excited
    ? "Yay! Stamp collected!"
    : (stamps.length ? "Where shall we go next, explorer?" : "Tap a pin to start your adventure!");

  const stageStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transition: dragging ? "none" : "transform 0.5s var(--ease)",
  };

  return (
    <header className={"hero" + (kids ? " hero--kids" : "")} id="top" ref={heroRef}>
      <div className={"hero__map" + (dragging ? " is-dragging" : "")}
           onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="mapStage" style={stageStyle}>
          <MapScene layout={layout} />
          <div className="pins">
            {D.ACTIVITIES.map((a, i) => {
              const inFilter = activeCat === "all" || a.cat === activeCat;
              const pos = (layout.pins && layout.pins[a.id]) || { x: a.x, y: a.y };
              const eff = { ...a, x: pos.x, y: pos.y };
              return (
                <span key={a.id} className={"pinwrap" + (inFilter ? "" : " pinwrap--dim")}>
                  <Pin act={eff} cat={D.CAT[a.cat]} index={i} pinStyle={pinStyle} kids={kids}
                       selected={selected.id === a.id} showLabel={labelled.has(a.id)}
                       onClick={(id, ev) => selectPin(id, ev)} />
                </span>
              );
            })}
          </div>
        </div>
        <div className="hero__scrim" />
      </div>

      <Nav onCta={() => document.getElementById("get").scrollIntoView({ behavior: "smooth" })} />

      <ZoomControl zoom={zoom} min={ZMIN} max={ZMAX} onZoom={onZoom} />

      <div className="editmapbar">
        <button className="editmap" onClick={() => setEditing(true)} title="Build the map">
          <Icon name="mapIcon" size={16} stroke={2.2} /> Edit map
        </button>
        <button className="editmap editmap--gen" onClick={() => setLayout(window.LDA_MAP.generateAndSave())} title="Generate a brand-new random map">
          <Icon name="sparkles" size={16} stroke={2.2} /> New map
        </button>
      </div>

      {editing && (
        <MapEditor layout={layout} setLayout={setLayout} activities={D.ACTIVITIES} cats={D.CAT}
                   onClose={() => setEditing(false)} />
      )}

      {kids && <Mascot line={mascotLine} excited={excited} />}

      <div className="hero__content">
        <ModeToggle mode={mode} onChange={switchMode} />

        {kids ? (
          <>
            <span className="hero__eyebrow hero__eyebrow--kids"><span className="dot" /> Let’s find an adventure</span>
            <h1 className="hero__title">Where shall we go today?</h1>
            <p className="hero__sub">Tap a pin to explore, collect a stamp for every place you visit — or hit <b>Surprise me</b> and we’ll pick something fun!</p>
            <div className="kidsActions">
              <SurpriseButton onSurprise={surprise} spinning={spinning} />
              <span className="kidsHint"><Icon name="navigation" size={15} stroke={2.4} /> Drag the map to look around</span>
            </div>
          </>
        ) : (
          <>
            <span className="hero__eyebrow"><span className="dot" /> Now exploring your neighbourhood</span>
            <h1 className="hero__title">{headline}</h1>
            <p className="hero__sub">{subhead}</p>
            <form className="search" onSubmit={(e) => e.preventDefault()}>
              <span className="search__field">
                <Icon name="pin" size={20} stroke={2.2} style={{ color: "var(--coral)" }} />
                <input placeholder="Enter your postcode or town" defaultValue="Riverton, RV1" />
              </span>
              <button type="button" className="search__loc"><Icon name="navigation" size={16} stroke={2.4} /> Near me</button>
              <button type="submit" className="btn btn--coral search__go">Find days out</button>
            </form>
          </>
        )}

        <div className="chips">
          {D.CATEGORIES.map((c) => (
            <button key={c.id} className={"chip" + (activeCat === c.id ? " chip--on" : "")}
                    style={{ "--pc": c.color, "--pcs": c.soft }} onClick={() => setActiveCat(c.id)}>
              <span className="chip__ico"><Icon name={c.icon} size={17} stroke={2.3} /></span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <DetailCard act={selected} cat={selCat} kids={kids} collected={stamps.includes(selected.id)}
                  onPrev={() => { const i = visible.findIndex((a) => a.id === selectedId); const n = (i - 1 + visible.length) % visible.length; selectPin(visible[n].id); }}
                  onNext={() => { const i = visible.findIndex((a) => a.id === selectedId); const n = (i + 1) % visible.length; selectPin(visible[n].id); }}
                  onGo={(e) => selectPin(selected.id, e)} />

      {kids && <Passport activities={D.ACTIVITIES} collected={stamps} total={D.ACTIVITIES.length} onPick={(id) => selectPin(id)} />}
    </header>
  );
}

/* ---------------- Tweaks ---------------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FF6A45",
  "headline": "Find brilliant days out, near you",
  "subhead": "A friendly map of everything worth doing with the kids today — parks, soft play, museums, farms and free family fun, all just down the road.",
  "pinStyle": "badge",
  "startMode": "parents",
  "secHow": true,
  "secNearby": true,
  "secCats": true,
  "secParents": true
}/*EDITMODE-END*/;

const ACCENTS = ["#FF6A45", "#8A5BF0", "#2C97E0", "#2FB16B", "#FF5CA0"];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [mode, setMode] = useState(t.startMode || "parents");
  const [layout, setLayout] = useState(() => window.LDA_MAP.loadLayout());
  const [editing, setEditing] = useState(false);
  useEffect(() => { setMode(t.startMode || "parents"); }, [t.startMode]);

  useEffect(() => {
    document.documentElement.style.setProperty("--coral", t.accent);
    document.documentElement.style.setProperty("--coral-deep", shade(t.accent, -16));
    document.documentElement.style.setProperty("--coral-soft", tint(t.accent, 0.86));
  }, [t.accent]);

  return (
    <div className="page">
      <HeroSection headline={t.headline} subhead={t.subhead} pinStyle={t.pinStyle} mode={mode} setMode={setMode}
                   layout={layout} setLayout={setLayout} editing={editing} setEditing={setEditing} />
      {t.secHow && <HowItWorks />}
      {t.secNearby && <Featured />}
      {t.secCats && <Categories />}
      {t.secParents && <Parents />}
      <Waitlist />
      <Footer />

      <TweaksPanel>
        <TweakSection label="Experience" />
        <TweakRadio label="Open in" value={t.startMode} options={["parents", "kids"]}
                    onChange={(v) => setTweak("startMode", v)} />
        <TweakSection label="Brand" />
        <TweakColor label="Accent colour" value={t.accent} options={ACCENTS} onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Pin style" value={t.pinStyle} options={["badge", "round"]} onChange={(v) => setTweak("pinStyle", v)} />
        <TweakSection label="Hero copy (grown-ups)" />
        <TweakText label="Headline" value={t.headline} onChange={(v) => setTweak("headline", v)} />
        <TweakText label="Sub-headline" value={t.subhead} onChange={(v) => setTweak("subhead", v)} />
        <TweakSection label="Sections" />
        <TweakToggle label="How it works" value={t.secHow} onChange={(v) => setTweak("secHow", v)} />
        <TweakToggle label="Popular nearby" value={t.secNearby} onChange={(v) => setTweak("secNearby", v)} />
        <TweakToggle label="Categories" value={t.secCats} onChange={(v) => setTweak("secCats", v)} />
        <TweakToggle label="Parent stories" value={t.secParents} onChange={(v) => setTweak("secParents", v)} />
      </TweaksPanel>
    </div>
  );
}

function hexToRgb(h) { const m = h.replace("#", ""); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; }
function shade(h, pct) { const [r, g, b] = hexToRgb(h); const f = (c) => Math.max(0, Math.min(255, Math.round(c + (c * pct) / 100))); return `rgb(${f(r)}, ${f(g)}, ${f(b)})`; }
function tint(h, amt) { const [r, g, b] = hexToRgb(h); const f = (c) => Math.round(c + (255 - c) * amt); return `rgb(${f(r)}, ${f(g)}, ${f(b)})`; }

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
