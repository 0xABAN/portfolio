const DESIGN_W = 1710;
const DESIGN_H = 900;
const MIN_SCALE = 0.5;

export function desktopScale() {
	return Math.max(MIN_SCALE, Math.min(innerWidth / DESIGN_W, innerHeight / DESIGN_H));
}

export function desktopSize() {
	const scale = desktopScale();
	return { width: innerWidth / scale, height: innerHeight / scale };
}
