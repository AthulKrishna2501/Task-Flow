import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/types/database';
import { SortableTaskCard } from './SortableTaskCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
    id: TaskStatus;
    title: string;
    tasks: Task[];
    icon?: React.ReactNode;
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onEdit?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    onRequestDeadlineChange?: (task: Task) => void;
    isLocked?: boolean;
    isAdmin?: boolean;
}

export const KanbanColumn = ({
    id,
    title,
    tasks,
    icon,
    onStatusChange,
    onEdit,
    onDelete,
    onRequestDeadlineChange,
    isLocked = false,
    isAdmin = false,
}: KanbanColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: {
            type: 'Column',
            id: id,
        },
    });

    const statusStyles = {
        todo: "border-t-4 border-slate-500 bg-slate-50 dark:bg-slate-900/40",
        in_progress: "border-t-4 border-blue-500 bg-blue-50 dark:bg-blue-900/40",
        in_review: "border-t-4 border-amber-500 bg-amber-50 dark:bg-amber-900/40",
        completed: "border-t-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40",
        done: "border-t-4 border-green-500 bg-green-50 dark:bg-green-900/40",
    };

    const currentStyle = statusStyles[id] || "border-t-4 border-secondary";

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col h-full min-h-[500px] w-full bg-secondary/30 rounded-lg p-4 transition-all duration-200",
                currentStyle,
                isOver && !isLocked && "ring-2 ring-primary/50 bg-primary/5",
                isLocked && "opacity-80 grayscale-[0.2] cursor-not-allowed bg-secondary/20"
            )}
        >
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <div className="flex flex-col">
                    <h3 className="font-semibold text-lg">{title}</h3>
                </div>
                <span className="ml-auto text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {tasks.length}
                </span>
            </div>
            {/* We use global list for IDs or per-column? 
            SortableContext needs IDs of items *currently* in this list.
        */}
            {/* Drop overlay for column-specific drops */}
            <div className="relative flex-1">
                <SortableContext
                    id={id}
                    items={tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex-1 space-y-3 p-2">
                        {tasks.map((task) => (
                            <SortableTaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={onStatusChange}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onRequestDeadlineChange={onRequestDeadlineChange}
                                isAdmin={isAdmin}
                            />
                        ))}
                        {tasks.length === 0 && (
                            <div className={cn(
                                "h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-sm transition-all duration-200",
                                isOver
                                    ? "border-primary bg-primary/5 text-primary font-medium"
                                    : "border-muted-foreground/20 text-muted-foreground"
                            )}>
                                {isOver ? "Drop here" : "No tasks"}
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};
