import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { generateAllTiles } from "../lib/tile-generator";

const out = resolve(process.cwd(), "data/tiles.json");
mkdirSync(dirname(out), { recursive: true });
const tiles = generateAllTiles();
writeFileSync(out, JSON.stringify(tiles, null, 2), "utf8");
console.log(`Wrote ${tiles.length} tiles to ${out}`);
