"use client";

import type { SorterScene } from "./scene";

/** Module-level handle so the HUD can reach the mounted 3D scene. */
export const sceneRef: { current: SorterScene | null } = { current: null };
