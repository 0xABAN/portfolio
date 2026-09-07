import assert from "node:assert/strict";
import { test } from "node:test";
import {
	branchMatrix, composeMatrix, easeOffset, hoverOffset, invertMatrix,
	transformPoint, viewportMatrix,
} from "./fractureInteraction";
import { findEdgeHit } from "./fractureParticles";

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test("slice mapping and anisotropic branch growth preserve the impact and invert correctly", () => {
	for (const [width, height] of [[1920, 1044], [600, 1000]]) {
		const viewport = viewportMatrix(width, height);
		const branch = branchMatrix(Math.PI / 4, 7, 1.06, 1.35);
		const matrix = composeMatrix(viewport, branch);
		const center = transformPoint(matrix, { x: 800, y: 500 });
		close(center.x, width / 2);
		close(center.y, height / 2);
		const source = { x: 380, y: 190 };
		const inverse = invertMatrix(matrix)!;
		const restored = transformPoint(inverse, transformPoint(matrix, source));
		close(restored.x, source.x);
		close(restored.y, source.y);
	}
	const horizontal = branchMatrix(0, 0, 1.06, 1.35);
	close(transformPoint(horizontal, { x: 900, y: 500 }).x, 906);
	close(transformPoint(horizontal, { x: 800, y: 520 }).y, 527);
	assert.equal(invertMatrix({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 }), null);
});

test("hover follows transformed edges with consistent visible pull across viewport sizes", () => {
	const outline = [{ x: 380, y: 190 }];
	for (const [width, height] of [[1920, 1044], [600, 1000]]) {
		const matrix = composeMatrix(viewportMatrix(width, height), branchMatrix(-2.4, -7, 1.06, 1.35));
		const edge = transformPoint(matrix, outline[0]);
		const offset = hoverOffset({ x: edge.x + 60, y: edge.y }, outline, matrix);
		close(offset.x, 14);
		close(offset.y, 0);
		assert.deepEqual(hoverOffset({ x: edge.x + 201, y: edge.y }, outline, matrix), { x: 0, y: 0 });
		assert.deepEqual(hoverOffset(edge, outline, matrix), { x: 0, y: 0 });
		const renderedEdge = { x: edge.x + offset.x, y: edge.y + offset.y };
		assert.deepEqual(findEdgeHit({ x: renderedEdge.x - 30, y: renderedEdge.y }, { x: renderedEdge.x + 30, y: renderedEdge.y }, [renderedEdge], 18), renderedEdge);
	}
});

test("hover easing responds within 100ms and is independent of frame cadence", () => {
	const target = { x: 14, y: -8 };
	const single = easeOffset({ x: 0, y: 0 }, target, 100);
	assert.ok(single.x > target.x * 0.6);
	for (const frames of [3, 6, 12]) {
		let current = { x: 0, y: 0 };
		for (let i = 0; i < frames; i++) current = easeOffset(current, target, 100 / frames);
		close(current.x, single.x);
		close(current.y, single.y);
	}
	assert.ok(easeOffset(single, { x: 0, y: 0 }, 100).x < single.x * 0.4);
	assert.deepEqual(easeOffset(single, target, 0), single);
});
