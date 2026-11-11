"use client";
// Aplică culoarea unei primării pe toată pagina (antet, bandă tradițională), cât timp pagina e afișată.
import { useEffect } from "react";

export function BrandBody({ color }: { color: string }) {
  useEffect(() => {
    const b = document.body.style;
    const prev = [b.getPropertyValue("--accent"), b.getPropertyValue("--accent-hover")];
    b.setProperty("--accent", color);
    b.setProperty("--accent-hover", `color-mix(in srgb, ${color} 82%, black)`);
    return () => { b.setProperty("--accent", prev[0] ?? ""); b.setProperty("--accent-hover", prev[1] ?? ""); };
  }, [color]);
  return null;
}
