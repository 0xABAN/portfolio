import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';

// SHA-256 values of the original PNG decoded RGB pixels.
const assets = [
  ['public/photos/street.png', 768, 1360, 3, '41f32e6bc7cd94b568fda0119de1be03f9237db5364094240fca3e9529724ee8'],
  ['public/photos/overlay.png', 768, 1360, 3, 'c68508ad56c09cccd991bddc278453f5e22eaf14207a3822e8fb8ca2b19aa09f'],
];

for (const [file, width, height, channels, expectedHash] of assets) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, channels], `${file}: changed decoded geometry or color channels`);
  assert.equal(createHash('sha256').update(data).digest('hex'), expectedHash, `${file}: decoded pixels changed`);
  console.log(`${file}: ${Math.round((await stat(file)).size / 1024)} KiB, decoded pixels match original PNG`);
}
