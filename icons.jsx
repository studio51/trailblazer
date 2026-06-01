// icons.jsx: clean line-icon set (Lucide-style, 24 box, round caps/joins)
// Consistent with the Homey design system's Lucide iconography.
const { createElement: h } = React;

function Icon({ name, size = 24, stroke = 2, className = "", style = {} }) {
  const paths = ICON_PATHS[name] || ICON_PATHS.sparkles;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

// resolve the glyph for an activity (per-place override → category default)
function iconFor(act, cat) {
  return (act && act.icon) || (cat && cat.icon) || "sparkles";
}

const ICON_PATHS = {
  /* ---------- category glyphs ---------- */
  // Parks & play: clean evergreen (triangle silhouette reads at any size)
  trees: (<>
    <path d="M12 3 6.5 11h11L12 3Z" />
    <path d="M12 9.5 6 18h12L12 9.5Z" />
    <path d="M12 18v4" /><path d="M9.5 22h5" />
  </>),
  // Soft play: three stacked toy blocks
  blocks: (<>
    <rect x="3" y="11.5" width="8.4" height="8.4" rx="1.4" />
    <rect x="12.6" y="11.5" width="8.4" height="8.4" rx="1.4" />
    <rect x="7.8" y="3.2" width="8.4" height="7" rx="1.4" />
  </>),
  // Museums: columned landmark
  landmark: (<>
    <path d="M3 22h18" /><path d="M6 18v-7" /><path d="M10 18v-7" /><path d="M14 18v-7" /><path d="M18 18v-7" />
    <path d="M4 11h16" /><path d="M12 2.5 3.8 7.4a.6.6 0 0 0 .3 1.1h15.8a.6.6 0 0 0 .3-1.1Z" />
  </>),
  // Classes & clubs: beamed notes
  music: (<>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </>),
  // Events & fairs: proper ferris wheel
  ferris: (<>
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v4" /><path d="m6.8 15-3.5 2" /><path d="m20.7 7-3.5 2" />
    <path d="M6.8 9 3.3 7" /><path d="m20.7 17-3.5-2" />
    <path d="m9 22 3-8 3 8" /><path d="M8 22h8" />
    <path d="M18 18.7a9 9 0 1 0-12 0" />
  </>),
  // Farms & days out: tractor
  tractor: (<>
    <path d="M4 13V8a1 1 0 0 1 1-1h4.6a1 1 0 0 1 .9.55L12 11h4" />
    <path d="M13 7V4.4" />
    <path d="M16 11h2a1 1 0 0 1 1 1v3.2" />
    <path d="M11 16h3.8" />
    <circle cx="7" cy="16" r="3.6" /><circle cx="17.6" cy="17" r="2.6" />
  </>),
  sparkles: (<>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
    <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
  </>),

  /* ---------- per-place glyphs (map variety) ---------- */
  treePine: (<>
    <path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 10h-.2A1 1 0 0 1 8 8.3L12 4l4 4.3a1 1 0 0 1-.8 1.7H15l3 2.3a1 1 0 0 1-.7 1.7H17Z" />
    <path d="M12 22v-3" />
  </>),
  sailboat: (<>
    <path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z" />
    <path d="M21 14 10 2 3 14h18Z" />
    <path d="M10 2v16" />
  </>),
  droplets: (<>
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 4.7 7 2.3c-.29 2.4-1.14 3.86-2.29 4.81S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
  </>),
  flask: (<>
    <path d="M14 2v6.2a2 2 0 0 0 .25.96l5.5 9.84A2 2 0 0 1 18 22H6a2 2 0 0 1-1.75-2.98l5.5-9.84A2 2 0 0 0 10 8.2V2" />
    <path d="M6.5 15h11" /><path d="M8.5 2h7" />
  </>),
  fish: (<>
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
    <path d="M16 17.5a10 10 0 0 1 0-11" />
    <path d="M7 10.4C7 8 5.6 6 2.9 5.5c-1 1.5-1 5 .2 6.5-1.2 1.5-1.2 5-.2 6.5C5.6 18 7 16 7 13.6" />
    <circle cx="18" cy="11.5" r=".6" fill="currentColor" stroke="none" />
  </>),
  book: (<>
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </>),
  waves: (<>
    <path d="M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 13c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 19c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </>),
  palette: (<>
    <path d="M12 22a10 9 0 1 1 10-9 5 5 0 0 1-5 5h-2.3a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8Z" />
    <circle cx="13.5" cy="6.5" r=".6" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="10.5" r=".6" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="12.5" r=".6" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="7.5" r=".6" fill="currentColor" stroke="none" />
  </>),
  flag: (<>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22V3" />
  </>),

  /* ---------- ui ---------- */
  pin: (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  navigation: (<><path d="M3 11l19-9-9 19-2-8-8-2Z" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  users: (<>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" />
  </>),
  star: (<><path d="M12 2.5l2.9 5.9 6.6.9-4.8 4.6 1.1 6.5L12 18.8 6.1 21l1.1-6.5L2.5 9.8l6.6-.9Z" /></>),
  arrowRight: (<><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></>),
  menu: (<><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>),
  heart: (<><path d="M19 14c1.5-1.5 3-3.3 3-5.5A3.5 3.5 0 0 0 12 5 3.5 3.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></>),
  walk: (<><circle cx="13" cy="4" r="2" /><path d="m9 20 1-4 2-2" /><path d="m6 14 3-1 1-3 3 2 3 1" /><path d="m12 8 1 4 3 4" /></>),
  chevronL: (<><path d="m15 18-6-6 6-6" /></>),
  chevronR: (<><path d="m9 18 6-6-6-6" /></>),
  check: (<><path d="M20 6 9 17l-5-5" /></>),
  filter: (<><path d="M3 5h18l-7 8v6l-4-2v-4Z" /></>),
  mapIcon: (<><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v14" /><path d="M15 6v14" /></>),
  ticket: (<><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M13 6v12" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.9 4.9l1.4 1.4" /><path d="M17.7 17.7l1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M4.9 19.1l1.4-1.4" /><path d="M17.7 6.3l1.4-1.4" /></>),
  car: (<><path d="M5 13l1.6-4.4A2 2 0 0 1 8.5 7.3h7a2 2 0 0 1 1.9 1.3L19 13" /><path d="M3 13h18v4a1 1 0 0 1-1 1h-1.2a2 2 0 1 1-3.6 0H8.8a2 2 0 1 1-3.6 0H4a1 1 0 0 1-1-1Z" /></>),
  balloon: (<><path d="M12 13c3 0 5-2.6 5-6s-2-6-5-6-5 2.6-5 6 2 6 5 6Z" /><path d="M12 13v3" /><path d="M10.5 20h3l-1.5-4Z" /></>),
  dog: (<><path d="M11.5 5.5 9 3v4" /><path d="m12.5 5.5 2.5-2.5v4" /><path d="M8 9a4 4 0 0 1 8 0v3l2 2v5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-5l2-2Z" /><path d="M9 21v-3" /><path d="M15 21v-3" /></>),
  duck: (<><circle cx="15.5" cy="6.5" r="2.5" /><path d="M13 6 9.5 5.2" /><path d="M16.5 8.5c2.5 0 4.5 2 4.5 4.5 0 3.3-2.8 5.5-6.5 5.5H8a4 4 0 0 1 0-8h4.5" /></>),
  kite: (<><path d="M12 2 19 9 12 16 5 9Z" /><path d="M12 2v14" /><path d="M5 9h14" /><path d="M12 16q3 3 0 6" /></>),
  icecream: (<><path d="M8 9a4 4 0 1 1 8 0" /><path d="M8.5 9h7l-3 11a.5.5 0 0 1-1 0Z" /><path d="M8 12.5h8" /></>),
  hotdog: (<><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M6 12h12" /></>),
  cart: (<><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M3 4h2.5l2.2 11.5h10L20 7H6.5" /></>),
  lilypad: (<><path d="M12 20a8 8 0 0 1-8-8 8 8 0 0 1 8-8c4 0 6 3 6 6" /><path d="M12 12 18 8" /><circle cx="18" cy="6" r="2.2" /></>),
  fountain: (<><path d="M12 3v3" /><path d="M9 6h6" /><path d="M7 11a5 5 0 0 1 10 0" /><path d="M4 14h16l-1.4 6H5.4Z" /></>),
  swing: (<><path d="M4 4h16" /><path d="M7 4l3 9" /><path d="M17 4l-3 9" /><path d="M9 13h6" /><path d="M10 13v4a2 2 0 0 0 4 0v-4" /></>),
  slide: (<><path d="M4 20 16 7" /><path d="M16 7h4v4" /><path d="M5 13v7" /><path d="M5 13h5" /></>),
  stall: (<><path d="M4 9 6 4h12l2 5" /><path d="M4 9h16v2a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0Z" /><path d="M5 11v9h14v-9" /></>),
  lamp: (<><path d="M9 3h6l1 6H8Z" /><path d="M12 9v11" /><path d="M9 20h6" /></>),
  signpost: (<><path d="M12 2v20" /><path d="M12 5h6l2.5 2.5L18 10h-6Z" /><path d="M12 13H6L3.5 15.5 6 18h6Z" /></>),
  bridge: (<><path d="M2 12c5 0 5-5 10-5s5 5 10 5" /><path d="M2 12v6" /><path d="M22 12v6" /><path d="M8 11.5V16" /><path d="M16 11.5V16" /></>),
  cafe: (<><path d="M4 8h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" /><path d="M7 2.5v2" /><path d="M11 2.5v2" /></>),
  shop: (<><path d="M4 9 5.5 4h13L20 9" /><path d="M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" /><path d="M5 11v9h14v-9" /><path d="M10 20v-5h4v5" /></>),
  toilets: (<><circle cx="7" cy="4.5" r="1.6" /><path d="M5 21v-6H4l1.8-5.2A1.5 1.5 0 0 1 7.2 9h0a1.5 1.5 0 0 1 1.4 1L10 15H9v6Z" /><path d="M14 21V8" /><circle cx="17" cy="4.5" r="1.6" /><path d="M14 8 12.7 12.5h1.6M19.3 12.5h-1.6L17 8" /></>),
  gazebo: (<><path d="M3 9 12 3l9 6Z" /><path d="M5 9v11" /><path d="M19 9v11" /><path d="M5 14h14" /><path d="M5 20h14" /></>),
  statue: (<><circle cx="12" cy="4.5" r="2" /><path d="M12 6.5v6" /><path d="M8 9h8" /><path d="M9 12.5h6" /><rect x="8" y="15" width="8" height="5" rx="1" /></>),
  seesaw: (<><path d="M3 15 21 9" /><path d="M12 12v9" /><path d="M9 21h6" /><circle cx="4" cy="15" r="1" /><circle cx="20" cy="9" r="1" /></>),
  sandpit: (<><rect x="3" y="10" width="18" height="10" rx="1.5" /><path d="M14 10l1.5 7h2L19 10" /><path d="M16 10V7l3-1" /></>),
  roundabout: (<><circle cx="12" cy="13" r="7" /><path d="M12 6V3" /><path d="M12 13 7 9" /><path d="m12 13 5-4" /><path d="M12 13v5" /></>),
  swan: (<><path d="M5 19h8a5 5 0 0 0 1-10" /><path d="M14 9c0-4-3-6-6-6" /><path d="M8 3 5.5 3.5" /></>),
  sheep: (<><circle cx="13" cy="13" r="5.5" /><circle cx="8" cy="11" r="3" /><circle cx="17" cy="10" r="3" /><circle cx="9" cy="16" r="3" /><circle cx="16" cy="16" r="3" /><circle cx="5.5" cy="12" r="2.4" /><path d="M5 12.5 3.5 13" /><path d="M7 18.5 6.5 21M11 19 11 21" /></>),
  train: (<><rect x="3" y="7" width="11" height="9" rx="1.5" /><path d="M14 10h3l3 3v3h-6Z" /><path d="M6 7V4.5h3V7" /><path d="M5 16h14" /><circle cx="7" cy="19" r="1.5" /><circle cx="13" cy="19" r="1.5" /><circle cx="18" cy="19" r="1.3" /></>),
  hill: (<><path d="M2 18q6-11 11 0" /><path d="M10 18q5-9 12 0" /><path d="M2 20h20" /></>),
  mountain: (<><path d="m12 4 8 16H4Z" /><path d="m8.5 13 3-2 3 2" /></>),
  windmill: (<><path d="M10 22h4" /><path d="M11.5 22 12 12" /><path d="M12 12 19 8.5" /><path d="M12 12 15.5 5" /><path d="M12 12 5 15.5" /><path d="M12 12 8.5 19" /><circle cx="12" cy="12" r="1.4" /></>),
  tent: (<><path d="M3 20 12 4l9 16" /><path d="M12 4v16" /><path d="m9 20 3-5 3 5" /></>),
  campfire: (<><path d="M12 3c1.6 2.6 3 4.2 3 7a3 3 0 0 1-6 0c0-1 .5-1.9 1.2-2.6" /><path d="M4 20 20 16" /><path d="M4 16 20 20" /></>),
};

window.Icon = Icon;
window.iconFor = iconFor;
