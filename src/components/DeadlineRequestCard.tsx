import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { DeadlineRequest } from '@/types/database';
import { format } from 'date-fns';
import { Calendar, ArrowRight, User, MessageSquare, Check, X } from 'lucide-react';

interface DeadlineRequestCardProps {
  request: DeadlineRequest;
  isAdmin?: boolean;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
}

export const DeadlineRequestCard = ({
  request,
  isAdmin = false,
  onApprove,
  onReject,
}: DeadlineRequestCardProps) => {
  const isPending = request.status === 'pending';

  return (
    <Card className="animate-fade-in transition-all duration-200 hover:shadow-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {request.task?.task_name || 'Task'}
            </h3>
            {request.requester && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{request.requester.full_name || request.requester.email}</span>
              </div>
            )}
          </div>
          <StatusBadge status={request.status} />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Deadline change visual */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="line-through text-muted-foreground">
              {format(new Date(request.current_deadline), 'MMM d, yyyy')}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Calendar className="h-4 w-4 text-status-progress" />
            <span className="text-status-progress">
              {format(new Date(request.requested_deadline), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Reason
          </div>
          <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
            {request.reason}
          </p>
        </div>

        {/* Admin actions */}
        {isAdmin && isPending && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => onApprove?.(request.id)}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onReject?.(request.id)}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}

        {/* Request date */}
        <p className="text-xs text-muted-foreground">
          Requested {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
        </p>
      </CardContent>
    </Card>
  );
};
