export type Category = "organic" | "recyclable" | "paper" | "general" | "hazard";

export interface CategoryMeta {
  id: Category;
  label: string;
  short: string;
  color: string;
  description: string;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  organic: {
    id: "organic",
    label: "Organic / Compost",
    short: "ORGANIC",
    color: "#9bbf72",
    description: "Food scraps and garden waste — sealed, vented and deodorised for clean composting.",
  },
  recyclable: {
    id: "recyclable",
    label: "Recyclables",
    short: "RECYCLABLE",
    color: "#e3b341",
    description: "Clean plastics, metals and glass — kept dry and uncontaminated for high-value recovery.",
  },
  paper: {
    id: "paper",
    label: "Paper & Cardboard",
    short: "PAPER",
    color: "#c9794f",
    description: "Fibre stream — kept separate so grease and moisture never ruin the batch.",
  },
  general: {
    id: "general",
    label: "General / Landfill",
    short: "GENERAL",
    color: "#9a968a",
    description: "Multi-material and non-recoverable items — the last resort, not the default.",
  },
  hazard: {
    id: "hazard",
    label: "Hazard Drawer",
    short: "HAZARD",
    color: "#b26e92",
    description: "Batteries and e-waste quarantined in a dedicated drawer — never crushed, never mixed.",
  },
};

export const SORTED_CATEGORIES: Category[] = ["organic", "recyclable", "paper", "general"];

export type ItemSpecial = "review" | "contamination" | "none";

export interface WasteItemDef {
  id: string;
  label: string;
  material: string;
  category: Category;
  /** Procedural 3D build key */
  shape:
    | "banana"
    | "apple"
    | "bottle"
    | "can"
    | "jar"
    | "newspaper"
    | "cardboard"
    | "chipbag"
    | "cup"
    | "battery"
    | "phone";
  /** relative volume used for fill simulation (litres-ish) */
  volume: number;
  /** estimated mass kg */
  mass: number;
  /** kg CO2e avoided if diverted from landfill (modelled) */
  co2: number;
  /** base classification confidence 0-1 */
  confidence: number;
  /** special handling behaviour */
  special: ItemSpecial;
  /** human review options (when special === review) */
  candidates?: Category[];
  /** one-line note shown in the decision log */
  note: string;
  /** small tag shown in the tray */
  tag: string;
}

/** Capacities in "item-volume units" per compartment — tuned for the demo */
export const CAPACITY: Record<Category, number> = {
  organic: 14,
  recyclable: 16,
  paper: 12,
  general: 12,
  hazard: 6,
};

export const ITEMS: WasteItemDef[] = [
  {
    id: "banana-peel",
    label: "Banana peel",
    material: "Food waste · organic",
    category: "organic",
    shape: "banana",
    volume: 1,
    mass: 0.12,
    co2: 0.05,
    confidence: 0.985,
    special: "none",
    note: "Compost stream — rich in potassium, breaks down in ~5 weeks.",
    tag: "kitchen",
  },
  {
    id: "apple-core",
    label: "Apple core",
    material: "Food waste · organic",
    category: "organic",
    shape: "apple",
    volume: 0.8,
    mass: 0.09,
    co2: 0.04,
    confidence: 0.978,
    special: "none",
    note: "Compost stream — seeds screened out at the processing facility.",
    tag: "kitchen",
  },
  {
    id: "plastic-bottle",
    label: "PET bottle",
    material: "Plastic · PET #1",
    category: "recyclable",
    shape: "bottle",
    volume: 1.4,
    mass: 0.045,
    co2: 0.08,
    confidence: 0.991,
    special: "none",
    note: "Flake-grade PET detected — cap and ring separated automatically.",
    tag: "packaging",
  },
  {
    id: "aluminum-can",
    label: "Aluminium can",
    material: "Metal · Al",
    category: "recyclable",
    shape: "can",
    volume: 0.7,
    mass: 0.015,
    co2: 0.15,
    confidence: 0.994,
    special: "none",
    note: "Eddy-current signature confirms aluminium — infinitely recyclable.",
    tag: "beverage",
  },
  {
    id: "glass-jar",
    label: "Glass jar",
    material: "Glass · clear",
    category: "recyclable",
    shape: "jar",
    volume: 1.6,
    mass: 0.35,
    co2: 0.1,
    confidence: 0.962,
    special: "none",
    note: "Clear glass routed to colour-sorted stream — no crushing, lid kept.",
    tag: "kitchen",
  },
  {
    id: "newspaper",
    label: "Newspaper",
    material: "Paper · newsprint",
    category: "paper",
    shape: "newspaper",
    volume: 1.1,
    mass: 0.2,
    co2: 0.06,
    confidence: 0.988,
    special: "none",
    note: "Dry fibre — de-inking quality confirmed, high pulp value.",
    tag: "living room",
  },
  {
    id: "cardboard-box",
    label: "Cardboard box",
    material: "Paper · corrugated",
    category: "paper",
    shape: "cardboard",
    volume: 2.2,
    mass: 0.18,
    co2: 0.07,
    confidence: 0.972,
    special: "none",
    note: "Corrugated fibreboard — tape flagged, box flattened for the bin.",
    tag: "delivery",
  },
  {
    id: "chip-bag",
    label: "Chip bag",
    material: "Mixed · plastic + foil",
    category: "general",
    shape: "chipbag",
    volume: 0.9,
    mass: 0.01,
    co2: 0,
    confidence: 0.58,
    special: "review",
    candidates: ["general", "recyclable"],
    note: "Multi-layer laminate — not recyclable curbside. Routed to General.",
    tag: "snacks",
  },
  {
    id: "coffee-cup",
    label: "Coffee cup",
    material: "Paper + PE lining · liquid",
    category: "general",
    shape: "cup",
    volume: 1.2,
    mass: 0.02,
    co2: 0,
    confidence: 0.947,
    special: "contamination",
    note: "Residual liquid + PE lining detected — diverted to General to protect recycling.",
    tag: "cafe",
  },
  {
    id: "aa-battery",
    label: "AA battery",
    material: "Hazardous · cell",
    category: "hazard",
    shape: "battery",
    volume: 0.2,
    mass: 0.023,
    co2: 0.02,
    confidence: 0.996,
    special: "none",
    note: "Quarantined in hazard drawer — heavy metals kept out of landfill.",
    tag: "household",
  },
  {
    id: "old-phone",
    label: "Old smartphone",
    material: "E-waste · Li-ion",
    category: "hazard",
    shape: "phone",
    volume: 0.4,
    mass: 0.17,
    co2: 0.55,
    confidence: 0.996,
    special: "none",
    note: "E-waste quarantined — battery removed, board sent for urban mining.",
    tag: "study",
  },
];
