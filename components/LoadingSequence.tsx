"use client";

import { useEffect, useState } from "react";

const STEPS = ["CONTACTING THE DEAD…", "SEARCHING ARCHIVES…", "STILL SEARCHING ARCHIVES…"];

export function LoadingSequence() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div role="status" className="mt-8 flex items-center gap-3 font-mono text-sm text-neutral-300">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
      <span>{STEPS[step]}</span>
    </div>
  );
}
