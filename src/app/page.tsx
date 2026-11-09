import ExperienceInner from "@/components/sorter/ExperienceInner";
import Reveal from "@/components/Reveal";
import XrayLink from "@/components/XrayLink";

const PROBLEM_STATS = [
  { v: "2.01 Bt", k: "municipal solid waste generated worldwide, every year" },
  { v: "44%", k: "of that stream is food and green waste — perfect compost, landfilled" },
  { v: "13.5%", k: "is recycled globally after all that bin confusion" },
  { v: "33%", k: "is still openly dumped, untreated, into land and water" },
];

const PAIN_POINTS = [
  {
    n: "01",
    t: "Contamination kills recycling",
    d: "One greasy tray or half-full bottle can downgrade an entire kerbside batch. Recycling is only as good as the cleanest stream it touches — and contamination is judged at the bin, after the fact.",
  },
  {
    n: "02",
    t: "The “which bin?” pause",
    d: "A coffee cup with a PE lining. A chip bag of plastic and foil. Composite packaging keeps multiplying faster than household knowledge does — so tired people default to the general bin.",
  },
  {
    n: "03",
    t: "Hazards slip through",
    d: "Batteries and small electronics thrown into general waste are crushed in trucks and sorting plants. Waste-industry surveys report hundreds of facility fires every year linked to lithium-ion cells.",
  },
];

const STEPS = [
  {
    n: "01",
    t: "Sense",
    d: "An item lands in the scan zone. A 160° RGB-D camera, near-infrared spectrometer and load cell capture what it looks like, what it is made of and what it weighs.",
  },
  {
    n: "02",
    t: "Classify",
    d: "The on-device model (SIFT-V3) names the object, material and contamination state in about a second — with a confidence score. Ambiguous items escalate: cloud assist first, then you.",
  },
  {
    n: "03",
    t: "Sort",
    d: "The matching sealed compartment opens and the item is dropped in. Liquids and grease-contaminated pieces are diverted to General to protect the recyclable streams.",
  },
  {
    n: "04",
    t: "Learn",
    d: "Every correction you make becomes a training signal. Over weeks the bin stops asking — and starts forecasting fill levels, compost output and collection day.",
  },
];

const ANATOMY = [
  {
    t: "AI vision pod",
    d: "RGB-D + NIR sensor pair under a flush sapphire window, watching the scan zone from the deck.",
  },
  {
    t: "Four sealed compartments",
    d: "12 L each, gasket-sealed with an activated-carbon filter — organic odours never reach the kitchen.",
  },
  {
    t: "Hazard drawer",
    d: "A 2 L fire-lined drawer for batteries and small e-waste. Quarantined, never compacted.",
  },
  {
    t: "Ultrasonic fill sensing",
    d: "Per-compartment level sensing feeds the app's fill forecast — no lifting lids to peek.",
  },
  {
    t: "LED status ring",
    d: "One glanceable ring around the pod: cream when resting, chartreuse while thinking, category colour while sorting, plum on hazard.",
  },
  {
    t: "Low-power display",
    d: "A 4.3″ panel for status, sorting reasons and collection-day countdown. It explains every decision.",
  },
  {
    t: "12 V DC · 1.8 W idle",
    d: "About the idle draw of a set-top box on standby; the sorting actuator only spends energy when you do.",
  },
  {
    t: "SIFT OS + app",
    d: "Fill forecasts, contamination coaching, compost tally — and a full decision log you can audit.",
  },
];

const SPECS: [string, string][] = [
  ["Sorting streams", "4 sealed compartments + hazard drawer"],
  ["Compartment volume", "4 × 12 L, gasket-sealed, carbon-filtered"],
  ["Hazard drawer", "2 L, fire-resistant lining, lockable"],
  ["Sensing", "160° RGB-D camera · NIR spectrometer · load cell · 4× ultrasonic fill sensors"],
  ["Inference", "On-device SIFT-V3, ≈1.2 s typical · cloud assist for ambiguity · human-in-the-loop review"],
  ["Connectivity", "Wi-Fi 6 + Bluetooth LE"],
  ["Display", "4.3″ low-power panel with decision explanations"],
  ["Power", "12 V DC · 1.8 W idle"],
  ["Acoustics", "< 38 dB during sorting"],
  ["Dimensions", "46 × 34 × 58 cm (W × D × H)"],
  ["Weight", "8.2 kg empty"],
  ["Finish", "Matte ivory polymer · oiled oak side grips"],
  ["Software", "SIFT OS with over-the-air model updates"],
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-cream text-foreground">
      <main className="flex-1">
        <ExperienceInner />

        {/* ————————————————— THE PROBLEM ————————————————— */}
        <section id="problem" className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-clay">01 · The problem</p>
              <h2 className="font-display mt-4 max-w-2xl text-4xl leading-[1.05] font-light tracking-tight sm:text-6xl">
                A full bin is a <em className="font-normal italic text-clay">design</em> failure —
                and it happens in the last metre.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Households are asked to be the sorting layer of the entire recycling system — at the
                exact moment attention is lowest: tired, holding a dripping wrapper over a bin. The
                result is predictable. Food waste rides along with plastics, recyclables carry
                last night's dinner, and batteries end up wherever the throw was quickest.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
              {PROBLEM_STATS.map((s, i) => (
                <Reveal key={s.v + i} delay={i * 90} className="h-full">
                  <div className="flex h-full flex-col justify-between gap-6 bg-card p-5 sm:p-6">
                    <span className="font-data text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {s.v}
                    </span>
                    <span className="text-[13px] leading-snug text-muted-foreground">{s.k}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <p className="mt-3 font-data text-[10px] tracking-wide text-muted-foreground/70">
                Source: World Bank, “What a Waste 2.0” (2018) — global municipal solid waste, 2016
                data.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {PAIN_POINTS.map((p, i) => (
                <Reveal key={p.n} delay={i * 100} className="h-full">
                  <article className="h-full rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_8px_40px_-16px_rgba(23,28,22,0.25)]">
                    <span className="font-data text-xs text-clay">{p.n}</span>
                    <h3 className="font-display mt-3 text-xl leading-snug">{p.t}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ————————————————— HOW IT WORKS ————————————————— */}
        <section id="how" className="relative overflow-hidden bg-ink px-4 py-20 text-cream grain sm:px-6 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-lime">02 · How it works</p>
              <h2 className="font-display mt-4 max-w-2xl text-4xl leading-[1.05] font-light tracking-tight sm:text-6xl">
                Sorting, moved to the only moment it can be perfect:{" "}
                <em className="font-normal italic text-lime">the instant of release.</em>
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-cream/10 bg-cream/10 md:grid-cols-2">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 80} className="h-full">
                  <article className="h-full bg-ink-2 p-6 sm:p-8">
                    <div className="flex items-baseline gap-4">
                      <span className="font-data text-sm text-lime">{s.n}</span>
                      <h3 className="font-display text-2xl">{s.t}</h3>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-cream/60">{s.d}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Reveal delay={100}>
                <div className="h-full rounded-2xl border border-lime/25 bg-lime/5 p-6">
                  <p className="eyebrow text-lime">Contamination guard</p>
                  <p className="mt-3 text-sm leading-relaxed text-cream/70">
                    Did you catch the coffee cup in the demo? Residual liquid and a polyethylene
                    lining were detected mid-scan, so the cup was silently diverted to General —
                    one dirty item, kept away from a whole batch of clean recyclables.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={200}>
                <div className="h-full rounded-2xl border border-plum/30 bg-plum/8 p-6">
                  <p className="eyebrow text-plum">Hazard quarantine</p>
                  <p className="mt-3 text-sm leading-relaxed text-cream/70">
                    The AA battery and the old phone never touch the compaction path. They land in
                    a dedicated fire-lined drawer, ready for a battery-point drop-off — the single
                    cheapest way to prevent collection-truck fires.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ————————————————— ANATOMY ————————————————— */}
        <section id="anatomy" className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-clay">03 · Anatomy</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <h2 className="font-display max-w-xl text-4xl leading-[1.05] font-light tracking-tight sm:text-6xl">
                  Everything visible. Nothing fussy.
                </h2>
                <XrayLink />
              </div>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ANATOMY.map((f, i) => (
                <Reveal key={f.t} delay={i * 60} className="h-full">
                  <div className="h-full rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-display text-lg leading-snug">{f.t}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{f.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* ————— SPEC TABLE ————— */}
            <Reveal delay={100}>
              <div className="mt-16 overflow-hidden rounded-2xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
                  <h3 className="font-display text-xl">Design specification</h3>
                  <span className="font-data text-[10px] tracking-wider text-muted-foreground">
                    CONCEPT · SIFT·1
                  </span>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2">
                  {SPECS.map(([k, v], i) => (
                    <div
                      key={k}
                      className={`flex flex-col gap-1 px-6 py-4 ${i % 2 === 0 ? "sm:border-r" : ""} border-b border-border bg-background/60`}
                    >
                      <dt className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="text-sm text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ————————————————— IMPACT ————————————————— */}
        <section id="impact" className="relative overflow-hidden bg-ink-2 px-4 py-20 text-cream grain sm:px-6 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-lime">04 · The impact</p>
              <h2 className="font-display mt-4 max-w-3xl text-4xl leading-[1.05] font-light tracking-tight sm:text-6xl">
                The bin doesn't just hold waste. It changes the{" "}
                <em className="font-normal italic text-lime">last metre</em> of the recycling
                system.
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-10 lg:grid-cols-2">
              <Reveal>
                <div className="space-y-6">
                  <div className="border-l-2 border-sage pl-5">
                    <h3 className="font-display text-xl">Organics become soil, not methane</h3>
                    <p className="mt-2 text-sm leading-relaxed text-cream/60">
                      Buried food waste rots without oxygen and releases methane — a greenhouse gas
                      far more potent than CO₂ over 20 years. Sealed, vented and regularly emptied,
                      the same peels become compost feedstock instead.
                    </p>
                  </div>
                  <div className="border-l-2 border-amber pl-5">
                    <h3 className="font-display text-xl">Recyclables stay worth recycling</h3>
                    <p className="mt-2 text-sm leading-relaxed text-cream/60">
                      A PET flake stream with no food residue commands a real price and actually
                      gets reprocessed. Keeping one dirty item out of a clean batch is worth more
                      than any poster on a kitchen wall.
                    </p>
                  </div>
                  <div className="border-l-2 border-plum pl-5">
                    <h3 className="font-display text-xl">Hazards are captured by design</h3>
                    <p className="mt-2 text-sm leading-relaxed text-cream/60">
                      Batteries quarantined at the bin never reach the shredder. Fewer fires, fewer
                      heavy metals in leachate, and a household that knows where its e-waste is.
                    </p>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={140}>
                <div className="h-full rounded-2xl border border-cream/12 bg-ink p-6 sm:p-8">
                  <p className="eyebrow text-lime">Modelled example · one year</p>
                  <p className="mt-3 text-sm leading-relaxed text-cream/60">
                    For a two-person household (≈340 kg of waste a year), if the organic share were
                    composted and the dry recyclables left clean instead of landfilled:
                  </p>
                  <div className="mt-6 space-y-5">
                    {[
                      { v: "≈ 150 kg", k: "of food and garden waste diverted to compost", c: "#9bbf72" },
                      { v: "≈ 105 kg", k: "of clean, uncontaminated dry recyclables", c: "#e3b341" },
                      { v: "≈ 25 kg", k: "CO₂e avoided (modelled, illustrative factors)", c: "#d7f171" },
                    ].map((row) => (
                      <div key={row.k} className="flex items-baseline gap-4">
                        <span className="font-data w-28 shrink-0 whitespace-nowrap text-2xl font-semibold" style={{ color: row.c }}>
                          {row.v}
                        </span>
                        <span className="text-[13px] leading-snug text-cream/60">{row.k}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 border-t border-cream/10 pt-4 font-data text-[10px] leading-relaxed text-cream/40">
                    Illustrative model, not a measured result — exact figures depend on municipal
                    streams and local processing. The session counter in the demo above uses the
                    same conservative model.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      {/* ————————————————— FOOTER ————————————————— */}
      <footer className="mt-auto bg-ink px-4 py-10 text-cream sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-2xl tracking-tight">SIFT·1</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-cream/45">
              A concept study for a domestic AI sorting bin — designed and modelled in Three.js.
              SIFT·1 is not a commercial product; figures marked “modelled” are illustrative.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 font-data text-[11px] tracking-wider text-cream/55">
            <a className="transition-colors hover:text-lime" href="#demo">DEMO</a>
            <a className="transition-colors hover:text-lime" href="#problem">PROBLEM</a>
            <a className="transition-colors hover:text-lime" href="#how">HOW IT WORKS</a>
            <a className="transition-colors hover:text-lime" href="#anatomy">ANATOMY</a>
            <a className="transition-colors hover:text-lime" href="#impact">IMPACT</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
