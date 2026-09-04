/** Modified-container catalog for The Yard. No invented prices. */

export type ModifiedCategory = {
  id: string;
  title: string;
  kicker: string;
  help: string;
};

export type ModifiedItem = {
  id: string;
  category: string;
  name: string;
  spec: string;
  product?: "apex" | "yard-mod";
};

export type ModifiedLine = {
  id: string;
  qty?: number | string;
  note?: string;
};

export type ModifiedDraft = {
  size?: string;
  height?: string;
  grade?: string;
  boxQty?: number | string;
  use?: string;
  zip?: string;
  apexPiles?: number | string;
  apexNote?: string;
  items?: ModifiedLine[];
  agreedAmount?: string;
  notes?: string;
};

export const MODIFIED_USES = [
  { v: "jobsite", l: "Jobsite / storage" },
  { v: "shop", l: "Shop / farm" },
  { v: "home", l: "Home / studio" },
  { v: "airbnb", l: "Airbnb / guest" },
  { v: "concession", l: "Concession" },
  { v: "office", l: "Office" },
] as const;

export const MODIFIED_CATEGORIES: ModifiedCategory[] = [
  {
    id: "foundation",
    title: "Foundation",
    kicker: "Apex",
    help: "CB Apex helical pylons are the house foundation. Pile count comes from the land walk. Do not guess a number.",
  },
  {
    id: "doors",
    title: "Doors",
    kicker: "Openings",
    help: "Personnel and cargo openings we cut or keep. Side door OS 2D, OS 4D, and Full open are different boxes — do not mix them.",
  },
  {
    id: "rollup",
    title: "Roll-up doors",
    kicker: "Openings",
    help: "Commercial roll-up cut into the side or end. Confirm the opening before the cut.",
  },
  {
    id: "windows",
    title: "Windows",
    kicker: "Openings",
    help: "Cutouts we frame into the wall. Egress is for occupied rooms.",
  },
  {
    id: "framing",
    title: "Framing",
    kicker: "Shell",
    help: "Steel or wood that makes the box a room. Floor first if they will live or work in it.",
  },
  {
    id: "insulation",
    title: "Insulation",
    kicker: "Shell",
    help: "Spray, batt, or rigid. Vapor barrier when the climate needs it.",
  },
  {
    id: "electrical",
    title: "Electrical",
    kicker: "Power",
    help: "Panel, shore power, outlets, lights. Permit and load belong to the site, not a guess.",
  },
  {
    id: "climate",
    title: "Climate and vents",
    kicker: "Air",
    help: "Mini-split openings, exhaust, and louvers so the box can breathe.",
  },
  {
    id: "finish",
    title: "Finish and extras",
    kicker: "Done",
    help: "Paint, interior skin, locks, plumbing rough-in. Finish-out after the box is set.",
  },
];

export const MODIFIED_ITEMS: ModifiedItem[] = [
  {
    id: "apex-helical",
    category: "foundation",
    name: "CB Apex foundation — helical pylons",
    spec: "Helical pylons for container loads. Installed before the box is set. No concrete slab delay. Resists frost heave and wind uplift.",
    product: "apex",
  },
  {
    id: "apex-hardware",
    category: "foundation",
    name: "CB Apex pile-to-box hardware",
    spec: "Hardware that ties the container to the Apex piles. Count follows the pile layout from the land walk.",
    product: "apex",
  },
  {
    id: "foundation-gravel",
    category: "foundation",
    name: "Gravel pad only (no Apex)",
    spec: "Site pad without helical piles. Not the Apex product.",
    product: "yard-mod",
  },
  {
    id: "foundation-slab",
    category: "foundation",
    name: "Concrete slab (not Apex)",
    spec: "Forms and slab wait. Slower than Apex. Only if the land requires it.",
    product: "yard-mod",
  },
  {
    id: "door-36-steel",
    category: "doors",
    name: "36 in steel personnel door",
    spec: "Walk-through man door cut into the side or end. Lockset on the door.",
    product: "yard-mod",
  },
  {
    id: "door-36-crash",
    category: "doors",
    name: "36 in personnel door with crash bar",
    spec: "Egress man door with panic hardware. For occupied shops and public rooms.",
    product: "yard-mod",
  },
  {
    id: "door-double-man",
    category: "doors",
    name: "Double personnel doors",
    spec: "Paired walk-through doors for a wider opening. Not a cargo double-door box.",
    product: "yard-mod",
  },
  {
    id: "door-keep-cargo",
    category: "doors",
    name: "Keep factory cargo doors",
    spec: "Leave the original end cargo doors working. Common on shops and storage.",
    product: "yard-mod",
  },
  {
    id: "door-weld-cargo",
    category: "doors",
    name: "Weld cargo doors shut",
    spec: "Seal the factory end doors when the opening moves to a man door or roll-up.",
    product: "yard-mod",
  },
  {
    id: "rollup-8x8",
    category: "rollup",
    name: "Roll-up door 8×8",
    spec: "Commercial roll-up, 8 ft wide by 8 ft tall. Cut into the side or end.",
    product: "yard-mod",
  },
  {
    id: "rollup-8x10",
    category: "rollup",
    name: "Roll-up door 8×10",
    spec: "Commercial roll-up, 8 ft wide by 10 ft tall. High-cube height.",
    product: "yard-mod",
  },
  {
    id: "rollup-10x10",
    category: "rollup",
    name: "Roll-up door 10×10",
    spec: "Commercial roll-up, 10 ft wide by 10 ft tall. Confirm wall length before the cut.",
    product: "yard-mod",
  },
  {
    id: "rollup-insulated",
    category: "rollup",
    name: "Insulated roll-up door",
    spec: "Insulated curtain on the roll-up opening. Size still has to be picked.",
    product: "yard-mod",
  },
  {
    id: "win-slider",
    category: "windows",
    name: "Sliding window",
    spec: "Horizontal slider cut into the wall. Typical shop and studio light.",
    product: "yard-mod",
  },
  {
    id: "win-fixed",
    category: "windows",
    name: "Fixed window",
    spec: "Picture / fixed glass. No open vent.",
    product: "yard-mod",
  },
  {
    id: "win-egress",
    category: "windows",
    name: "Egress window",
    spec: "Egress-sized opening for an occupied room. Confirm the local code on site.",
    product: "yard-mod",
  },
  {
    id: "win-concession",
    category: "windows",
    name: "Concession window",
    spec: "Service opening with a shelf. For food and retail boxes.",
    product: "yard-mod",
  },
  {
    id: "win-transom",
    category: "windows",
    name: "High transom / clerestory",
    spec: "High glass for light without a low cut. High-cube boxes only.",
    product: "yard-mod",
  },
  {
    id: "frame-steel",
    category: "framing",
    name: "Steel stud framing",
    spec: "Steel stud walls inside the box. Common for shops and offices.",
    product: "yard-mod",
  },
  {
    id: "frame-wood",
    category: "framing",
    name: "Wood framing",
    spec: "Wood stud walls. Used when the finish is residential.",
    product: "yard-mod",
  },
  {
    id: "frame-floor",
    category: "framing",
    name: "Floor framing and subfloor",
    spec: "Sleepers and a walking floor over the container floor.",
    product: "yard-mod",
  },
  {
    id: "frame-partition",
    category: "framing",
    name: "Interior partition walls",
    spec: "Split the box into rooms. Count is rooms, not a guess at studs.",
    product: "yard-mod",
  },
  {
    id: "frame-header",
    category: "framing",
    name: "Opening headers and jambs",
    spec: "Steel or wood headers around doors, roll-ups, and windows.",
    product: "yard-mod",
  },
  {
    id: "insul-spray",
    category: "insulation",
    name: "Closed-cell spray foam",
    spec: "Spray foam on walls and ceiling. Seals and insulates in one pass.",
    product: "yard-mod",
  },
  {
    id: "insul-batt",
    category: "insulation",
    name: "Batt / fiberglass insulation",
    spec: "Batts in framed cavities. Needs a vapor plan in cold or wet sites.",
    product: "yard-mod",
  },
  {
    id: "insul-rigid",
    category: "insulation",
    name: "Rigid foam board",
    spec: "Rigid board on walls or under the floor. Cut to the corrugation.",
    product: "yard-mod",
  },
  {
    id: "insul-vapor",
    category: "insulation",
    name: "Vapor barrier",
    spec: "Vapor control layer. Pair with the insulation that was picked.",
    product: "yard-mod",
  },
  {
    id: "insul-floor",
    category: "insulation",
    name: "Floor insulation",
    spec: "Insulation under the walking floor. For occupied boxes on Apex or a pad.",
    product: "yard-mod",
  },
  {
    id: "elec-100a",
    category: "electrical",
    name: "100A panel",
    spec: "Interior load center. Site service still has to be real.",
    product: "yard-mod",
  },
  {
    id: "elec-200a",
    category: "electrical",
    name: "200A panel",
    spec: "Larger interior load center for shops and homes.",
    product: "yard-mod",
  },
  {
    id: "elec-shore",
    category: "electrical",
    name: "Shore-power inlet",
    spec: "Exterior inlet so the box can plug into site power.",
    product: "yard-mod",
  },
  {
    id: "elec-outlets",
    category: "electrical",
    name: "Interior outlets",
    spec: "Duplex outlets on the framed walls. Count is outlets, not a dollar.",
    product: "yard-mod",
  },
  {
    id: "elec-gfci",
    category: "electrical",
    name: "Exterior GFCI outlet",
    spec: "Weatherproof exterior receptacle.",
    product: "yard-mod",
  },
  {
    id: "elec-led",
    category: "electrical",
    name: "LED interior lighting",
    spec: "Interior LED fixtures. Count is fixtures.",
    product: "yard-mod",
  },
  {
    id: "elec-switch",
    category: "electrical",
    name: "Switches and plates",
    spec: "Switch legs for lights. Follows the lighting layout.",
    product: "yard-mod",
  },
  {
    id: "hvac-minisplit",
    category: "climate",
    name: "Mini-split opening and mount",
    spec: "Wall sleeve and mount for a mini-split. The unit itself is scoped on the proposal.",
    product: "yard-mod",
  },
  {
    id: "vent-louver",
    category: "climate",
    name: "Louver vents",
    spec: "Passive wall louvers for storage and shops.",
    product: "yard-mod",
  },
  {
    id: "vent-exhaust",
    category: "climate",
    name: "Exhaust fan",
    spec: "Powered exhaust for shops, restrooms, or concession heat.",
    product: "yard-mod",
  },
  {
    id: "vent-ridge",
    category: "climate",
    name: "Roof / ridge vent",
    spec: "Roof vent so heat can leave a closed box.",
    product: "yard-mod",
  },
  {
    id: "finish-paint",
    category: "finish",
    name: "Exterior rust treatment and paint",
    spec: "Prep and paint the exterior after cuts are welded.",
    product: "yard-mod",
  },
  {
    id: "finish-interior",
    category: "finish",
    name: "Interior wall finish",
    spec: "Interior skin over framing — plywood, drywall, or liner.",
    product: "yard-mod",
  },
  {
    id: "finish-lock",
    category: "finish",
    name: "Lock box / hasp / upgraded lockset",
    spec: "Lock box, hasp, or upgraded lockset on the openings.",
    product: "yard-mod",
  },
  {
    id: "finish-plumb",
    category: "finish",
    name: "Plumbing rough-in",
    spec: "Water and drain rough-in. Fixtures are scoped on the proposal after the land walk.",
    product: "yard-mod",
  },
];

const ITEM_BY_ID = new Map(MODIFIED_ITEMS.map((item) => [item.id, item]));

function str(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function qtyOf(value: unknown): string {
  const raw = str(value);
  if (!raw) return "";
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return String(n);
  return raw;
}

export function findModifiedItem(id: string): ModifiedItem | null {
  return ITEM_BY_ID.get(str(id)) || null;
}

export function itemsInCategory(category: string): ModifiedItem[] {
  return MODIFIED_ITEMS.filter((item) => item.category === category);
}

export function readModifiedDraft(body: Record<string, unknown>): ModifiedDraft {
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items: ModifiedLine[] = [];
  for (const row of rawItems) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = str(rec.id);
    if (!findModifiedItem(id)) continue;
    items.push({ id, qty: qtyOf(rec.qty), note: str(rec.note) });
  }
  return {
    size: str(body.size),
    height: str(body.height),
    grade: str(body.grade),
    boxQty: qtyOf(body.boxQty),
    use: str(body.use),
    zip: str(body.zip).replace(/\D/g, "").slice(0, 5),
    apexPiles: qtyOf(body.apexPiles),
    apexNote: str(body.apexNote),
    items,
    agreedAmount: str(body.agreedAmount),
    notes: str(body.notes),
  };
}

export function boxLabel(draft: ModifiedDraft): string {
  const size = str(draft.size);
  const height = str(draft.height);
  const grade = str(draft.grade);
  const bits = [size ? size + " ft" : "", height === "HC" ? "high cube" : height === "DC" ? "standard / DC" : height, grade].filter(Boolean);
  return bits.join(" ");
}

export function buildModifiedSpec(draft: ModifiedDraft): {
  ok: boolean;
  error?: string;
  title: string;
  text: string;
  lines: string[];
  itemCount: number;
  hasApex: boolean;
} {
  const lines: string[] = [];
  const box = boxLabel(draft);
  const qty = qtyOf(draft.boxQty);
  if (box || qty) {
    lines.push("Base box: " + (qty && qty !== "1" ? qty + " × " : "") + (box || "size not picked"));
  }
  const use = MODIFIED_USES.find((row) => row.v === draft.use);
  if (use) lines.push("Use: " + use.l);
  if (draft.zip) lines.push("Site ZIP: " + draft.zip);

  let hasApex = false;
  const picked = Array.isArray(draft.items) ? draft.items : [];
  for (const line of picked) {
    const item = findModifiedItem(line.id);
    if (!item) continue;
    if (item.product === "apex") hasApex = true;
    const count = qtyOf(line.qty);
    const extra = str(line.note);
    let row = item.name;
    if (count && count !== "1") row += " × " + count;
    if (item.id === "apex-helical" && qtyOf(draft.apexPiles)) {
      row += " — " + qtyOf(draft.apexPiles) + " pylons from the land walk";
    }
    if (item.id === "apex-helical" && str(draft.apexNote)) {
      row += " (" + str(draft.apexNote) + ")";
    }
    if (extra) row += " — " + extra;
    lines.push(row);
  }

  if (str(draft.notes)) lines.push("Notes: " + str(draft.notes));
  const agreed = str(draft.agreedAmount).replace(/[$,]/g, "");
  if (agreed) {
    const n = Number(agreed);
    if (Number.isFinite(n) && n > 0) lines.push("Agreed amount (typed, not invented): " + agreed);
  }

  if (!lines.length) {
    return {
      ok: false,
      error: "Pick the box or at least one modification first.",
      title: "",
      text: "",
      lines: [],
      itemCount: 0,
      hasApex: false,
    };
  }

  const title = hasApex
    ? (box ? "Modified " + box + " on CB Apex" : "Modified container on CB Apex")
    : (box ? "Modified " + box : "Modified container");
  return {
    ok: true,
    title,
    text: [title, ...lines].join("\n"),
    lines,
    itemCount: picked.filter((row) => findModifiedItem(row.id)).length,
    hasApex,
  };
}
