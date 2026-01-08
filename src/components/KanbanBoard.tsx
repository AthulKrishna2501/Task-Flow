import { useState, useMemo, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    rectIntersection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { SortableTaskCard } from './SortableTaskCard';
import { ListTodo, PlayCircle, FileCheck, CheckCircle } from 'lucide-react';

interface KanbanBoardProps {
    tasks: Task[];
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onEdit?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    onRequestDeadlineChange?: (task: Task) => void;
    isAdmin?: boolean;
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export const KanbanBoard = ({
    tasks,
    onStatusChange,
    onEdit,
    onDelete,
    onRequestDeadlineChange,
    isAdmin = false,
}: KanbanBoardProps) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

    const columns: { id: TaskStatus; title: string; icon: React.ReactNode }[] = [
        { id: 'todo', title: 'To Do', icon: <ListTodo className="h-5 w-5 text-muted-foreground" /> },
        { id: 'in_progress', title: 'In Progress', icon: <PlayCircle className="h-5 w-5 text-blue-500" /> },
        { id: 'in_review', title: 'In Review', icon: <FileCheck className="h-5 w-5 text-yellow-500" /> },
        { id: 'completed', title: 'Completed', icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    ];

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            todo: [],
            in_progress: [],
            in_review: [],
            completed: [],
            done: [], // Handle 'done' if it exists, mapping to completed visually or ignored
        };

        localTasks.forEach((task) => {
            // Map 'done' to 'completed' or keep separate? 
            // Existing dashboard treats statuses distinctly.
            // If a task has a status not in our columns, it might disappear. 
            // Let's ensure we handle all known statuses.
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            } else {
                // Fallback or legacy statuses
                if (task.status === 'done' as TaskStatus) {
                    // map done to completed? existing code seemed to ignore 'done' in tabs?
                    // TaskCard logic: in_review -> completed. done -> null.
                    // It implies 'done' might be an old status or alias for completed.
                    // Let's safe guard:
                    if (!grouped['completed']) grouped['completed'] = [];
                    grouped['completed'].push(task);
                }
            }
        });

        return grouped;
    }, [localTasks]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const findContainer = (id: string) => {
        if (columns.some(col => col.id === id)) {
            return id as TaskStatus;
        }
        const task = localTasks.find(t => t.id === id);
        if (task) {
            // Map 'done' to 'completed' for container identification
            if (task.status === 'done' as any) return 'completed' as TaskStatus;
            return task.status;
        }
        return null;
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Restriction: Tasks in 'completed' status cannot be moved back
        if (activeContainer === 'completed') {
            return;
        }

        // Restriction: Non-admins cannot move to completed
        if (!isAdmin && overContainer === 'completed') {
            return;
        }

        setLocalTasks((prevTasks) => {
            const activeIndex = prevTasks.findIndex((t) => t.id === activeId);
            if (activeIndex === -1) return prevTasks;

            console.log(`Moving task ${activeId} from ${activeContainer} to ${overContainer}`);
            const newTasks = [...prevTasks];
            newTasks[activeIndex] = {
                ...prevTasks[activeIndex],
                status: overContainer
            };
            return newTasks;
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeId = active.id as string;

        setActiveId(null);

        if (!over) {
            setLocalTasks(tasks);
            return;
        }

        const activeContainer = findContainer(activeId);
        const overId = over.id as string;
        const overContainer = findContainer(overId);

        if (activeContainer && overContainer) {
            // Restriction: Tasks in 'completed' status cannot be moved back
            if (activeContainer === 'completed' && overContainer !== 'completed') {
                setLocalTasks(tasks);
                return;
            }

            // Final check on drop
            if (!isAdmin && overContainer === 'completed') {
                setLocalTasks(tasks);
                return;
            }

            const finalTask = localTasks.find(t => t.id === activeId);
            const originalTask = tasks.find(t => t.id === activeId);

            if (finalTask && originalTask && finalTask.status !== originalTask.status) {
                console.log(`Persisting status change for ${activeId} to ${finalTask.status}`);
                onStatusChange(activeId, finalTask.status);
            }
        }
    };

    const activeTask = useMemo(
        () => tasks.find((t) => t.id === activeId),
        [activeId, tasks]
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full min-h-[calc(100vh-12rem)]">
                {columns.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        icon={col.icon}
                        tasks={tasksByStatus[col.id] || []}
                        onStatusChange={onStatusChange}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onRequestDeadlineChange={onRequestDeadlineChange}
                        isLocked={!isAdmin && col.id === 'completed'}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeTask ? (
                    <div className="w-full opacity-90 cursor-grabbing transform rotate-2 scale-105 shadow-2xl pointer-events-none">
                        <SortableTaskCard
                            task={activeTask}
                            onStatusChange={() => { }}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onRequestDeadlineChange={() => { }}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
