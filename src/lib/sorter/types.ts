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
