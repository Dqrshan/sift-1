import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";

const VALID = new Set(["organic", "recyclable", "paper", "general", "hazard"]);

interface ClassifyBody {
  label?: string;
  candidates?: string[];
}

/**
 * Cloud assist for the human-review flow.
 * Asks the LLM to break a tie on an ambiguous waste item.
 * Always fails soft — the demo works fully offline without it.
 */
export async function POST(req: Request) {
  let body: ClassifyBody;
  try {
    body = (await req.json()) as ClassifyBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const label = (body.label ?? "").slice(0, 80).trim();
  const candidates = (body.candidates ?? ["general", "recyclable"]).filter((c) =>
    VALID.has(c)
  );
  if (!label || candidates.length === 0) {
    return NextResponse.json({ error: "label and candidates required" }, { status: 400 });
  }

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are the cloud AI of SIFT·1, a domestic waste-sorting bin. " +
            "Given an ambiguous household waste item, pick the single best category. " +
            "Categories: organic (food/garden compost), recyclable (clean plastic/metal/glass), " +
            "paper (paper & cardboard), general (landfill, multi-material laminates), hazard (batteries/e-waste). " +
            "Answer with STRICT JSON only: {\"category\":\"<one of the given candidates>\",\"reason\":\"<max 12 words>\"}",
        },
        {
          role: "user",
          content: `Item: "${label}". Allowed candidates: ${candidates.join(", ")}. JSON only.`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json in response");
    const parsed = JSON.parse(match[0]) as { category?: string; reason?: string };
    if (!parsed.category || !VALID.has(parsed.category) || !candidates.includes(parsed.category)) {
      throw new Error("invalid category");
    }
    return NextResponse.json({
      category: parsed.category,
      reason: (parsed.reason ?? "").slice(0, 80),
      engine: "glm-cloud",
    });
  } catch {
    // Fail soft: the HUD falls back to "cloud unavailable — decide yourself".
    return NextResponse.json({ error: "cloud assist unavailable" }, { status: 503 });
  }
}
