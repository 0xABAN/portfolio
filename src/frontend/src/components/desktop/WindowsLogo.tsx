/** Classic Windows flag (1992–2001), used on the Start button. */
export function WindowsLogo({ className }: { className?: string }) {
	return (
		// eslint-disable-next-line @next/next/no-img-element -- small static brand mark
		<img
			className={className}
			src="/windows-flag.svg"
			alt=""
			width={16}
			height={14}
			draggable={false}
		/>
	);
}
