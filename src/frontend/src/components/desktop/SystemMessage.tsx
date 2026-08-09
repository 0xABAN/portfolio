import "./system-message.css";

type Props = {
	onOk: () => void;
};

export function SystemMessage({ onOk }: Props) {
	return (
		<div className="sysmsg">
			<div className="sysmsg__row">
				<span className="sysmsg__icon" aria-hidden>
					×
				</span>
				<span className="sysmsg__text">Critical error</span>
			</div>
			<div className="sysmsg__actions">
				<button
					type="button"
					className="sysmsg__ok chrome-raised"
					onClick={onOk}
				>
					Ok
				</button>
			</div>
		</div>
	);
}
