/**
 * Copy manifest.json and icons to dist/ folder.
 * Cross-platform compatible (Windows, macOS, Linux).
 */

import { copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

// Copy manifest.json
const manifestSrc = join(root, "manifest.json");
const manifestDest = join(dist, "manifest.json");
if (existsSync(manifestSrc)) {
  copyFileSync(manifestSrc, manifestDest);
  console.log("Copied manifest.json");
}

// Copy icons
const iconsSrc = join(root, "icons");
const iconsDest = join(dist, "icons");

if (existsSync(iconsSrc)) {
  mkdirSync(iconsDest, { recursive: true });

  for (const file of readdirSync(iconsSrc)) {
    if (file.endsWith(".png") || file.endsWith(".svg")) {
      copyFileSync(join(iconsSrc, file), join(iconsDest, file));
      console.log(`Copied icons/${file}`);
    }
  }
}

console.log("Assets copied to dist/");
