// kids.jsx: Kids mode: mode toggle, mascot guide, surprise button, passport, confetti

/* ---------- Mode toggle (Grown-ups / Kids) ---------- */
function ModeToggle({ mode, onChange }) {
  return (
    <div className="modetoggle" role="tablist" aria-label="Choose mode">
      <button role="tab" aria-selected={mode === "parents"} className={mode === "parents" ? "is-on" : ""} onClick={() => onChange("parents")}>
        <Icon name="users" size={16} stroke={2.4} /> Grown-ups
      </button>
      <button role="tab" aria-selected={mode === "kids"} className={mode === "kids" ? "is-on" : ""} onClick={() => onChange("kids")}>
        <Icon name="sparkles" size={16} stroke={2.4} /> Kids
      </button>
    </div>
  );
}

/* ---------- Mascot "Pip the spark" ---------- */
function Mascot({ line, excited }) {
  return (
    <div className={"mascot" + (excited ? " mascot--excited" : "")} aria-hidden="true">
      {line && <div className="mascot__bubble">{line}</div>}
      <div className="mascot__body">
        <svg width="76" height="76" viewBox="0 0 80 80">
          <defs>
            <radialGradient id="pipG" cx="38%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#FFE08A" /><stop offset="100%" stopColor="#FFB72E" />
            </radialGradient>
          </defs>
          <path d="M40 5l8.5 18.6L68 26l-13 14.5L58.5 60 40 50.5 21.5 60 25 40.5 12 26l19.5-2.4Z"
                fill="url(#pipG)" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="33" cy="35" r="4.2" fill="#3A2B12" />
          <circle cx="47" cy="35" r="4.2" fill="#3A2B12" />
          <circle cx="34.4" cy="33.6" r="1.4" fill="#fff" />
          <circle cx="48.4" cy="33.6" r="1.4" fill="#fff" />
          <path d="M33 43c2.6 3 9.4 3 12 0" fill="none" stroke="#3A2B12" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="27" cy="41" r="3" fill="#FF8FA3" opacity="0.6" />
          <circle cx="53" cy="41" r="3" fill="#FF8FA3" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
}

/* ---------- Surprise button ---------- */
function SurpriseButton({ onSurprise, spinning }) {
  return (
    <button className={"surprise" + (spinning ? " is-spinning" : "")} onClick={onSurprise} disabled={spinning}>
      <span className="surprise__ico"><Icon name="sparkles" size={20} stroke={2.4} /></span>
      {spinning ? "Finding a surprise…" : "Surprise me!"}
    </button>
  );
}

/* ---------- Adventure passport (bottom strip) ---------- */
function Passport({ activities, collected, total, onPick }) {
  return (
    <div className="passport">
      <div className="passport__head">
        <span className="passport__title"><Icon name="star" size={15} stroke={0} style={{ fill: "var(--sun)" }} /> Adventure passport</span>
        <span className="passport__count">{collected.length} / {total}</span>
      </div>
      <div className="passport__track">
        {activities.map((a) => {
          const got = collected.includes(a.id);
          const cat = window.LDA_DATA.CAT[a.cat];
          return (
            <button key={a.id} className={"stamp" + (got ? " stamp--got" : "")} style={{ "--pc": cat.color }}
                    title={got ? a.fun : "Locked, go collect this!"} onClick={() => onPick(a.id)}>
              <span className="stamp__disc">
                {got ? <Icon name={iconFor(a, cat)} size={18} stroke={2.2} /> : <Icon name="pin" size={15} stroke={2.2} />}
              </span>
              <span className="stamp__cap">{got ? a.fun : "?"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Confetti ---------- */
function ldaConfetti(x, y, colors) {
  colors = colors || ["#FF6A45", "#FFB72E", "#2FB16B", "#2C97E0", "#FF5CA0", "#8A5BF0"];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    const ang = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 120;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 40;
    bit.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${dx}px;--dy:${dy}px;--rot:${Math.random() * 720 - 360}deg;--d:${600 + Math.random() * 500}ms;width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 6}px;border-radius:${Math.random() > 0.5 ? "2px" : "50%"};`;
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 1200);
  }
}

window.LDA_KIDS = { ModeToggle, Mascot, SurpriseButton, Passport, ldaConfetti };
