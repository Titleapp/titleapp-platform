# Aviation RAAS Review Prompt Template

Use this template to evaluate each waitlisted aviation worker against `raasAviationFoundation.js v1.0.0`.

---

Review worker **{worker_id}** (**{display_name}**) against raasAviationFoundation.js v1.0.0.

Check:

1. **Which FARs apply to this worker's function?**
   List specific parts and sections.

2. **Does this worker touch Part 135 operations?**
   If yes, note that OpSpecs govern actual limits — FAR minimums may not apply.

3. **Are there OSHA, DOT, TSA, or state-specific requirements for this worker's function?**
   Reference specific CFR parts.

4. **For medevac context: do CAMTS standards apply?**
   If yes, note that FAR compliance alone is insufficient for accredited operators.

5. **Does the worker output contain any hard-blocked content types?**
   Hard blocks: patient data, FRAT in social, flight manifests, pilot medical details, drug/alcohol results, safety data in marketing.

6. **Is output format appropriate for operational use?**
   Operational outputs must be clear, unambiguous, and suitable for crew briefing.

7. **Hawaii/Alaska operations: are state-specific flags needed?**
   Hawaii: HIOSH, noise abatement, inter-island routing.
   Alaska: VFR-over-the-top, remote ops, survival equipment.

8. **Recommendation:** `compliant` | `needs_work` | `retire`

9. **If needs_work:** List specific gaps to address before promotion.

---

## How to Apply

```bash
# After review, call the admin endpoint:
curl -X POST https://api-feyfibglbq-uc.a.run.app/v1/admin/workers/raas-review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -d '{
    "workerId": "{worker_id}",
    "reviewedBy": "admin@titleapp.ai",
    "decision": "compliant",
    "notes": "Reviewed against aviation-v1. FARs: Part 91, 135. No hard block issues."
  }'
```

---

*The Title App LLC - raasAviationFoundation v1.0.0 - Memo 43.5a*
