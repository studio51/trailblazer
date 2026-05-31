// sections.jsx — logo, nav, and below-the-fold sections

const { CATEGORIES: _CATS, CAT: _CAT, ACTIVITIES: _ACTS, STEPS: _STEPS, PARENTS: _PARENTS } = window.LDA_DATA;

/* ---- Brand mark: a sunny map-pin ---- */
function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 3C12.8 3 7 8.6 7 15.6 7 24 20 37 20 37s13-13 13-21.4C33 8.6 27.2 3 20 3Z"
            fill="var(--coral)" />
      <circle cx="20" cy="15.4" r="5.2" fill="#FFF3E0" />
      <g stroke="#FFF3E0" strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 5.6v2.2M20 23v2.2M9.8 15.4H12M28 15.4h2.2M12.8 8.2l1.6 1.6M25.6 21l1.6 1.6M27.2 8.2l-1.6 1.6M14.4 21l-1.6 1.6" />
      </g>
    </svg>
  );
}

function Wordmark() {
  return (
    <a className="brand" href="#top">
      <LogoMark />
      <span className="brand__name">Little Days Out</span>
    </a>
  );
}

function Nav({ onCta }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className={"nav" + (scrolled ? " nav--solid" : "")}>
      <Wordmark />
      <div className="nav__links">
        <a href="#how">How it works</a>
        <a href="#nearby">What's on</a>
        <a href="#parents">For families</a>
      </div>
      <div className="nav__actions">
        <button className="btn btn--ghost" onClick={onCta}>Sign in</button>
        <button className="btn btn--coral" onClick={onCta}>Get the app</button>
      </div>
    </nav>
  );
}

/* ---- How it works ---- */
function HowItWorks() {
  return (
    <section className="band" id="how">
      <div className="wrap">
        <header className="sechead">
          <span className="lda-eyebrow" style={{ color: "var(--coral)" }}>Three taps to a good day</span>
          <h2>From “I’m bored” to out the door</h2>
          <p className="sechead__sub">No more endless searching or group-chat polling. Little Days Out does the digging so you can get on with the fun bit.</p>
        </header>
        <div className="steps">
          {_STEPS.map((s, i) => (
            <article className="step" key={i}>
              <span className="step__num">{i + 1}</span>
              <span className="step__icon" style={{ background: s.soft, color: s.color }}>
                <Icon name={s.icon} size={28} stroke={2.2} />
              </span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Featured / nearby ---- */
function ActivityCard({ act }) {
  const cat = _CAT[act.cat];
  return (
    <article className="acard">
      <div className="acard__media" style={{ "--pc": cat.color, "--pcs": cat.soft }}>
        <Icon name={iconFor(act, cat)} size={52} stroke={1.7} />
        <span className="acard__cat" style={{ background: cat.color }}>{cat.label}</span>
        <button className="acard__heart" aria-label="Save"><Icon name="heart" size={16} stroke={2.2} /></button>
      </div>
      <div className="acard__body">
        <div className="acard__top">
          <h3>{act.name}</h3>
          <span className="acard__rate"><Icon name="star" size={13} stroke={0} style={{ fill: "var(--sun)" }} />{act.rating}</span>
        </div>
        <div className="acard__meta"><Icon name="pin" size={14} stroke={2.2} style={{ color: cat.color }} />{act.distance} away · ages {act.age}</div>
        <div className="acard__foot">
          <span className="acard__price">{act.price}</span>
          <span className="acard__more">Details <Icon name="arrowRight" size={15} stroke={2.4} /></span>
        </div>
      </div>
    </article>
  );
}

function Featured() {
  return (
    <section className="band band--cream" id="nearby">
      <div className="wrap">
        <header className="sechead sechead--row">
          <div>
            <span className="lda-eyebrow" style={{ color: "var(--leaf)" }}>Popular near you</span>
            <h2>What families are loving this week</h2>
          </div>
          <button className="btn btn--ghost btn--lg">Browse the map <Icon name="mapIcon" size={18} stroke={2.2} /></button>
        </header>
        <div className="acards">
          {_ACTS.slice(0, 4).map((a) => <ActivityCard key={a.id} act={a} />)}
        </div>
      </div>
    </section>
  );
}

/* ---- Categories grid ---- */
function Categories() {
  const tiles = _CATS.filter((c) => c.id !== "all");
  return (
    <section className="band" id="cats">
      <div className="wrap">
        <header className="sechead sechead--center">
          <span className="lda-eyebrow" style={{ color: "var(--grape)" }}>Something for every mood</span>
          <h2>Whatever the day throws at you</h2>
          <p className="sechead__sub">Sunny morning, soggy afternoon, fizzing-with-energy toddler — there’s a filter for that.</p>
        </header>
        <div className="cattiles">
          {tiles.map((c) => (
            <button className="cattile" key={c.id} style={{ "--pc": c.color, "--pcs": c.soft }}>
              <span className="cattile__icon"><Icon name={c.icon} size={30} stroke={2.1} /></span>
              <span className="cattile__label">{c.label}</span>
              <span className="cattile__arrow"><Icon name="arrowRight" size={16} stroke={2.4} /></span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Parents / testimonials ---- */
function Parents() {
  return (
    <section className="band band--cream" id="parents">
      <div className="wrap">
        <header className="sechead sechead--center">
          <span className="lda-eyebrow" style={{ color: "var(--berry)" }}>From the school gates</span>
          <h2>Built for real, busy parents</h2>
        </header>
        <div className="quotes">
          {_PARENTS.map((p, i) => (
            <figure className="quote" key={i}>
              <div className="quote__mark" style={{ color: p.color }}>“</div>
              <blockquote>{p.quote}</blockquote>
              <figcaption>
                <span className="quote__av" style={{ background: p.color }}>{p.name[0]}</span>
                <span><b>{p.name}</b><small>{p.meta}</small></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Waitlist / CTA ---- */
function Waitlist() {
  const [val, setVal] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <section className="cta" id="get">
      <div className="cta__inner">
        <div className="cta__suns" aria-hidden="true">
          <span style={{ background: "var(--sun)" }}></span>
          <span style={{ background: "var(--leaf)" }}></span>
          <span style={{ background: "var(--sky)" }}></span>
          <span style={{ background: "var(--berry)" }}></span>
        </div>
        <h2>Your next little day out is waiting</h2>
        <p>Join the early list and we’ll let you know the moment Little Days Out lands in your town. No spam — just good days.</p>
        {sent ? (
          <div className="cta__done"><Icon name="check" size={20} stroke={3} /> You’re on the list. Talk soon.</div>
        ) : (
          <form className="cta__form" onSubmit={(e) => { e.preventDefault(); if (val.includes("@")) setSent(true); }}>
            <input type="email" placeholder="you@email.com" value={val} onChange={(e) => setVal(e.target.value)} required />
            <button className="btn btn--coral btn--lg" type="submit">Join the list <Icon name="arrowRight" size={18} stroke={2.4} /></button>
          </form>
        )}
        <div className="cta__stores">
          <span className="store"><Icon name="check" size={15} stroke={2.6} /> Free to use</span>
          <span className="store"><Icon name="check" size={15} stroke={2.6} /> iOS &amp; Android</span>
          <span className="store"><Icon name="check" size={15} stroke={2.6} /> No ads, ever</span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div>
          <Wordmark />
          <p className="footer__tag">Make the most of the little days.</p>
        </div>
        <div className="footer__cols">
          <div><b>Explore</b><a href="#nearby">What's on</a><a href="#cats">Categories</a><a href="#get">Get the app</a></div>
          <div><b>Company</b><a href="#">About</a><a href="#">For venues</a><a href="#">Careers</a></div>
          <div><b>Help</b><a href="#">Support</a><a href="#">Privacy</a><a href="#">Terms</a></div>
        </div>
      </div>
      <div className="wrap footer__base">
        <span>© 2026 Little Days Out</span>
        <span>Made for parents, with love.</span>
      </div>
    </footer>
  );
}

window.LDA_SECTIONS = { Nav, Wordmark, LogoMark, HowItWorks, Featured, Categories, Parents, Waitlist, Footer, ActivityCard };
