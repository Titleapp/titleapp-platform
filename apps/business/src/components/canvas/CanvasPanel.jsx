/**
 * CanvasPanel.jsx — Canvas Protocol panel renderer (44.9)
 *
 * Rendered inside RightPanel when state === "CANVAS".
 * Resolves the component from canvasData.resolved.component string,
 * passes props, handles dismiss.
 */

import React from "react";
import { resolveComponent } from "./CanvasComponentMap";
import { CanvasDemoContext } from "./CanvasCardShell";

export default function CanvasPanel({ canvasData, onDismiss }) {
  if (!canvasData?.resolved) {
    console.log('[canvas:diag] CanvasPanel — no canvasData.resolved, returning null');
    return null;
  }

  const { resolved, context } = canvasData;
  const Component = resolveComponent(resolved.component);

  // 2026-05-22 diagnostic: trace #219 (Accounting canvas not rendering)
  console.log('[canvas:diag] CanvasPanel render signal=' + resolved._signal + ' component=' + resolved.component +
    ' payloadKeys=' + (context?.payload ? Object.keys(context.payload).slice(0, 8).join(',') : '(no payload)'));

  if (!Component) {
    console.warn("CanvasPanel: no component found for", resolved.component);
    return null;
  }

  // 50.10-T4 — flag this canvas as demo when the payload was populated from
  // the sampleData fixture pipeline. Cards' shells pick this up via context
  // and render a SAMPLE chip in their headers.
  const isDemo = !!(context?.payload?._demo);

  return (
    <CanvasDemoContext.Provider value={isDemo}>
      <Component resolved={resolved} context={context || {}} onDismiss={onDismiss} />
    </CanvasDemoContext.Provider>
  );
}
