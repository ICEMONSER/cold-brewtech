// Builds the site for GitHub Pages (https://icemonser.github.io/cold-brewtech/)
// and copies it to the repository root, which is what Pages serves from main.
import { execSync } from "node:child_process";
import { cpSync, copyFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const out = resolve(import.meta.dirname, "../dist-pages");

execSync(`npx tsc -b && npx vite build --base=/cold-brewtech/ --outDir ${out} --emptyOutDir`, { stdio: "inherit", cwd: resolve(import.meta.dirname, "..") });

rmSync(resolve(root, "assets"), { recursive: true, force: true });
cpSync(resolve(out, "assets"), resolve(root, "assets"), { recursive: true });
copyFileSync(resolve(out, "index.html"), resolve(root, "index.html"));
copyFileSync(resolve(out, "index.html"), resolve(root, "404.html")); // deep links like /cold-brewtech/forecast
copyFileSync(resolve(out, "favicon.svg"), resolve(root, "favicon.svg"));
writeFileSync(resolve(root, ".nojekyll"), ""); // serve files as-is, don't render README
rmSync(out, { recursive: true, force: true });
console.log("GitHub Pages build copied to repository root.");
