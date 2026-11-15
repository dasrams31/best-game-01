// VOIDLIGHT — the program that hands this entry in (Node 22, stdlib only).
//
// It copies the playable game (game/) and the screenshots (screenshots/)
// from beside this file into the output directory, then writes
// dossier.json there with make.fun's vendored library, so the scorer can
// check the game is plain static files and the judge can read it.
//
// In the grader the output directory is /output. Anywhere else,
// MAKEFUN_OUTPUT_DIR stands in for it:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program runs twice and must write the same bytes both times; it
// reads nothing but this repository and writes nothing but /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The grader hands us an empty writable /output each run, so there is
// nothing to clean: never remove the output directory itself (in the
// grader it is a mount point, and removing it fails the run).
mkdirSync(outputDir, { recursive: true });

cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the competition's own gate limits: the dossier text cap
// shapes the bytes, the rest make this program fail exactly where the
// scorer would refuse the entry.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
