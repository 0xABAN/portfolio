import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';

// Decoded RGB(A) baselines captured before re-encoding; psp.png is the new
// pixel-art console, projects-image.png is from 826ac95. Do not refresh for
// compression. The lossy images pin only their geometry, since lossy decoders
// may differ in the last bit: street.webp replaced street.png (PSNR 41.7 dB
// against the original), overlay.jpg ships as delivered, and the PSP's work
// artwork and thumbnails are WebPs sized for the screen (see PERFORMANCE.md).
const assets = [
  ['public/icons/psp.png', 1840, 855, 4, '21f26aab62c77254e0fc8cf8d83f26e2a7b2104268ef9dd99096de0ca2b4991c'],
  ['public/photos/projects-image.png', 1548, 869, 4, 'f3d2799be0191a0859d324056d7dcafcdfdfd7d068b6aafd3dc0dee42a209036'],
  ['public/photos/jobs-image.webp', 1440, 810, 4],
  ['public/photos/amazon.webp', 256, 256, 3],
  ['public/photos/ibm.webp', 256, 256, 3],
  ['public/photos/definitive-multiplayer.webp', 256, 256, 3],
  ['public/photos/street.webp', 768, 1360, 3],
  ['public/photos/overlay.jpg', 768, 1360, 3],
];

for (const [file, width, height, channels, expectedHash] of assets) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, channels], `${file}: changed decoded geometry or color channels`);
  if (expectedHash) assert.equal(createHash('sha256').update(data).digest('hex'), expectedHash, `${file}: decoded pixels changed`);
  console.log(`${file}: ${Math.round((await stat(file)).size / 1024)} KiB, ${expectedHash ? 'decoded pixels match' : 'geometry matches'} the original PNG`);
}
