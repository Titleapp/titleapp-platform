docs/platform/README_FOR_AI.md

# READ THIS FIRST — TITLEAPP PLATFORM LAW

This repository is governed by the documents in /docs/platform and the endpoint registry in /contracts.

Rules:
1. All business logic lives behind endpoints (Cloud Functions / services). No business logic in UI or chat clients.
2. Chat and Web UI are equal clients of the same endpoints. No chat-only or UI-only capabilities.
3. No endpoint may be implemented unless it is declared in /contracts/capabilities.json with:
   - required KYC level
   - allowed tenant types
   - allowed roles
   - allowed callers (human/chat/worker/system)
4. Every endpoint must emit an event and write an immutable audit record.
5. Use the LEGO model: add new endpoints/modules; do not repurpose or silently change existing ones.
6. If something is missing, propose it by updating docs + contracts first, then implement.

Violation of these rules is considered a bug.
