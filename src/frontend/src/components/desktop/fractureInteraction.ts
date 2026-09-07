export type Point = { x: number; y: number };
export type Affine = { a: number; b: number; c: number; d: number; e: number; f: number };

/** Apply inner first, then outer (the same order as Canvas and DOMMatrix). */
export function composeMatrix(outer: Affine, inner: Affine): Affine {
	return {
		a: outer.a * inner.a + outer.c * inner.b,
		b: outer.b * inner.a + outer.d * inner.b,
		c: outer.a * inner.c + outer.c * inner.d,
		d: outer.b * inner.c + outer.d * inner.d,
		e: outer.a * inner.e + outer.c * inner.f + outer.e,
		f: outer.b * inner.e + outer.d * inner.f + outer.f,
	};
}

export function invertMatrix(matrix: Affine): Affine | null {
	const { a, b, c, d, e, f } = matrix;
	const determinant = a * d - b * c;
	if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;
	return { a: d / determinant, b: -b / determinant, c: -c / determinant,
		d: a / determinant, e: (c * f - d * e) / determinant, f: (b * e - a * f) / determinant };
}

export function transformPoint(matrix: Affine, point: Point): Point {
	return { x: matrix.a * point.x + matrix.c * point.y + matrix.e,
		y: matrix.b * point.x + matrix.d * point.y + matrix.f };
}

/** Matches the artwork's 1600×1000 xMidYMid slice viewBox in CSS pixels. */
export function viewportMatrix(width: number, height: number): Affine {
	const scale = Math.max(width / 1600, height / 1000);
	return { a: scale, b: 0, c: 0, d: scale, e: (width - 1600 * scale) / 2, f: (height - 1000 * scale) / 2 };
}

/** Stretch along/across a branch's radial axis, then rotate around the impact. */
export function branchMatrix(angleRadians: number, rotationDegrees: number, expansion: number, thickness: number): Affine {
	const x = Math.cos(angleRadians);
	const y = Math.sin(angleRadians);
	const stretch = { a: expansion * x * x + thickness * y * y,
		b: (expansion - thickness) * x * y, c: (expansion - thickness) * x * y,
		d: expansion * y * y + thickness * x * x, e: 0, f: 0 };
	const rotation = rotationDegrees * Math.PI / 180;
	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);
	const matrix = composeMatrix({ a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }, stretch);
	matrix.e = 800 - matrix.a * 800 - matrix.c * 500;
	matrix.f = 500 - matrix.b * 800 - matrix.d * 500;
	return matrix;
}

/** Return CSS-pixel attraction; exclude the current hover offset from the matrix. */
export function hoverOffset(pointer: Point, outline: readonly Point[], ambientScreenMatrix: Affine): Point {
	let nearest = Infinity;
	let dx = 0;
	let dy = 0;
	for (const point of outline) {
		const x = pointer.x - (ambientScreenMatrix.a * point.x + ambientScreenMatrix.c * point.y + ambientScreenMatrix.e);
		const y = pointer.y - (ambientScreenMatrix.b * point.x + ambientScreenMatrix.d * point.y + ambientScreenMatrix.f);
		const distance = x * x + y * y;
		if (distance < nearest) { nearest = distance; dx = x; dy = y; }
	}
	const distance = Math.sqrt(nearest);
	if (!distance || distance >= 200) return { x: 0, y: 0 };
	const pull = Math.min(distance / 3, 20) * (1 - distance / 200) / distance;
	return { x: dx * pull, y: dy * pull };
}

export function easeOffset(current: Point, target: Point, elapsedMs: number): Point {
	const blend = 1 - Math.exp(-Math.max(0, elapsedMs) / 90);
	return { x: current.x + (target.x - current.x) * blend, y: current.y + (target.y - current.y) * blend };
}
