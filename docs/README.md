# TitleApp Platform — Internal Documentation

This directory is the source of truth for platform architecture, vertical specs, pricing, and session history.

## Structure

- `/platform` — Core architecture, pricing, governance, Alex spec
- `/verticals` — Per-vertical scope docs and worker catalogs
- `/integrations` — Third-party service specs
- `/sessions` — Session-by-session changelog

## Update Protocol

Every session that produces an approved spec, scope doc, or architectural decision:
1. Updates the relevant file in `/platform` or `/verticals`
2. Adds a session summary to `/sessions`
3. Updates this README index if new files are added

Last updated: Session 28 (March 2026)
