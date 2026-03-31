import {
  layoutNextLine,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

export type BoxMeasurement = {
  width: number;
  height: number;
  paddingLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  lineHeight: number;
};

export type PositionedFragment = {
  key: string;
  text: string;
  x: number;
  y: number;
};

type Interval = {
  left: number;
  right: number;
};

type FrameAlphaSample = {
  imageData: ImageData;
  coverage: number;
};

type LayoutOptions = {
  alphaThreshold?: number;
  horizontalPadding?: number;
  minSlotWidth?: number;
  sampleStep?: number;
  verticalPadding?: number;
};

const DEFAULT_ALPHA_THRESHOLD = 10;
const DEFAULT_HORIZONTAL_PADDING = 12;
const DEFAULT_MIN_SLOT_WIDTH = 52;
const DEFAULT_SAMPLE_STEP = 2;
const DEFAULT_VERTICAL_PADDING = 4;

export function measureBox(element: HTMLElement): BoxMeasurement {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  return {
    width: rect.width,
    height: rect.height,
    paddingLeft: parseFloat(styles.paddingLeft) || 0,
    paddingTop: parseFloat(styles.paddingTop) || 0,
    paddingRight: parseFloat(styles.paddingRight) || 0,
    paddingBottom: parseFloat(styles.paddingBottom) || 0,
    lineHeight: parseFloat(styles.lineHeight) || 22.4,
  };
}

export function sampleVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  measurement: BoxMeasurement,
  drawScale = 1,
): FrameAlphaSample | null {
  const width = Math.max(1, Math.round(measurement.width));
  const height = Math.max(1, Math.round(measurement.height));
  if (width <= 0 || height <= 0 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null;
  }

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) return null;

  context.clearRect(0, 0, width, height);

  const drawRect = getContainDrawRect(video.videoWidth, video.videoHeight, width * drawScale, height * drawScale);
  context.drawImage(video, drawRect.x, drawRect.y, drawRect.width, drawRect.height);

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  let opaquePixels = 0;
  const startX = Math.max(0, Math.floor(drawRect.x));
  const endX = Math.min(width - 1, Math.ceil(drawRect.x + drawRect.width));
  const startY = Math.max(0, Math.floor(drawRect.y));
  const endY = Math.min(height - 1, Math.ceil(drawRect.y + drawRect.height));

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const alpha = data[(y * width + x) * 4 + 3]!;
      if (alpha > DEFAULT_ALPHA_THRESHOLD) opaquePixels++;
    }
  }

  const drawArea = Math.max(1, (endX - startX + 1) * (endY - startY + 1));

  return {
    imageData,
    coverage: opaquePixels / drawArea,
  };
}

export function layoutFragmentsFromFrame(
  prepared: PreparedTextWithSegments,
  measurement: BoxMeasurement,
  frame: FrameAlphaSample,
  options: LayoutOptions = {},
): PositionedFragment[] {
  const {
    alphaThreshold = DEFAULT_ALPHA_THRESHOLD,
    horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
    minSlotWidth = DEFAULT_MIN_SLOT_WIDTH,
    sampleStep = DEFAULT_SAMPLE_STEP,
    verticalPadding = DEFAULT_VERTICAL_PADDING,
  } = options;

  const usableLeft = measurement.paddingLeft;
  const usableTop = measurement.paddingTop;
  const usableRight = measurement.width - measurement.paddingRight;
  const usableBottom = measurement.height - measurement.paddingBottom;

  if (usableRight <= usableLeft || usableBottom <= usableTop) return [];

  const fragments: PositionedFragment[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let lineTop = usableTop;
  let fragmentIndex = 0;

  while (lineTop + measurement.lineHeight <= usableBottom) {
    const slots = getTextSlotsForBand(
      frame.imageData,
      usableLeft,
      usableRight,
      lineTop,
      lineTop + measurement.lineHeight,
      alphaThreshold,
      horizontalPadding,
      minSlotWidth,
      sampleStep,
      verticalPadding,
    );

    if (slots.length === 0) {
      lineTop += measurement.lineHeight;
      continue;
    }

    let exhausted = false;
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]!;
      const line = layoutNextLine(prepared, cursor, slot.right - slot.left);
      if (line === null) {
        exhausted = true;
        break;
      }

      fragments.push({
        key: `${fragmentIndex}-${lineTop}-${slot.left}`,
        text: line.text,
        x: Math.round(slot.left),
        y: Math.round(lineTop),
      });
      fragmentIndex++;
      cursor = line.end;
    }

    if (exhausted) break;
    lineTop += measurement.lineHeight;
  }

  return fragments;
}

export function fragmentsEqual(
  previous: PositionedFragment[],
  next: PositionedFragment[],
): boolean {
  if (previous.length !== next.length) return false;
  for (let index = 0; index < previous.length; index++) {
    const left = previous[index]!;
    const right = next[index]!;
    if (left.text !== right.text || left.x !== right.x || left.y !== right.y) {
      return false;
    }
  }
  return true;
}

function getContainDrawRect(
  mediaWidth: number,
  mediaHeight: number,
  boxWidth: number,
  boxHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(boxWidth / mediaWidth, boxHeight / mediaHeight);
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;
  return {
    x: 0,
    y: 0,
    width,
    height,
  };
}

function getTextSlotsForBand(
  imageData: ImageData,
  usableLeft: number,
  usableRight: number,
  bandTop: number,
  bandBottom: number,
  alphaThreshold: number,
  horizontalPadding: number,
  minSlotWidth: number,
  sampleStep: number,
  verticalPadding: number,
): Interval[] {
  const blocked = getBlockedIntervalForBand(
    imageData,
    bandTop,
    bandBottom,
    alphaThreshold,
    horizontalPadding,
    sampleStep,
    verticalPadding,
  );
  if (blocked === null) return [{ left: usableLeft, right: usableRight }];
  return carveTextLineSlots({ left: usableLeft, right: usableRight }, [blocked], minSlotWidth);
}

function getBlockedIntervalForBand(
  imageData: ImageData,
  bandTop: number,
  bandBottom: number,
  alphaThreshold: number,
  horizontalPadding: number,
  sampleStep: number,
  verticalPadding: number,
): Interval | null {
  const { data, width, height } = imageData;
  const sampleTop = Math.max(0, Math.floor(bandTop - verticalPadding));
  const sampleBottom = Math.min(height - 1, Math.ceil(bandBottom + verticalPadding));

  let left = Infinity;
  let right = -Infinity;

  for (let y = sampleTop; y <= sampleBottom; y++) {
    for (let x = 0; x < width; x += sampleStep) {
      const alpha = data[(y * width + x) * 4 + 3]!;
      if (alpha <= alphaThreshold) continue;
      if (x < left) left = x;
      if (x + sampleStep > right) right = x + sampleStep;
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;

  return {
    left: Math.max(0, left - horizontalPadding),
    right: Math.min(width, right + horizontalPadding),
  };
}

function carveTextLineSlots(base: Interval, blocked: Interval[], minSlotWidth: number): Interval[] {
  let slots: Interval[] = [base];

  for (let blockedIndex = 0; blockedIndex < blocked.length; blockedIndex++) {
    const interval = blocked[blockedIndex]!;
    const next: Interval[] = [];
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]!;
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot);
        continue;
      }
      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left });
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right });
    }
    slots = next;
  }

  return slots.filter((slot) => slot.right - slot.left >= minSlotWidth);
}
