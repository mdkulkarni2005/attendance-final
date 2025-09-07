"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

function getConvexUrl() {
  if (typeof process !== "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (fromEnv && fromEnv.length > 0) return fromEnv;
  }
  // Default local dev URL
  return "http://127.0.0.1:3210";
}

export default function Providers({ children }: { children: ReactNode }) {
  const convex = useMemo(() => new ConvexReactClient(getConvexUrl()), []);
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
