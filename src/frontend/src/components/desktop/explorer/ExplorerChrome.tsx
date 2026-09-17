import "./explorer.css";

type HeaderProps = {
	prefix: "explorer" | "exp";
	menus: readonly string[];
	tools: readonly string[];
	address: string;
};

/** Shared file-browser chrome; each app keeps its existing classes and variants. */
export function ExplorerHeader({ prefix, menus, tools, address }: HeaderProps) {
	return (
		<>
			<div className={`${prefix}__menu`} aria-hidden>
				{menus.map((label) => (
					<span key={label} className={`${prefix}__menu-item`}>
						{label}
					</span>
				))}
			</div>
			<div className={`${prefix}__toolbar`} aria-hidden>
				{tools.map((label) => (
					<span key={label} className={`${prefix}__tool`}>
						{label}
					</span>
				))}
			</div>
			<div className={`${prefix}__address`} aria-hidden>
				<span className={`${prefix}__address-label`}>Address</span>
				<div className={`${prefix}__address-field`}>{address}</div>
			</div>
		</>
	);
}

export function ExplorerStatus({ prefix, count }: { prefix: "explorer" | "exp"; count: number }) {
	return (
		<div className={`${prefix}__status`} aria-live="polite">
			{count} object{count === 1 ? "" : "s"}
		</div>
	);
}
