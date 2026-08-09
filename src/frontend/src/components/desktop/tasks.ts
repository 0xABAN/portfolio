export type TaskbarTask = {
	id: string;
	label: string;
	active?: boolean;
};

/** Open task buttons on the bar — not dock apps. */
export const taskbarTasks: TaskbarTask[] = [
	{ id: "new-age", label: "new age", active: true },
];
