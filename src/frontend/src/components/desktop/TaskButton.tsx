import type { TaskbarTask } from "./tasks";

type Props = {
	task: TaskbarTask;
};

export function TaskButton({ task }: Props) {
	return (
		<button
			type="button"
			className={`task-btn${task.active ? " task-btn--active" : ""}`}
			aria-pressed={task.active ?? false}
		>
			{task.label}
		</button>
	);
}
