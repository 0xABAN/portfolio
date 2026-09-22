import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';

// Decoded RGB(A) baselines captured before re-encoding. Overlay is the approved
// d7282a1 artwork; PSP assets are from 826ac95. Do not refresh for compression.
const assets = [
  ['public/photos/street.png', 768, 1360, 3, '41f32e6bc7cd94b568fda0119de1be03f9237db5364094240fca3e9529724ee8'],
  ['public/photos/overlay.png', 943, 1668, 3, '7ac1a299509249a8434bb99a036bbdff414d6b3389fc3ba3d37b3ec86646e406'],
  ['public/icons/psp.png', 1839, 855, 4, '9c1622a00b97486866db8864494c4e63928064efc70f6210f5c9b8045eadd56f'],
  ['public/photos/jobs-image.png', 2560, 1440, 4, 'd4b0cb89fd727a6dd33e5b7269ed59ee2dde3e3102c4afe9a6b545d5c51a98b7'],
  ['public/photos/projects-image.png', 1548, 869, 4, 'f3d2799be0191a0859d324056d7dcafcdfdfd7d068b6aafd3dc0dee42a209036'],
  ['public/photos/amazon.png', 640, 640, 3, '98086ce1642ce435b3c50c156fcd41b839f327428096321b8c5d6102685324cf'],
  ['public/photos/ibm.png', 1008, 1040, 3, '2308705a281e5e44e12ed52920d38a221f42a5f72bca8fc424368540405ed51a'],
];

for (const [file, width, height, channels, expectedHash] of assets) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, channels], `${file}: changed decoded geometry or color channels`);
  assert.equal(createHash('sha256').update(data).digest('hex'), expectedHash, `${file}: decoded pixels changed`);
  console.log(`${file}: ${Math.round((await stat(file)).size / 1024)} KiB, decoded pixels match original PNG`);
}
