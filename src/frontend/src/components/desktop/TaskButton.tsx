import type { TaskbarTask } from "./Taskbar";

type Props = {
	task: TaskbarTask;
};

export function TaskButton({ task }: Props) {
	return (
		<button
			type="button"
			className={`task-btn ${task.active ? "task-btn--active chrome-sunken" : "chrome-raised"}`}
			aria-pressed={task.active ?? false}
		>
			{task.label}
		</button>
	);
}
