import { StartButton } from "./StartButton";
import { TaskButton } from "./TaskButton";

export type TaskbarTask = {
	id: string;
	label: string;
	active?: boolean;
};

type Props = {
	tasks: TaskbarTask[];
};

export function Taskbar({ tasks }: Props) {
	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				<StartButton />
				<div className="taskbar__tasks">
					{tasks.map((task) => (
						<TaskButton key={task.id} task={task} />
					))}
				</div>
			</div>
			<div className="taskbar__tray chrome-sunken" aria-label="System tray">
				<span className="taskbar__clock">4:20 PM</span>
			</div>
		</footer>
	);
}
