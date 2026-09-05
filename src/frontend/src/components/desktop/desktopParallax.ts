export function parallaxRatio(position: number, size: number): number {
	if (size <= 0) return 0;
	return Math.max(-1, Math.min(1, (position / size) * 2 - 1));
}
