import type { BlobTrackerEffect } from "@/store/types";

/** Small deterministic string hash -> seed, feeding a mulberry32 PRNG below — this
 * app's usual pattern for anything that needs "random-looking but stable between
 * the live preview and export renders" (see the fixed jitter/hash patterns in
 * cameraShake.ts/glitch.ts/xerox.ts). Here it only breaks ties between candidate
 * regions that score identically (e.g. flat/empty areas of the image) — primary
 * placement is driven by the image's own real detected contrast, not this seed. */
function hashStringToSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DetectedBlob {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Scans `source` (already rendered, box-local, unrotated — a coarse per-cell local-
 * luminance-contrast grid, not a full vision pipeline) for high-contrast regions and
 * returns up to `maxCount` non-overlapping candidates, sized roughly by how strongly
 * each stood out. A single getImageData call reads the whole box once; everything
 * after that is plain typed-array math, so this stays cheap even at a few thousand
 * grid cells.
 */
function detectBlobs(source: HTMLCanvasElement, w: number, h: number, sensitivity: number, maxCount: number, seedNum: number): DetectedBlob[] {
  if (w <= 0 || h <= 0 || maxCount <= 0) return [];
  const ctx = source.getContext("2d");
  if (!ctx) return [];

  const gridCols = Math.max(4, Math.min(48, Math.round(w / 24)));
  const gridRows = Math.max(4, Math.min(48, Math.round(h / 24)));
  const cellW = w / gridCols;
  const cellH = h / gridRows;

  const pixels = ctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(gridCols * gridRows);
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const px = Math.min(w - 1, Math.floor((gx + 0.5) * cellW));
      const py = Math.min(h - 1, Math.floor((gy + 0.5) * cellH));
      const idx = (py * w + px) * 4;
      lum[gy * gridCols + gx] = (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]) / 255;
    }
  }

  // Local-contrast "interestingness" per cell — a flat region scores near 0, an
  // edge/high-detail region scores high, the same cheap Laplacian-like measure a
  // basic feature/corner detector's first pass would use.
  interface Candidate {
    gx: number;
    gy: number;
    score: number;
  }
  const candidates: Candidate[] = [];
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const center = lum[gy * gridCols + gx];
      let sum = 0;
      let count = 0;
      for (const [nx, ny] of [
        [gx - 1, gy],
        [gx + 1, gy],
        [gx, gy - 1],
        [gx, gy + 1],
      ]) {
        if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
          sum += lum[ny * gridCols + nx];
          count++;
        }
      }
      const avg = count > 0 ? sum / count : center;
      candidates.push({ gx, gy, score: Math.abs(center - avg) });
    }
  }

  const threshold = 0.04 + (1 - sensitivity) * 0.3;
  let filtered = candidates.filter((c) => c.score >= threshold);
  if (filtered.length === 0) filtered = candidates; // flat/empty image — still place something rather than nothing

  const rand = mulberry32(seedNum);
  const jittered = filtered.map((c) => ({ ...c, score: c.score + rand() * 0.0001 }));
  jittered.sort((a, b) => b.score - a.score);

  // Greedy non-max suppression — skip a candidate within minDistCells of an
  // already-picked one, so reticles spread across distinct features instead of
  // clustering on the same one.
  const picked: Candidate[] = [];
  const minDistCells = Math.max(1, Math.min(gridCols, gridRows) * 0.12);
  for (const c of jittered) {
    if (picked.length >= maxCount) break;
    if (picked.some((p) => Math.hypot(p.gx - c.gx, p.gy - c.gy) < minDistCells)) continue;
    picked.push(c);
  }

  return picked.map((c) => {
    const cx = (c.gx + 0.5) * cellW;
    const cy = (c.gy + 0.5) * cellH;
    const strength = Math.min(1, c.score / (threshold * 2.5));
    const boxSize = cellW * (1.4 + strength * 2.2);
    return { x: cx - boxSize / 2, y: cy - boxSize / 2, w: boxSize, h: boxSize };
  });
}

/**
 * Draws sci-fi tracking reticles + fake coordinate labels onto `ctx` at box (x, y, w,
 * h), placed on real detected high-contrast regions of `source` (already-rendered,
 * box-local, unrotated pixels — see detectBlobs) rather than at random. `ctx` itself
 * can be rotated/translated (drawBlobTrackerOverlay only ever strokes/fills/draws
 * text, which — unlike getImageData — already respects the current transform); only
 * `source` must be the unrotated box-local buffer to sample from.
 */
export function drawBlobTrackerOverlay(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  params: BlobTrackerEffect,
  seed: string,
): void {
  if (w <= 0 || h <= 0) return;
  const blobs = detectBlobs(source, w, h, params.sensitivity, Math.max(0, Math.round(params.density)), hashStringToSeed(seed));
  const rand = mulberry32(hashStringToSeed(seed + "-labels"));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.lineWidth = 1.5;
  ctx.font = "9px monospace";
  ctx.textBaseline = "bottom";

  const tick = 8;
  blobs.forEach((blob, index) => {
    const boxX = x + blob.x;
    const boxY = y + blob.y;
    const boxW = blob.w;
    const boxH = blob.h;

    // Deterministically hashed per box index (not truly random) — each box gets its
    // own stable hue in "random" mode, same seed-hash-based-not-Math.random rule
    // this app's other seeded-color effects follow.
    const boxColor = params.colorMode === "random" ? `hsl(${hashStringToSeed(`${seed}-${index}`) % 360}, 75%, 55%)` : params.color;
    ctx.strokeStyle = boxColor;
    ctx.fillStyle = boxColor;

    ctx.beginPath();
    ctx.moveTo(boxX, boxY + tick);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + tick, boxY);
    ctx.moveTo(boxX + boxW - tick, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + tick);
    ctx.moveTo(boxX, boxY + boxH - tick);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + tick, boxY + boxH);
    ctx.moveTo(boxX + boxW - tick, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - tick);
    ctx.stroke();

    const label = `X${Math.floor(rand() * 999)
      .toString()
      .padStart(3, "0")}Y${Math.floor(rand() * 999)
      .toString()
      .padStart(3, "0")}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(label, boxX, boxY - 2);
    ctx.globalAlpha = 1;
  });

  ctx.restore();
}
