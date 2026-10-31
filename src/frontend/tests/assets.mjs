import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';

const assets = [
  ['public/psp/console.webp', 1840, 855, 4, '21f26aab62c77254e0fc8cf8d83f26e2a7b2104268ef9dd99096de0ca2b4991c'],
  ['public/psp/projects.webp', 1548, 869, 3, 'ff4fff074e5bfe7bb9fd7d0d4afc17d33b3c9f921fd3ac9b90dea819538e16b6'],
  ['public/psp/jobs.webp', 1440, 810, 4],
  ['public/psp/thumbnails/amazon.webp', 256, 256, 3],
  ['public/psp/thumbnails/ibm.webp', 256, 256, 3],
  ['public/psp/thumbnails/definitive-multiplayer.webp', 256, 256, 3],
  ['public/psp/thumbnails/maestro.webp', 256, 256, 3],
  ['public/desktop/street.webp', 768, 1360, 3],
  ['public/desktop/overlay.jpg', 768, 1360, 3],
];

for (const [file, width, height, channels, expectedHash] of assets) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, channels], `${file}: changed decoded geometry or color channels`);
  if (expectedHash) assert.equal(createHash('sha256').update(data).digest('hex'), expectedHash, `${file}: decoded pixels changed`);
  console.log(`${file}: ${Math.round((await stat(file)).size / 1024)} KiB, ${expectedHash ? 'decoded pixels match' : 'geometry matches'} the original PNG`);
}
