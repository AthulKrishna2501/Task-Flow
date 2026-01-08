import { Badge } from '@/components/ui/badge';
import { TaskStatus, RequestStatus } from '@/types/database';
import { Circle, Clock, Eye, CheckCircle, CheckCheck, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus | RequestStatus;
  showIcon?: boolean;
}

const taskStatusConfig: Record<TaskStatus, { label: string; variant: 'todo' | 'progress' | 'review' | 'done' | 'completed'; icon: React.ReactNode }> = {
  todo: { label: 'To Do', variant: 'todo', icon: <Circle className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', variant: 'progress', icon: <Clock className="h-3 w-3" /> },
  in_review: { label: 'In Review', variant: 'review', icon: <Eye className="h-3 w-3" /> },
  done: { label: 'Done', variant: 'done', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', variant: 'completed', icon: <CheckCheck className="h-3 w-3" /> },
};

const requestStatusConfig: Record<RequestStatus, { label: string; variant: 'pending' | 'done' | 'destructive'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'pending', icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'done', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rejected', variant: 'destructive', icon: <Circle className="h-3 w-3" /> },
};

export const StatusBadge = ({ status, showIcon = true }: StatusBadgeProps) => {
  const isTaskStatus = status in taskStatusConfig;
  const config = isTaskStatus 
    ? taskStatusConfig[status as TaskStatus]
    : requestStatusConfig[status as RequestStatus];

  return (
    <Badge variant={config.variant as any} className="gap-1.5">
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};
