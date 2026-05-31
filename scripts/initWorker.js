#!/usr/bin/env node

/**
 * scripts/initWorker.js — scaffold a new worker by copying _template/ into
 * creators/<handle>/<slug>/ and replacing placeholders with the creator's
 * inputs.
 *
 * Usage (non-interactive):
 *   npm run init-worker -- \
 *     --handle=ruthie \
 *     --slug=nursing-education-001 \
 *     --name="Clearwater Nursing Education" \
 *     --email=ruthie@example.com
 *
 * Usage (interactive):
 *   npm run init-worker
 *   # — script prompts you for each value
 *
 * What it does:
 *   1. Validates handle + slug (lowercase, kebab-case)
 *   2. Refuses to overwrite an existing creators/<handle>/<slug>/ directory
 *   3. Copies creators/_template/ recursively
 *   4. Replaces <your-worker-slug>, <your-handle>, working titles, and
 *      creator name/email placeholders in every file
 *   5. Prints next-step instructions
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*(-\d+)?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq === -1) {
        args[arg.slice(2)] = true;
      } else {
        args[arg.slice(2, eq)] = arg.slice(eq + 1);
      }
    }
  }
  return args;
}

function ask(rl, question, validator) {
  return new Promise((resolve) => {
    const prompt = () => {
      rl.question(question, (answer) => {
        const trimmed = (answer || "").trim();
        if (validator) {
          const err = validator(trimmed);
          if (err) {
            console.log(`  ${err}`);
            prompt();
            return;
          }
        }
        resolve(trimmed);
      });
    };
    prompt();
  });
}

function validateHandle(v) {
  if (!v) return "handle is required";
  if (!KEBAB_RE.test(v)) {
    return "handle must be lowercase letters, digits, and single hyphens only (e.g. \"ruthie\", \"jane-doe\")";
  }
  if (v.length > 32) return "handle must be 32 characters or fewer";
  if (v === "_template" || v.startsWith("_")) return "handle cannot start with underscore";
  return null;
}

function validateSlug(v) {
  if (!v) return "slug is required";
  if (!SLUG_RE.test(v)) {
    return "slug must be lowercase kebab-case, optionally suffixed with a number (e.g. \"nursing-education-001\")";
  }
  if (v.length > 48) return "slug must be 48 characters or fewer";
  return null;
}

function validateName(v) {
  if (!v) return "name is required";
  if (v.length < 3) return "name must be at least 3 characters";
  if (v.length > 80) return "name must be 80 characters or fewer";
  return null;
}

function validateEmail(v) {
  if (!v) return "email is required";
  if (!EMAIL_RE.test(v)) return "email looks malformed";
  return null;
}

async function gatherInputs(cliArgs) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const handle = cliArgs.handle || await ask(
    rl,
    "Your GitHub handle (lowercase, e.g. \"ruthie\"): ",
    validateHandle,
  );
  if (cliArgs.handle && validateHandle(cliArgs.handle)) {
    rl.close();
    throw new Error(`--handle invalid: ${validateHandle(cliArgs.handle)}`);
  }

  const slug = cliArgs.slug || await ask(
    rl,
    "Worker slug (lowercase-with-dashes, e.g. \"nursing-education-001\"): ",
    validateSlug,
  );
  if (cliArgs.slug && validateSlug(cliArgs.slug)) {
    rl.close();
    throw new Error(`--slug invalid: ${validateSlug(cliArgs.slug)}`);
  }

  const name = cliArgs.name || await ask(
    rl,
    "Display name (the human-friendly title, e.g. \"Clearwater Nursing Education\"): ",
    validateName,
  );
  if (cliArgs.name && validateName(cliArgs.name)) {
    rl.close();
    throw new Error(`--name invalid: ${validateName(cliArgs.name)}`);
  }

  const email = cliArgs.email || await ask(
    rl,
    "Your email (for the creator field in worker docs): ",
    validateEmail,
  );
  if (cliArgs.email && validateEmail(cliArgs.email)) {
    rl.close();
    throw new Error(`--email invalid: ${validateEmail(cliArgs.email)}`);
  }

  rl.close();
  return { handle, slug, name, email };
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

function applyReplacements(filePath, replacements) {
  let content = fs.readFileSync(filePath, "utf8");
  for (const [pattern, value] of replacements) {
    content = content.split(pattern).join(value);
  }
  fs.writeFileSync(filePath, content);
}

function walkFiles(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, callback);
    } else if (entry.isFile()) {
      callback(full);
    }
  }
}

async function main() {
  const cliArgs = parseArgs();

  if (cliArgs.help || cliArgs.h) {
    console.log("Usage:");
    console.log("  npm run init-worker -- --handle=<handle> --slug=<slug> --name=\"<Display Name>\" --email=<email>");
    console.log("  npm run init-worker        # interactive mode");
    console.log("");
    console.log("Example:");
    console.log("  npm run init-worker -- --handle=jane --slug=fitness-coach --name=\"Fitness Coach\" --email=jane@example.com");
    process.exit(0);
  }

  console.log("");
  console.log("SOCIII worker scaffolder");
  console.log("------------------------");
  console.log("This creates a new worker directory at creators/<handle>/<slug>/");
  console.log("by copying creators/_template/ and filling in your details.");
  console.log("");

  let inputs;
  try {
    inputs = await gatherInputs(cliArgs);
  } catch (err) {
    console.error("");
    console.error(err.message);
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, "..");
  const srcDir = path.join(repoRoot, "creators", "_template");
  const destDir = path.join(repoRoot, "creators", inputs.handle, inputs.slug);

  if (!fs.existsSync(srcDir)) {
    console.error(`Error: template not found at ${path.relative(repoRoot, srcDir)}`);
    console.error("If you forked recently, run \"git pull\" to refresh.");
    process.exit(2);
  }
  if (fs.existsSync(destDir)) {
    console.error("");
    console.error(`Error: ${path.relative(repoRoot, destDir)} already exists.`);
    console.error("Pick a different slug, or remove the existing directory first.");
    process.exit(3);
  }

  console.log("");
  console.log(`Creating ${path.relative(repoRoot, destDir)}...`);
  copyRecursive(srcDir, destDir);

  const replacements = [
    ["<your-worker-slug>", inputs.slug],
    ["<your-handle>", inputs.handle],
    ["your-worker-slug", inputs.slug],
    ["Your Name", inputs.name],
    ["your@email.com", inputs.email],
    ["yourWorker", camelCase(inputs.slug)],
    ["What this worker is called", inputs.name],
  ];

  let replacementCount = 0;
  walkFiles(destDir, (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (![".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".html"].includes(ext)) return;
    const before = fs.readFileSync(filePath, "utf8");
    applyReplacements(filePath, replacements);
    const after = fs.readFileSync(filePath, "utf8");
    if (before !== after) replacementCount++;
  });

  console.log(`Replaced placeholders in ${replacementCount} file(s).`);
  console.log("");
  console.log("Done. Next steps:");
  console.log("");
  console.log(`  1. Open creators/${inputs.handle}/${inputs.slug}/intent.md and fill in the sections.`);
  console.log(`     This is the most important file — what / who / success / boundary / why.`);
  console.log("");
  console.log(`  2. Edit canvas-tabs.json to define your tabs.`);
  console.log(`     The template starts you with 4 tabs (main, activity, audit, settings).`);
  console.log("");
  console.log(`  3. Edit service.js to add your worker's functions.`);
  console.log("");
  console.log(`  4. Edit sample-data.js so every canvas tab has a sample payload.`);
  console.log("");
  console.log(`  5. Edit tests/assertions.md and list at least 5 QA-001 assertions.`);
  console.log("");
  console.log(`  6. Validate locally:`);
  console.log(`     npm run validate-worker -- --worker=${inputs.handle}/${inputs.slug}`);
  console.log("");
  console.log(`  7. When validation passes and you're ready to open a PR, push your fork.`);
  console.log("");
  console.log("Read docs/CREATOR-WORKER-BUILD.md for the full guide.");
  console.log("");
}

function camelCase(slug) {
  return slug
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

main().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(99);
});
