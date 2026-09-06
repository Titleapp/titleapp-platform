/**
 * aviationDisclaimers.js — verbatim regulatory/liability text from CODEX 64
 * ("Regulatory / Liability Framing — Supplemental EFB, Not Instrument").
 * These strings are copied exactly as specced — this is a liability-
 * sensitive detail, not marketing copy to be paraphrased or shortened.
 */

export const LAUNCH_DISCLAIMER =
  "CoPilot is a supplemental portable Electronic Flight Bag (EFB) per FAA AC 120-76E. " +
  "It is not a certified aviation instrument. Go/no-go authority rests with the PIC. " +
  "Do not use as a primary navigation or instrument reference.";

export const SUPPLEMENTAL_FOOTER = "SUPPLEMENTAL DISPLAY ONLY — NOT A CERTIFIED INSTRUMENT";

export const TERRAIN_DISCLAIMER =
  "Terrain — situational awareness only. Not TAWS. Not certified for IFR terrain avoidance.";

export const WB_DISCLAIMER =
  "CG calculation is based on entered weights and standard seat station arms. Verify " +
  "against the aircraft AFM W&B document before flight. Pilot in command is responsible " +
  "for confirming aircraft is within CG and weight limits.";

export const LAUNCH_DISCLAIMER_STORAGE_KEY = "sociii_av_launch_disclaimer_ack_v1";
