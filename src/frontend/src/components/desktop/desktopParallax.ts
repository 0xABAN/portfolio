type Point = { x: number; y: number };

export function fractureOffset(
	pointer: Point,
	outline: readonly Point[],
	scale: number,
): Point {
	if (scale <= 0) return { x: 0, y: 0 };
	let nearest = Infinity;
	let dx = 0;
	let dy = 0;
	for (const point of outline) {
		const x = pointer.x - point.x;
		const y = pointer.y - point.y;
		const distance = x * x + y * y;
		if (distance < nearest) {
			nearest = distance;
			dx = x;
			dy = y;
		}
	}

	// Measure reach and travel in screen pixels, even when the SVG is cropped/scaled.
	const distance = Math.sqrt(nearest) * scale;
	const reach = 200;
	if (distance === 0 || distance >= reach) return { x: 0, y: 0 };
	const pull = (Math.min(distance * 0.2, 12) * (1 - distance / reach)) / distance;
	return { x: dx * pull, y: dy * pull };
}
