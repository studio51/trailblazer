// data.jsx — content for Little Days Out

const CATEGORIES = [
  { id: "all",      label: "All",              icon: "sparkles", color: "var(--coral)", soft: "var(--coral-soft)" },
  { id: "parks",    label: "Parks & play",     icon: "trees",    color: "var(--leaf)",  soft: "var(--leaf-soft)" },
  { id: "softplay", label: "Soft play",        icon: "blocks",   color: "var(--berry)", soft: "var(--berry-soft)" },
  { id: "museums",  label: "Museums",          icon: "landmark", color: "var(--grape)", soft: "var(--grape-soft)" },
  { id: "classes",  label: "Classes & clubs",  icon: "music",    color: "var(--sky)",   soft: "var(--sky-soft)" },
  { id: "events",   label: "Events & fairs",   icon: "ferris",   color: "var(--sun)",   soft: "var(--sun-soft)" },
  { id: "farms",    label: "Farms & days out", icon: "tractor",  color: "var(--teal)",  soft: "var(--teal-soft)" },
];

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// NOTE: (VR) x/y are % positions over the map stage; kid = one-liner shown in Kids mode, fun = sticker caption
const ACTIVITIES = [
  { id: "treetops", name: "Treetops Adventure Park", cat: "parks", icon: "treePine", x: 19, y: 31, rating: 4.8, reviews: 312,
    price: "Free", distance: "0.6 mi", age: "All ages", hours: "8:00 – dusk, daily",
    where: "Riverside Common, off Maple Lane",
    blurb: "Rope bridges, a hill slide and a proper big-kid climbing frame, all wrapped around a shady picnic lawn. Toddler zone fenced off near the café.",
    tags: ["Picnic spot", "Toilets", "Buggy friendly"], kid: "Giant rope bridges and the biggest slide in town!", fun: "Slide champion" },

  { id: "bounce", name: "Bounce & Burrow Soft Play", cat: "softplay", icon: "blocks", x: 71, y: 18, rating: 4.6, reviews: 188,
    price: "£7 / child", distance: "1.2 mi", age: "0 – 8 yrs", hours: "9:30 – 18:00",
    where: "Unit 4, The Old Mill Yard",
    blurb: "Three storeys of ball pits, tunnels and a separate baby area. Decent coffee and free wifi for the grown-ups who've earned a sit down.",
    tags: ["Indoor", "Café", "Baby area"], kid: "Dive into a mountain of squishy balls!", fun: "Ball-pit explorer" },

  { id: "wonderlab", name: "Wonderlab Science Museum", cat: "museums", icon: "flask", x: 46, y: 47, rating: 4.9, reviews: 524,
    price: "£9 / £24 family", distance: "2.1 mi", age: "4 – 12 yrs", hours: "10:00 – 17:00",
    where: "Cathedral Quarter, Bridge Street",
    blurb: "Hands-on everything: lightning shows, a giant marble run and a dinosaur dig. Kids leave buzzing and you leave slightly smug about all the learning.",
    tags: ["Indoor", "Wet-weather", "Café"], kid: "Make real lightning and dig up a dinosaur!", fun: "Junior scientist" },

  { id: "splashclub", name: "Little Otters Swim Club", cat: "classes", icon: "waves", x: 63, y: 61, rating: 4.7, reviews: 96,
    price: "£12 / class", distance: "1.8 mi", age: "6 mo – 5 yrs", hours: "Sat mornings",
    where: "Eastgate Leisure Centre",
    blurb: "Gentle parent-and-baby swimming with songs, floats and a very warm pool. Small groups, lovely instructors, books up fast.",
    tags: ["Booking needed", "Indoor", "Warm pool"], kid: "Splash, float and sing in the warm pool!", fun: "Little otter" },

  { id: "fair", name: "Riverside Spring Fair", cat: "events", icon: "ferris", x: 50, y: 73, rating: 4.5, reviews: 64,
    price: "Free entry", distance: "0.9 mi", age: "All ages", hours: "Sat–Sun, this weekend",
    where: "The Meadows bandstand",
    blurb: "A weekend of carousel rides, a petting corner, street food and a brass band. Bring wellies if it's been raining — the field gets soft.",
    tags: ["This weekend", "Outdoor", "Food stalls"], kid: "Ride the carousel and meet the animals!", fun: "Carousel rider" },

  { id: "hollow", name: "Honeydew Farm Park", cat: "farms", icon: "tractor", x: 67, y: 35, rating: 4.8, reviews: 271,
    price: "£11 / child", distance: "4.3 mi", age: "1 – 10 yrs", hours: "10:00 – 16:30",
    where: "Honeydew Lane, Ashcombe",
    blurb: "Bottle-feed the lambs, ride the tractor-trailer and lose an afternoon in the giant straw barn. Lambing season runs through spring.",
    tags: ["Outdoor", "Animals", "Tractor rides"], kid: "Feed baby lambs and ride a real tractor!", fun: "Lamb feeder" },

  { id: "library", name: "Storytime at Maple Library", cat: "classes", icon: "book", x: 35, y: 17, rating: 4.9, reviews: 142,
    price: "Free", distance: "0.4 mi", age: "0 – 5 yrs", hours: "Tue & Thu, 10:30",
    where: "Maple Lane Community Library",
    blurb: "Rhymes, puppets and a proper read-aloud, then free play with the toy baskets. The cosiest free hour in town on a wet morning.",
    tags: ["Free", "Indoor", "Drop-in"], kid: "Puppets, rhymes and a brand-new story!", fun: "Story listener" },

  { id: "boating", name: "Willow Lake Boating", cat: "parks", icon: "sailboat", x: 57, y: 84, rating: 4.4, reviews: 53,
    price: "£6 / 30 min", distance: "1.5 mi", age: "3+ yrs", hours: "10:00 – 17:00",
    where: "Willow Lake, North Park",
    blurb: "Pedalos and rowing boats on a calm little lake, plus ducks that expect to be fed. Ice cream hut open when the sun's out.",
    tags: ["Outdoor", "Ice cream", "Ducks"], kid: "Captain your own boat and feed the ducks!", fun: "Boat captain" },

  { id: "dino", name: "Dino Dig Adventure Golf", cat: "events", icon: "flag", x: 32, y: 25, rating: 4.6, reviews: 119,
    price: "£8 / child", distance: "2.6 mi", age: "3+ yrs", hours: "9:00 – 18:00",
    where: "Quarry Road, Westfield",
    blurb: "18 holes of jungle-and-dinosaur crazy golf with waterfalls and a roaring T-rex. Just the right amount of silly for a sunny afternoon.",
    tags: ["Outdoor", "Crazy golf", "Snacks"], kid: "Putt past waterfalls and a roaring T-rex!", fun: "Hole-in-one hero" },

  { id: "makers", name: "Mini Makers Craft Club", cat: "classes", icon: "palette", x: 82, y: 48, rating: 4.8, reviews: 74,
    price: "£9 / session", distance: "1.1 mi", age: "3 – 9 yrs", hours: "Wed & Sat",
    where: "The Yard, Carver Street",
    blurb: "Get gloriously messy with clay, paint and glitter. Aprons provided, mess stays at theirs — you go home with a masterpiece and clean hands.",
    tags: ["Indoor", "Messy play", "Booking needed"], kid: "Get messy with paint, clay and glitter!", fun: "Master maker" },

  { id: "aquarium", name: "Blue Reef Aquarium", cat: "museums", icon: "fish", x: 84, y: 72, rating: 4.7, reviews: 388,
    price: "£10 / £30 family", distance: "3.4 mi", age: "All ages", hours: "10:00 – 17:00",
    where: "Harbourside, Quay One",
    blurb: "A walk-through ocean tunnel with sharks overhead, a rockpool you can dip your hands in, and daily feeding talks the kids will quiz you on for weeks.",
    tags: ["Indoor", "Wet-weather", "Sharks"], kid: "Walk under real sharks in the ocean tunnel!", fun: "Shark spotter" },

  { id: "splashpark", name: "Sunnyfields Splash Park", cat: "parks", icon: "droplets", x: 90, y: 88, rating: 4.7, reviews: 156,
    price: "Free", distance: "1.0 mi", age: "All ages", hours: "10:00 – 18:00, summer",
    where: "Sunnyfields Recreation Ground",
    blurb: "Jets, fountains and tipping buckets on a soft splash pad — bring towels and a change of clothes, because they will get soaked. Free all summer.",
    tags: ["Free", "Outdoor", "Summer"], kid: "Run through the fountains and get soaked!", fun: "Splash dasher" },

  { id: "treehouse", name: "The Treehouse Café Play", cat: "softplay", icon: "trees", x: 90, y: 22, rating: 4.5, reviews: 91,
    price: "£5 / child", distance: "0.8 mi", age: "0 – 6 yrs", hours: "9:00 – 17:00",
    where: "Garden Centre, Orchard Way",
    blurb: "A little wooden play barn tucked inside a garden centre, with proper cake for grown-ups and a calm under-2s corner. Lovely on a drizzly day.",
    tags: ["Indoor", "Café", "Calm"], kid: "Climb the wooden treehouse and have cake!", fun: "Treehouse climber" },
];

const STEPS = [
  { icon: "navigation", color: "var(--leaf)", soft: "var(--leaf-soft)", title: "Tell us where you are", body: "Pop in your postcode or tap “near me”. We’ll find the good stuff within pram-pushing or short-drive distance." },
  { icon: "filter", color: "var(--sky)", soft: "var(--sky-soft)", title: "Filter by age & mood", body: "Rainy day? Toddler in tow? Two hours to fill? Narrow it down by age, weather, price and how far you fancy going." },
  { icon: "heart", color: "var(--coral)", soft: "var(--coral-soft)", title: "Save it & go", body: "Build a little plan, save your favourites and check opening times — then get out the door and make a day of it." },
];

const PARENTS = [
  { name: "Sophie R.", meta: "Mum of 2 · Leeds", quote: "Saturdays used to be a panic of “what do we even do today?”. Now I check the map over breakfast and we’ve got a plan before the toast’s cold.", color: "var(--berry)" },
  { name: "Marcus T.", meta: "Dad of 2 · Bristol", quote: "Honestly a lifesaver on my weekends with the girls. The free-things filter alone has saved me a small fortune — and they have a brilliant time.", color: "var(--sky)" },
  { name: "Priya & Dev", meta: "Parents of 3 · Reading", quote: "We found a farm park ten minutes away that we’d never heard of. The age filter means no more turning up to something the baby’s too little for.", color: "var(--leaf)" },
];

window.LDA_DATA = { CATEGORIES, CAT, ACTIVITIES, STEPS, PARENTS };
