import "./system-message.css";

export function SystemMessage({ onOkAction }: { onOkAction: () => void }) {
	return (
		<div className="sysmsg">
			<div className="sysmsg__row">
				<span className="sysmsg__icon" aria-hidden>×</span>
				<span className="sysmsg__text">Critical error</span>
			</div>
			<div className="sysmsg__actions">
				<button type="button" className="sysmsg__ok chrome-raised" onClick={onOkAction}>Ok</button>
			</div>
		</div>
	);
}
