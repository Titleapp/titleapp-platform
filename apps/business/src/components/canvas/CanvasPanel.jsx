/**
 * CanvasPanel.jsx — Canvas Protocol panel renderer (44.9)
 *
 * Rendered inside RightPanel when state === "CANVAS".
 * Resolves the component from canvasData.resolved.component string,
 * passes props, handles dismiss.
 */

import React from "react";
import { resolveComponent } from "./CanvasComponentMap";

export default function CanvasPanel({ canvasData, onDismiss }) {
  if (!canvasData?.resolved) return null;

  const { resolved, context } = canvasData;
  const Component = resolveComponent(resolved.component);

  if (!Component) {
    console.warn("CanvasPanel: no component found for", resolved.component);
    return null;
  }

  return <Component resolved={resolved} context={context || {}} onDismiss={onDismiss} />;
}
