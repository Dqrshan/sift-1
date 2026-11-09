"use client";

import { useSorter } from "@/lib/sorter/store";

/**
 * Scrolls back to the 3D demo and switches on X-ray mode
 * so visitors can see the compartments described in the anatomy section.
 */
export default function XrayLink() {
  return (
    <button
      onClick={() => {
        useSorter.getState().setXray(true);
        document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
      }}
      className="rounded-full border border-foreground/25 px-5 py-2.5 font-data text-[11px] tracking-[0.14em] transition-colors hover:border-foreground hover:bg-foreground hover:text-cream"
    >
      ↺ OPEN THE 3D X-RAY
    </button>
  );
}
