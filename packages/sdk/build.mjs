import { build } from "esbuild";
import { readFileSync, writeFileSync, cpSync } from "fs";

const shared = {
  entryPoints: ["src/index.js"],
  bundle: true,
  platform: "node",
  target: "node18",
  external: [],
};

// ESM build
await build({ ...shared, format: "esm", outfile: "dist/index.mjs" });

// CJS build
await build({ ...shared, format: "cjs", outfile: "dist/index.cjs" });

// Copy TypeScript declarations
cpSync("src/index.d.ts", "dist/index.d.ts");

console.log("Build complete: dist/index.mjs, dist/index.cjs, dist/index.d.ts");
