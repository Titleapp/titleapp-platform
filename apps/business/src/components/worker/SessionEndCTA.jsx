import React from "react";

// S52.44 — retired. The "Built on SOCIII / Start building" creator-invite CTA
// was supposed to be removed weeks ago (Sean) but was still rendering inside
// worker chat sessions. Returns null everywhere it's used (ChatPanel,
// GameEndScreen). Keep the component so call sites don't break.
export default function SessionEndCTA() {
  return null;
}
