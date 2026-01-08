import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from '@/components/TaskCard';
import { Task, TaskStatus } from '@/types/database';

interface SortableTaskCardProps {
    task: Task;
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onEdit?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    onRequestDeadlineChange?: (task: Task) => void;
    isAdmin?: boolean;
}

export const SortableTaskCard = ({
    task,
    onStatusChange,
    onEdit,
    onDelete,
    onRequestDeadlineChange,
    isAdmin = false,
}: SortableTaskCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms ease',
        opacity: isDragging ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none', // Prevent scrolling while dragging on touch devices
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
            {/* 
         TaskCard itself has buttons that need to be clickable.
         dnd-kit handles this well, but we need to ensure the drag handle doesn't block interactions.
         By applying listeners to the container, the whole card is a handle.
         Buttons inside will stop propagation if they handle clicks.
         However, dnd-kit usually needs activation constraints (like distance) to allow clicks.
      */}
            <TaskCard
                task={task}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onRequestDeadlineChange={onRequestDeadlineChange}
                isAdmin={isAdmin}
            />
        </div>
    );
};
