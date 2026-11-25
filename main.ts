// Ember & Thyme — the hand-in program. It copies the playable game and
// the screenshots into the grader's output folder, then writes the
// dossier the judge reads with the kit's dossier builder.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDossier } from "./vendor/makefun-game.ts";

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const here = new URL(".", import.meta.url).pathname;

mkdirSync(outDir, { recursive: true });
for (const name of ["game", "screenshots"]) {
  const src = join(here, name);
  if (existsSync(src)) cpSync(src, join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("wrote dossier.json (" + dossier.length + " bytes) to " + outDir);
