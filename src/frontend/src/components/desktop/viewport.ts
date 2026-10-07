/**
 * The desktop is laid out on a canvas of at least MIN_WIDTH × MIN_HEIGHT
 * desktop pixels. In a smaller browser window, Desktop applies CSS zoom so that
 * canvas fits, which scales everything inside it, taskbar and menus included.
 *
 * Below 1440 × 810 the arrangement would have to shrink its proportional windows
 * (Paint, the terminal) until fixed-size ones, such as Activity, cover them.
 * The zoom stops at MIN_SCALE, where 11px text is still about 5px; windows
 * narrower than that (under ~720px) get a canvas that no longer fits, and
 * windows run off screen as they would without zoom.
 *
 * Under zoom, layout, inline styles and offsetLeft are in desktop pixels, but
 * pointer positions, getBoundingClientRect and innerWidth stay in screen pixels.
 * Anything that mixes the two converts through toDesktop.
 */
const MIN_WIDTH = 1440;
const MIN_HEIGHT = 810;
const MIN_SCALE = 0.5;

/** The zoom for a screen of this size: 1, or down to MIN_SCALE for screens smaller than the minimum canvas. */
export function desktopScale(screenWidth: number, screenHeight: number) {
	return Math.max(MIN_SCALE, Math.min(1, screenWidth / MIN_WIDTH, screenHeight / MIN_HEIGHT));
}

/** The zoom applied to the desktop, and the desktop's size in desktop pixels. */
export function desktopViewport() {
	const scale = desktopScale(innerWidth, innerHeight);
	return { scale, width: innerWidth / scale, height: innerHeight / scale };
}

/** Converts a screen-pixel length or position, such as a pointer's clientX, to desktop pixels. */
export function toDesktop(screenPixels: number) {
	return screenPixels / desktopViewport().scale;
}
