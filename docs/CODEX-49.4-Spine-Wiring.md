CODEX 49.4
Spine Wiring — Nav, Brief Scheduler, Grey Screen

Document: CODEX 49.4
Surfaces: Sidebar.jsx, App.jsx, functions/index.js, App.css
Deploy: Frontend: npm run build + firebase deploy --only hosting. Backend: firebase deploy --only functions
Risk: Medium — touches Sidebar.jsx, App.jsx, and live chat handler
Depends on: CODEX 49.1 complete (spine-e-stable tagged)
Rollback tag: git tag spine-49-4-pre before starting
Research: T2 audit April 19, 2026 — all file paths and line numbers confirmed
Red-teamed: Issues confirmed by live testing April 19, 2026
