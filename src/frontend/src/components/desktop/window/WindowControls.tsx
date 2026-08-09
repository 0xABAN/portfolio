type Props = {
	onClose?: () => void;
};

export function WindowControls({ onClose }: Props) {
	return (
		<div className="win-controls">
			<button
				type="button"
				className="win-controls__btn win-controls__btn--close"
				aria-label="Close"
				onClick={onClose}
			>
				×
			</button>
		</div>
	);
}
