"use client";

import { create } from "zustand";
import type { Category, WasteItemDef } from "./types";
import { CAPACITY } from "./items";

export type SorterStatus = "booting" | "ready" | "scanning" | "review" | "sorting" | "full";

export interface LogEntry {
  id: number;
  time: string;
  label: string;
  category: Category;
  confidence: number;
  note: string;
  source: "edge" | "human" | "cloud";
}

export interface ReviewRequest {
  itemId: string;
  label: string;
  confidence: number;
  candidates: Category[];
}

export interface Stats {
  total: number;
  assists: number;
  counts: Record<Category, number>;
  fill: Record<Category, number>; // volume units accumulated
  massRecycled: number; // kg
  compost: number; // kg
  co2: number; // kg CO2e avoided (modelled)
}

const EMPTY_STATS: Stats = {
  total: 0,
  assists: 0,
  counts: { organic: 0, recyclable: 0, paper: 0, general: 0, hazard: 0 },
  fill: { organic: 0, recyclable: 0, paper: 0, general: 0, hazard: 0 },
  massRecycled: 0,
  compost: 0,
  co2: 0,
};

const PERSIST_KEY = "sift1.session.v1";

interface SorterState {
  status: SorterStatus;
  statusDetail: string;
  currentItemId: string | null;
  liveConfidence: number | null;
  log: LogEntry[];
  stats: Stats;
  review: ReviewRequest | null;
  autoDemo: boolean;
  xray: boolean;
  sound: boolean;
  bootedAt: number;
  logIdCounter: number;

  setStatus: (status: SorterStatus, detail?: string) => void;
  setFocusedItem: (itemId: string | null) => void;
  setLiveConfidence: (c: number | null) => void;
  setAutoDemo: (v: boolean) => void;
  setXray: (v: boolean) => void;
  setSound: (v: boolean) => void;

  beginScan: (item: WasteItemDef) => void;
  registerSort: (
    item: WasteItemDef,
    category: Category,
    confidence: number,
    source: LogEntry["source"],
    note: string
  ) => void;
  requestReview: (req: ReviewRequest) => void;
  resolveReview: () => void;
  resetSession: () => void;
  hydrate: () => void;
}

function loadPersisted(): { stats: Stats } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { stats?: Partial<Stats> };
    if (!parsed.stats) return null;
    return {
      stats: {
        ...EMPTY_STATS,
        ...parsed.stats,
        counts: { ...EMPTY_STATS.counts, ...(parsed.stats.counts ?? {}) },
        fill: { ...EMPTY_STATS.fill, ...(parsed.stats.fill ?? {}) },
      },
    };
  } catch {
    return null;
  }
}

function persist(stats: Stats) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify({ stats }));
  } catch {
    /* storage unavailable — session-only stats */
  }
}

export const useSorter = create<SorterState>((set, get) => ({
  status: "booting",
  statusDetail: "SIFT OS starting",
  currentItemId: null,
  liveConfidence: null,
  log: [],
  stats: EMPTY_STATS,
  review: null,
  autoDemo: true,
  xray: false,
  sound: false,
  bootedAt: Date.now(),
  logIdCounter: 1,

  setStatus: (status, detail) =>
    set({ status, statusDetail: detail ?? get().statusDetail }),

  setFocusedItem: (itemId) => set({ currentItemId: itemId }),

  setLiveConfidence: (c) => set({ liveConfidence: c }),

  setAutoDemo: (v) => set({ autoDemo: v }),
  setXray: (v) => set({ xray: v }),
  setSound: (v) => set({ sound: v }),

  beginScan: (item) => {
    set({ status: "scanning", statusDetail: item.label, currentItemId: item.id, liveConfidence: null });
  },

  registerSort: (item, category, confidence, source, note) => {
    const { stats, log, logIdCounter } = get();
    const nextFill = { ...stats.fill };
    nextFill[category] = Math.min(CAPACITY[category], nextFill[category] + item.volume);

    const isOverflow = nextFill[category] >= CAPACITY[category];

    const nextStats: Stats = {
      total: stats.total + 1,
      assists: stats.assists + (source === "human" ? 1 : 0),
      counts: { ...stats.counts, [category]: stats.counts[category] + 1 },
      fill: nextFill,
      massRecycled:
        stats.massRecycled + (category === "recyclable" || category === "paper" ? item.mass : 0),
      compost: stats.compost + (category === "organic" ? item.mass : 0),
      co2: stats.co2 + (category === "general" ? 0 : item.co2),
    };

    const entry: LogEntry = {
      id: logIdCounter,
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      label: item.label,
      category,
      confidence,
      note,
      source,
    };

    persist(nextStats);
    set({
      stats: nextStats,
      log: [entry, ...log].slice(0, 9),
      logIdCounter: logIdCounter + 1,
      status: isOverflow ? "full" : "ready",
      statusDetail: isOverflow ? `${CATEGORIES_SHORT[category]} compartment is full — empty me` : "Ready",
      currentItemId: null,
      liveConfidence: null,
    });
  },

  requestReview: (req) =>
    set({ review: req, status: "review", statusDetail: "Needs your confirmation" }),

  resolveReview: () => set({ review: null }),

  resetSession: () => {
    persist(EMPTY_STATS);
    set({ stats: EMPTY_STATS, log: [], status: "ready", statusDetail: "Ready", review: null });
  },

  hydrate: () => {
    const p = loadPersisted();
    if (p) set({ stats: p.stats, bootedAt: Date.now() });
  },
}));

const CATEGORIES_SHORT: Record<Category, string> = {
  organic: "Organic",
  recyclable: "Recyclables",
  paper: "Paper",
  general: "General",
  hazard: "Hazard",
};
