import { toggleTaskCompletionAction } from "@/app/actions/tasks";

type TaskStatusFormProps = {
  taskId: string;
  checked: boolean;
};

export function TaskStatusForm({ taskId, checked }: TaskStatusFormProps) {
  return (
    <form action={toggleTaskCompletionAction} className="shrink-0">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="checked" value={String(checked)} />
      <button
        type="submit"
        className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold ${
          checked
            ? "border-pine bg-pine text-[#07100c] shadow-glow"
            : "border-sand bg-[#131a22] text-ink hover:border-pine/30 hover:bg-[#18212b]"
        }`}
        aria-label={checked ? "Mark task as pending" : "Mark task as completed"}
      >
        {checked ? "✓" : ""}
      </button>
    </form>
  );
}
