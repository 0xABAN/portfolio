import { StartButton } from "./StartButton";
import { TaskButton } from "./TaskButton";
import { taskbarTasks } from "./tasks";

export function Taskbar() {
	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				<StartButton />
				<div className="taskbar__tasks">
					{taskbarTasks.map((task) => (
						<TaskButton key={task.id} task={task} />
					))}
				</div>
			</div>
			<div className="taskbar__tray" aria-label="System tray">
				<span className="taskbar__clock">4:20 PM</span>
			</div>
		</footer>
	);
}
