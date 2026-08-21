/**
 * AviationFleetMapCard.jsx — thin canvas wrapper around AviationMap for
 * workers whose whole product is the live map (e.g. Aviation Dispatch
 * Board — "the Canvas IS the map"). AviationMap already does its own
 * weather/traffic/airspace fetching internally; this card just supplies
 * the fleet tails from the live payload so the operator's own aircraft
 * render gold on the map instead of a generic default.
 * Signal: card:aviation-fleet-map
 * Payload: { fleetTails: string[], icaos?: string[], center?: [lat, lon] }
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import AviationMap from "./AviationMap";

export default function AviationFleetMapCard({ context, onDismiss }) {
  const payload = context?.payload || {};

  return (
    <CanvasCardShell
      title="Fleet Map"
      emptyPrompt="Ask Skye to show fleet positions and the live map loads here."
      onDismiss={onDismiss}
    >
      <AviationMap
        height={480}
        fleetTails={payload.fleetTails || []}
        {...(payload.icaos ? { icaos: payload.icaos } : {})}
        {...(payload.center ? { center: payload.center } : {})}
      />
    </CanvasCardShell>
  );
}
