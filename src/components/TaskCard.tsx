import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Task, TaskStatus } from '@/types/database';
import { format, formatDistanceToNow, isPast, isToday, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { Calendar, Clock, User, AlertTriangle, CheckCircle, Edit, Trash2, MoreVertical, Timer, PlayCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  isAdmin?: boolean;
  deadline_requested?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onRequestDeadlineChange?: (task: Task) => void;
}

export const TaskCard = ({
  task,
  isAdmin = false,
  deadline_requested = false,
  onStatusChange,
  onEdit,
  onDelete,
  onApprove,
  onRequestDeadlineChange,
}: TaskCardProps) => {
  const deadline = new Date(task.deadline);
  // Only consider as overdue if the deadline date is before today (not including today)
  // Use Asia/Kolkata timezone for all date operations
  const today = new Date();
  const deadlineDate = new Date(task.deadline);

  // Convert to Asia/Kolkata timezone for comparison
  const todayKolkata = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const deadlineKolkata = new Date(deadlineDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  // Create date objects with the same time (00:00:00) for date-only comparison in Kolkata timezone
  const todayNormalized = new Date(todayKolkata.getFullYear(), todayKolkata.getMonth(), todayKolkata.getDate());
  const deadlineNormalized = new Date(deadlineKolkata.getFullYear(), deadlineKolkata.getMonth(), deadlineKolkata.getDate());

  const isOverdue = deadlineNormalized < todayNormalized && task.status !== 'completed';
  const isDueToday = isToday(deadline);
  const diffInHours = differenceInHours(deadline, today);
  const isDueSoon = !isOverdue && !isDueToday && diffInHours > 0 && diffInHours <= 48;

  // Check if task was completed late (after deadline)
  const isCompletedLate = task.status === 'completed' && task.finish_time &&
    new Date(task.finish_time) > new Date(task.deadline);

  const getUrgencyColor = () => {
    if (task.status === 'completed') return 'text-muted-foreground';
    if (isOverdue) return 'text-destructive';
    if (isDueToday) return 'text-orange-500';
    if (isDueSoon) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const urgencyColor = getUrgencyColor();

  const getNextStatus = (currentStatus: TaskStatus): TaskStatus | null => {
    // Simplified workflow for users: todo → in_progress → in_review → completed
    const statusFlow: Record<TaskStatus, TaskStatus | null> = {
      todo: 'in_progress',
      in_progress: 'in_review',
      in_review: isAdmin ? 'completed' : null,
      done: null,
      completed: null,
    };
    return statusFlow[currentStatus];
  };

  const getStatusButtonText = (nextStatus: TaskStatus | null): string => {
    if (!nextStatus) return '';
    if (nextStatus === 'in_progress') return 'Start Working';
    if (nextStatus === 'in_review') return 'Ready for Review';
    if (nextStatus === 'completed') return 'Mark as Completed';
    return `Move to ${nextStatus.replace('_', ' ')}`;
  };

  const nextStatus = getNextStatus(task.status);

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-hover animate-fade-in">
      {/* Overdue indicator */}
      {isOverdue && task.status !== 'completed' && (
        <div className="absolute left-0 top-0 h-full w-1.5 bg-destructive animate-pulse" />
      )}
      {!isOverdue && isDueToday && task.status !== 'completed' && (
        <div className="absolute left-0 top-0 h-full w-1.5 bg-orange-500" />
      )}
      {!isOverdue && !isDueToday && isDueSoon && task.status !== 'completed' && (
        <div className="absolute left-0 top-0 h-full w-1.5 bg-amber-500" />
      )}

      <CardHeader className="pb-3 px-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug flex-1" title={task.task_name}>{task.task_name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={task.status} />

              {isAdmin && (
                <div className="flex items-center gap-1 -mr-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(task);
                    }}
                    title="Edit Task"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(task.id);
                    }}
                    title="Delete Task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {(deadline_requested || task.deadline_requested) && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 gap-2 w-full justify-center py-1.5 animate-pulse font-bold shadow-sm">
              <Clock className="h-3.5 w-3.5" />
              <span className="uppercase text-[10px] tracking-wider">Deadline Requested</span>
            </Badge>
          )}

          {task.assigned_user && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 w-fit px-2 py-1 rounded-md">
              <User className="h-3 w-3 shrink-0" />
              <span className="font-medium whitespace-normal">{task.assigned_user.full_name || task.assigned_user.email}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4 px-4">
        <div className="flex flex-col gap-3 pt-3 border-t">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`flex items-center gap-2 font-bold py-1.5 px-3 rounded shadow-sm transition-all ${isDueToday && task.status !== 'completed' ? 'bg-orange-500 text-white shadow-orange-200' : urgencyColor}`}>
              <Calendar className={`h-3.5 w-3.5 shrink-0 ${isOverdue && task.status !== 'completed' ? 'animate-bounce' : ''}`} />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap">
                {isDueToday ? 'Today' : format(deadline, 'MMM d, yyyy')}
              </span>
            </div>

            {!isOverdue && !isCompletedLate && task.status !== 'completed' && !isDueToday && (
              <Badge variant="secondary" className="font-semibold text-[9px] sm:text-[10px] uppercase py-0 px-2.5 h-6 tracking-tight bg-secondary/80">
                {formatDistanceToNow(deadline, { addSuffix: true })}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {isOverdue && task.status !== 'completed' && (
              <Badge variant="destructive" className="gap-1.5 shadow-sm uppercase text-[9px] sm:text-[10px] tracking-widest h-6 px-2.5">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}

            {!isOverdue && isDueToday && task.status !== 'completed' && (
              <Badge className="gap-1.5 bg-orange-600 hover:bg-orange-700 shadow-sm uppercase text-[9px] sm:text-[10px] tracking-widest h-6 px-2.5">
                <Clock className="h-3 w-3" />
                Due Today
              </Badge>
            )}

            {!isOverdue && isDueSoon && task.status !== 'completed' && (
              <Badge className="gap-1.5 bg-amber-600 hover:bg-amber-700 shadow-sm uppercase text-[9px] sm:text-[10px] tracking-widest h-6 px-2.5">
                <Clock className="h-3 w-3" />
                Due Soon
              </Badge>
            )}

            {!isOverdue && isCompletedLate && (
              <Badge variant="destructive" className="gap-1.5 shadow-sm uppercase text-[9px] sm:text-[10px] tracking-widest h-6 px-2.5">
                <AlertTriangle className="h-3 w-3" />
                Completed Late
              </Badge>
            )}

            {/* Completion Duration */}
            {(task.status === 'completed' || (isAdmin && task.status === 'in_review')) && task.finish_time && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold border border-emerald-100 dark:border-emerald-800/50 uppercase tracking-widest h-6 shadow-sm">
                <Timer className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xs:inline">Duration:</span>
                <span>
                  {(() => {
                    const start = task.start_time ? new Date(task.start_time) : new Date(task.created_at);
                    const end = new Date(task.finish_time);
                    const minutes = differenceInMinutes(end, start);
                    const hours = differenceInHours(end, start);
                    const days = differenceInDays(end, start);

                    if (days > 0) return `${days}d`;
                    if (hours > 0) return `${hours}h`;
                    if (minutes > 0) return `${minutes}m`;
                    return '<1m';
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>

        {(task.start_time || task.finish_time) && (
          <div className="flex flex-col gap-3.5 border-t pt-3.5">
            {task.start_time && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-md shrink-0 mt-0.5">
                  <PlayCircle className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold uppercase text-[9px] tracking-[0.1em] text-muted-foreground opacity-70 leading-none mb-1">Started</span>
                  <span className="font-semibold text-foreground/90 text-[11px] sm:text-xs leading-none">
                    {format(new Date(task.start_time), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            )}
            {task.finish_time && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center bg-green-50 dark:bg-green-900/20 rounded-md shrink-0 mt-0.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold uppercase text-[9px] tracking-[0.1em] text-muted-foreground opacity-70 leading-none mb-1">Finished</span>
                  <span className="font-semibold text-foreground/90 text-[11px] sm:text-xs leading-none">
                    {format(new Date(task.finish_time), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending approval indicator */}
        {task.pending_approval && (
          <Badge variant="pending" className="gap-2.5 w-full justify-center py-2 animate-pulse border-none bg-yellow-100/50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="uppercase text-[10px] font-black tracking-[0.15em]">Pending Approval</span>
          </Badge>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          {/* Admin: Approve completion */}
          {isAdmin && task.pending_approval && (
            <Button
              variant="success"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onApprove?.(task.id); }}
              className="w-full gap-2 min-h-[2.75rem] py-2 px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-auto flex flex-row items-center justify-center text-center"
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal leading-tight">Approve Completion</span>
            </Button>
          )}

          {/* Admin: Direct Mark as Completed for reviewed tasks */}
          {isAdmin && task.status === 'in_review' && (
            <Button
              variant="success"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onStatusChange?.(task.id, 'completed'); }}
              className="w-full gap-2 min-h-[2.75rem] py-2 px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-auto flex flex-row items-center justify-center text-center"
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal leading-tight">Mark as Completed</span>
            </Button>
          )}

          {/* User: Update status */}
          {!isAdmin && nextStatus && !task.pending_approval && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onStatusChange?.(task.id, nextStatus); }}
              className="w-full min-h-[2.75rem] py-2 px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all active:scale-[0.98] h-auto flex items-center justify-center text-center"
            >
              <span className="whitespace-normal leading-tight">{getStatusButtonText(nextStatus)}</span>
            </Button>
          )}

          {/* User: Request deadline change */}
          {!isAdmin && task.status !== 'completed' && !task.pending_approval && !(deadline_requested || task.deadline_requested) && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onRequestDeadlineChange?.(task); }}
              className="w-full min-h-[2.75rem] py-2 px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide border-2 hover:bg-secondary/50 transition-all active:scale-[0.98] h-auto flex items-center justify-center text-center"
            >
              <span className="whitespace-normal leading-tight">Request Deadline Change</span>
            </Button>
          )}

          {/* Admin: Change status dropdown */}
          {isAdmin && task.status !== 'completed' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full min-h-[2.75rem] py-2 px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide border-2 hover:bg-secondary/20 transition-all active:scale-[0.98] h-auto flex items-center justify-center text-center">
                  <span className="whitespace-normal leading-tight">Change Status</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {(['todo', 'in_progress', 'in_review', 'completed'] as TaskStatus[]).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onStatusChange?.(task.id, status)}
                    disabled={status === task.status}
                    className="py-2.5"
                  >
                    <div className="w-full flex items-center justify-between">
                      <StatusBadge status={status} />
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>



    </Card>
  );
};

