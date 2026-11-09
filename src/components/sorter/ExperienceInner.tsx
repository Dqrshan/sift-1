"use client";

import { useEffect, useRef, useState } from "react";
import { SorterScene } from "@/lib/sorter/scene";
import { sceneRef } from "@/lib/sorter/sceneRef";
import { useSorter } from "@/lib/sorter/store";
import { sorterAudio } from "@/lib/sorter/audio";
import { ITEMS, CAPACITY } from "@/lib/sorter/items";
import { CATEGORIES, SORTED_CATEGORIES, type Category, type WasteItemDef } from "@/lib/sorter/types";

const STATUS_META: Record<string, { label: string; color: string }> = {
  booting: { label: "BOOTING", color: "#9a968a" },
  ready: { label: "READY", color: "#d7f171" },
  scanning: { label: "SCANNING", color: "#d7f171" },
  review: { label: "NEEDS REVIEW", color: "#e3b341" },
  sorting: { label: "SORTING", color: "#d7f171" },
  full: { label: "COMPARTMENT FULL", color: "#c9794f" },
};

type CloudAssist =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; category: Category; reason: string }
  | { state: "error" };

export default function ExperienceInner() {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const feedHostRef = useRef<HTMLDivElement>(null);

  const status = useSorter((s) => s.status);
  const statusDetail = useSorter((s) => s.statusDetail);
  const log = useSorter((s) => s.log);
  const stats = useSorter((s) => s.stats);
  const review = useSorter((s) => s.review);
  const liveConfidence = useSorter((s) => s.liveConfidence);
  const autoDemo = useSorter((s) => s.autoDemo);
  const xray = useSorter((s) => s.xray);
  const sound = useSorter((s) => s.sound);

  const setAutoDemo = useSorter((s) => s.setAutoDemo);
  const setXray = useSorter((s) => s.setXray);
  const setSound = useSorter((s) => s.setSound);
  const hydrate = useSorter((s) => s.hydrate);
  const resetSession = useSorter((s) => s.resetSession);
  const currentItemId = useSorter((s) => s.currentItemId);

  const [cloudRecord, setCloudRecord] = useState<{ reviewId: string; result: CloudAssist }>({
    reviewId: "",
    result: { state: "idle" },
  });
  const cloud: CloudAssist =
    review && cloudRecord.reviewId === review.itemId ? cloudRecord.result : { state: "loading" };

  /* ——— scene lifecycle ——— */
  useEffect(() => {
    hydrate();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      useSorter.getState().setAutoDemo(false);
    }
    if (!mountRef.current) return;
    (window as unknown as { __siftStore?: unknown }).__siftStore = useSorter;
    (window as unknown as { __siftSceneRef?: unknown }).__siftSceneRef = sceneRef;
    (window as unknown as { __siftItems?: unknown }).__siftItems = ITEMS;
    let scene: SorterScene | null = null;
    try {
      scene = new SorterScene();
      scene.mount(mountRef.current, feedHostRef.current ?? undefined);
      if (overlayRef.current) scene.attachFeed(overlayRef.current);
      scene.setFeedVisible(window.innerWidth >= 1024);
      sceneRef.current = scene;
    } catch (err) {
      console.error("WebGL init failed", err);
    }
    const onResize = () => scene?.setFeedVisible(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [hydrate]);

  /* ——— sound toggle ——— */
  useEffect(() => {
    sorterAudio.setEnabled(sound);
  }, [sound]);

  /* ——— cloud assist on review ——— */
  useEffect(() => {
    if (!review) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: review.label, candidates: review.candidates }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { category?: Category; reason?: string }) => {
        if (cancelled) return;
        if (d.category && review.candidates?.includes(d.category)) {
          setCloudRecord({
            reviewId: review.itemId,
            result: { state: "done", category: d.category, reason: d.reason ?? "" },
          });
        } else {
          setCloudRecord({ reviewId: review.itemId, result: { state: "error" } });
        }
      })
      .catch(() => {
        if (!cancelled) setCloudRecord({ reviewId: review.itemId, result: { state: "error" } });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [review]);

  const choose = (category: Category) => {
    sceneRef.current?.resolveReview(category);
  };

  const toss = (def: WasteItemDef) => {
    sceneRef.current?.toss(def);
  };

  const resetAll = () => {
    resetSession();
    sceneRef.current?.clearPiles();
  };

  const statusMeta = STATUS_META[status] ?? STATUS_META.ready;
  const accuracy = stats.total > 0 ? ((stats.total - stats.assists) / stats.total) * 100 : 100;
  const scanning = status === "scanning" || status === "review";

  const focusItem = ITEMS.find((i) => i.id === currentItemId);

  return (
    <section
      id="demo"
      aria-label="Interactive 3D demonstration of the SIFT·1 smart dustbin"
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-ink text-cream grain"
    >
      {/* 3D canvas */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 42%, rgba(215,241,113,0.07), transparent 55%), radial-gradient(ellipse 140% 120% at 50% 50%, transparent 55%, rgba(13,17,13,0.55) 100%)",
        }}
      />

      {/* ————— top bar ————— */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 sm:p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-xl tracking-tight sm:text-2xl">SIFT·1</span>
            <span className="eyebrow rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 text-[10px] text-lime">
              live demo
            </span>
          </div>
          <p className="mt-1 hidden max-w-[240px] text-[11px] leading-relaxed text-cream/50 sm:block">
            The AI sorting companion for the modern home — drag to orbit, scroll to zoom.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="panel flex items-center gap-2 px-3 py-2">
            <span
              className="status-dot inline-block h-2 w-2 rounded-full"
              style={{ background: statusMeta.color, boxShadow: `0 0 10px ${statusMeta.color}` }}
            />
            <span className="font-data text-[10px] tracking-[0.14em]" style={{ color: statusMeta.color }}>
              {statusMeta.label}
            </span>
            <span className="hidden font-data text-[10px] text-cream/40 md:inline">
              · {statusDetail.toUpperCase().slice(0, 22)}
            </span>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
            <ToggleChip active={autoDemo} onClick={() => setAutoDemo(!autoDemo)} label="AUTO" />
            <ToggleChip active={xray} onClick={() => setXray(!xray)} label="X-RAY" />
            <ToggleChip active={sound} onClick={() => setSound(!sound)} label="SOUND" />
            <button
              onClick={resetAll}
              className="rounded-full border border-cream/15 px-3 py-1.5 font-data text-[10px] tracking-[0.14em] text-cream/60 transition-colors hover:border-cream/40 hover:text-cream"
              title="Reset session stats"
            >
              RESET
            </button>
          </div>
        </div>
      </header>

      {/* ————— left column ————— */}
      <div className="pointer-events-none absolute left-4 top-24 z-10 hidden w-[264px] flex-col gap-3 lg:flex xl:left-6">
        {/* AI vision */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-cream/10 px-3 py-2">
            <span className="eyebrow text-cream/70">AI vision</span>
            <span className="font-data text-[9px] text-lime/70">SIFT-V3</span>
          </div>
          <div className="relative m-2.5 aspect-[8/5] overflow-hidden rounded-lg border border-cream/10 bg-ink">
            <div ref={feedHostRef} className="absolute inset-0" aria-hidden />
            <canvas
              ref={overlayRef}
              width={288}
              height={180}
              className="absolute inset-0 block h-full w-full"
              aria-label="Simulated AI camera feed of the item being scanned"
            />
            {scanning && (
              <div className="scanline pointer-events-none absolute left-0 h-[2px] w-full bg-lime/70" />
            )}
          </div>
          <dl className="space-y-1.5 px-3 pb-3 font-data text-[10px]">
            <VisionRow k="OBJECT" v={focusItem ? focusItem.label : "—"} />
            <VisionRow k="MATERIAL" v={focusItem ? focusItem.material : "—"} />
            <VisionRow
              k="CONFIDENCE"
              v={
                focusItem
                  ? `${((liveConfidence ?? focusItem.confidence) * 100).toFixed(1)}%`
                  : "—"
              }
              accent
            />
            <VisionRow
              k="CONTAMINATION"
              v={
                focusItem?.special === "contamination"
                  ? "liquid detected"
                  : focusItem
                    ? "clear"
                    : "—"
              }
            />
          </dl>
        </div>

        {/* decision log */}
        <div className="panel flex max-h-[240px] flex-col overflow-hidden">
          <div className="border-b border-cream/10 px-3 py-2">
            <span className="eyebrow text-cream/70">Decision log</span>
          </div>
          <div className="slim-scroll flex-1 space-y-2 overflow-y-auto p-2.5">
            {log.length === 0 && (
              <p className="px-1 py-2 font-data text-[10px] text-cream/35">
                Waiting for the first item…
              </p>
            )}
            {log.map((e) => (
              <div key={e.id} className="rise-in rounded-lg border border-cream/8 bg-cream/4 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cream/90">
                    <i
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: CATEGORIES[e.category].color }}
                    />
                    {e.label}
                  </span>
                  <span className="font-data text-[9px] text-cream/40">{e.time}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 font-data text-[9px]">
                  <span style={{ color: CATEGORIES[e.category].color }}>
                    {CATEGORIES[e.category].short}
                  </span>
                  <span className="text-cream/40">{(e.confidence * 100).toFixed(1)}%</span>
                  <span
                    className="rounded-full px-1.5 py-px text-[8px] tracking-wider"
                    style={{
                      color:
                        e.source === "human" ? "#e3b341" : e.source === "cloud" ? "#b26e92" : "#9bbf72",
                      background: "rgba(243,238,226,0.06)",
                    }}
                  >
                    {e.source.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ————— right column ————— */}
      <div className="pointer-events-none absolute right-4 top-24 z-10 hidden w-[264px] flex-col gap-3 lg:flex xl:right-6">
        {/* compartments */}
        <div className="panel p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="eyebrow text-cream/70">Compartments</span>
            <span className="font-data text-[9px] text-cream/40">top view</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SORTED_CATEGORIES.map((cat, idx) => {
              const meta = CATEGORIES[cat];
              const pct = Math.min(100, (stats.fill[cat] / CAPACITY[cat]) * 100);
              return (
                <div
                  key={cat}
                  className="rounded-lg border border-cream/10 bg-cream/4 p-2"
                  style={{ order: idx === 0 ? 1 : idx === 1 ? 2 : idx === 2 ? 3 : 4 }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-data text-[9px] tracking-wider" style={{ color: meta.color }}>
                      {meta.short}
                    </span>
                    <span className="font-data text-[9px] text-cream/45">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-cream/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: meta.color }}
                    />
                  </div>
                  <div className="mt-1 font-data text-[8px] text-cream/35">
                    {stats.counts[cat]} items
                  </div>
                </div>
              );
            })}
          </div>
          {/* hazard drawer */}
          <div className="mt-1.5 rounded-lg border border-cream/10 bg-cream/4 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-data text-[9px] tracking-wider" style={{ color: CATEGORIES.hazard.color }}>
                HAZARD DRAWER
              </span>
              <span className="font-data text-[9px] text-cream/45">
                {Math.round(Math.min(100, (stats.fill.hazard / CAPACITY.hazard) * 100))}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-cream/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (stats.fill.hazard / CAPACITY.hazard) * 100)}%`,
                  background: CATEGORIES.hazard.color,
                }}
              />
            </div>
            <div className="mt-1 font-data text-[8px] text-cream/35">
              {stats.counts.hazard} items quarantined
            </div>
          </div>
        </div>

        {/* impact */}
        <div className="panel p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="eyebrow text-cream/70">Session impact</span>
            <span className="font-data text-[9px] text-cream/40">modelled</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat k="sorted" v={String(stats.total)} />
            <Stat k="accuracy" v={`${accuracy.toFixed(0)}%`} accent={stats.total > 0} />
            <Stat k="recycled" v={`${stats.massRecycled.toFixed(2)} kg`} />
            <Stat k="compost" v={`${stats.compost.toFixed(2)} kg`} />
            <Stat
              k="CO₂e avoided"
              v={`${stats.co2.toFixed(2)} kg`}
              accent
              wide
            />
          </div>
        </div>
      </div>

      {/* ————— review card ————— */}
      {review && (
        <div className="pointer-events-auto absolute bottom-40 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:bottom-44 lg:bottom-36">
          <div className="panel rise-in border-amber/30 p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="eyebrow text-amber">Human assist needed</span>
              <span className="font-data text-[10px] text-cream/45">
                {(review.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-semibold text-cream">
              {review.label} — where should it go?
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-cream/55">
              The multi-layer foil + plastic laminate confuses even good models. Teach it once — your
              choice is logged and reused.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {review.candidates?.map((c) => (
                <button
                  key={c}
                  onClick={() => choose(c)}
                  className="flex-1 rounded-lg border px-3 py-2.5 font-data text-[11px] tracking-wider transition-all hover:brightness-125"
                  style={{
                    color: CATEGORIES[c].color,
                    borderColor: `${CATEGORIES[c].color}55`,
                    background: `${CATEGORIES[c].color}14`,
                  }}
                >
                  {CATEGORIES[c].short}
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-cream/10 pt-2.5 font-data text-[9px] text-cream/40">
              {cloud.state === "loading" && <span>◌ cloud assist thinking…</span>}
              {cloud.state === "done" && (
                <span style={{ color: CATEGORIES[cloud.category].color }}>
                  ☁ cloud assist suggests {CATEGORIES[cloud.category].short}
                  {cloud.reason ? ` — ${cloud.reason.slice(0, 64)}` : ""}
                </span>
              )}
              {cloud.state === "error" && <span>cloud assist unavailable — decide yourself below</span>}
              {cloud.state === "idle" && <span> </span>}
            </div>
          </div>
        </div>
      )}

      {/* ————— waste tray ————— */}
      <footer className="absolute inset-x-0 bottom-0 z-20 border-t border-cream/10 bg-ink/70 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="hidden shrink-0 sm:block">
            <p className="eyebrow text-cream/50">Waste tray</p>
            <p className="font-data text-[9px] text-cream/35">tap to toss</p>
          </div>
          <div className="slim-scroll flex flex-1 gap-1.5 overflow-x-auto pb-0.5">
            {ITEMS.map((def) => (
              <button
                key={def.id}
                onClick={() => toss(def)}
                disabled={status === "booting"}
                className="group flex shrink-0 flex-col items-start gap-0.5 rounded-xl border border-cream/12 bg-cream/4 px-3 py-2 text-left transition-all hover:border-lime/50 hover:bg-lime/10 disabled:opacity-40"
                title={`${def.label} — ${CATEGORIES[def.category].label}`}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cream/90">
                  <i
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: CATEGORIES[def.category].color }}
                  />
                  {def.label}
                </span>
                <span className="font-data text-[8px] uppercase tracking-wider text-cream/35">
                  {def.tag}
                </span>
              </button>
            ))}
          </div>
          <a
            href="#problem"
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-cream/15 px-3.5 py-2 font-data text-[10px] tracking-[0.14em] text-cream/55 transition-colors hover:border-cream/40 hover:text-cream md:flex"
          >
            THE PROBLEM ↓
          </a>
        </div>
      </footer>
    </section>
  );
}

/* ——— small presentational helpers ——— */
function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 font-data text-[10px] tracking-[0.14em] transition-all ${
        active
          ? "border-lime/60 bg-lime/15 text-lime"
          : "border-cream/15 text-cream/50 hover:border-cream/40 hover:text-cream"
      }`}
    >
      {label}
      <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-lime" : "bg-cream/25"}`} />
    </button>
  );
}

function VisionRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-cream/40">{k}</dt>
      <dd className={`truncate text-right ${accent ? "text-lime" : "text-cream/85"}`}>{v}</dd>
    </div>
  );
}

function Stat({ k, v, accent, wide }: { k: string; v: string; accent?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div
        className={`font-data text-lg leading-none ${accent ? "text-lime" : "text-cream/90"}`}
      >
        {v}
      </div>
      <div className="mt-1 font-data text-[9px] uppercase tracking-wider text-cream/40">{k}</div>
    </div>
  );
}
