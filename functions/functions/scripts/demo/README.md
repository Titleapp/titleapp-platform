# Meadow Creek Demo — seed & reset

The **"View the Demo"** account (Dr. Maya Chen, DVM · Meadow Creek Veterinary Clinic).
Powers `sociii.ai/demo` (one-click auto-login) and `demo@sociii.ai` / `MeadowCreek!2026`.

- **Demo account:** `demo@sociii.ai` (uid `NHVBEVFSiBUFUzHUq5a9Xioc3hH2`)
- **Workspace / tenant:** `ws_1781920656122_tl9dhn` (Meadow Creek Veterinary Clinic)
- **Vertical:** veterinary

All scripts are **idempotent** (tagged `demo: true`, cleared + re-inserted on each run),
so running them again is a clean **reset** between recording takes.

## Run / reset (from `functions/functions/`)

```bash
NODE_PATH=./node_modules node scripts/demo/createDemoAccount.js   # the demo@sociii.ai login + workspace wiring
NODE_PATH=./node_modules node scripts/demo/seedDemoAccounting.js  # vet-clinic P&L (Accounting / QuickBooks-killer)
NODE_PATH=./node_modules node scripts/demo/seedDemoContacts.js    # 160 clients (Contacts / Salesforce-killer)
NODE_PATH=./node_modules node scripts/demo/seedDemoStaff.js       # flat staff credentials (legacy)
NODE_PATH=./node_modules node scripts/demo/seedSpine4.js          # SPINE-4 staff_credentials / training / reminders
NODE_PATH=./node_modules node scripts/demo/seedDemoVault.js       # Dr. Chen's 4-tile Vault + "Needs attention" deadlines
```

`createDemoSpace.js` is the original (Sean-owned) workspace creator — superseded by
`createDemoAccount.js`, kept for reference.

## Demo facts (kept consistent across all seeds)
Hero deadlines (relative to demo date): DEA 14d · Sam Rivera CVT 31d · Jordan Park license 47d ·
Alex Torres OSHA overdue · X-ray calibration overdue 6d · rabies titer ~29d. Net worth ≈ $1.07M.
Creator earnings (illustrative): ~$27,324/mo across her vet-worker catalog.

See the full spec: `~/Downloads/SOCIII-Meadow-Creek-Demo-Brief-v2 (1).docx` and the
`demo-space-and-seed` memory.
