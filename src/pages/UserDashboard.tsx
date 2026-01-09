import { useEffect, useState, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DeadlineRequestDialog } from '@/components/DeadlineRequestDialog';
import { Task, TaskStatus } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { KanbanBoard } from '@/components/KanbanBoard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';

const UserDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTasks = async (isLoadMore = false, isSilent = false) => {
    if (!user) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else if (!isSilent) {
      setLoading(true);
    }

    const currentPage = isLoadMore ? page + 1 : 0;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_user_id', user.id)
        .order('deadline', { ascending: true })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const newTasks = (data || []) as Task[];

      // Fetch pending deadline requests for these tasks
      const { data: requests } = await supabase
        .from('deadline_requests')
        .select('task_id')
        .eq('requested_by', user.id)
        .eq('status', 'pending');

      const requestedTaskIds = new Set(requests?.map(r => r.task_id) || []);
      const tasksWithRequestStatus = newTasks.map(t => ({
        ...t,
        deadline_requested: requestedTaskIds.has(t.id)
      }));

      if (isLoadMore) {
        setTasks(prev => [...prev, ...tasksWithRequestStatus]);
        setPage(currentPage);
      } else {
        setTasks(tasksWithRequestStatus);
        setPage(0);
      }

      setHasMore(newTasks.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Real-time task change received:', payload);

          fetchTasks(false, true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deadline_requests',
          filter: `requested_by=eq.${user?.id}`
        },
        () => {
          console.log('Real-time request update received');
          fetchTasks(false, true);
        }
      )
      .on('broadcast', { event: 'status-changed' }, () => {
        fetchTasks(false, true);
      })
      .subscribe();

    // Polling fallback every 30 seconds
    const pollingInterval = setInterval(() => {
      console.log('Polling for updates...');
      fetchTasks(false, true);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [user]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updates: any = { status };

      // If moving from completed back to another state, clear finish_time
      if (task.status === 'completed' && status !== 'completed') {
        updates.finish_time = null;
        toast({
          title: 'Task Reopened',
          description: 'Task has been moved back from completed status.',
        });
      }

      // If moving to in_progress, set start time if not already set
      if (status === 'in_progress' && !task.start_time) {
        updates.start_time = new Date().toISOString();
      }

      // If moving back from in_progress to todo, clear start time
      if (task.status === 'in_progress' && status === 'todo') {
        updates.start_time = null;
      }

      // If moving to in_review, set finish time (this signals work is done)
      if (status === 'in_review' && !task.finish_time) {
        updates.finish_time = new Date().toISOString();
      }

      // If marking as completed, clear pending_approval (finish_time is already set by in_review)
      if (status === 'completed') {
        updates.pending_approval = false;
        if (!task.finish_time) {
          updates.finish_time = new Date().toISOString();
        }
      }

      // For any status change initiated by the user, we should probably clear pending_approval
      // if it was set, as they are actively re-working or progressing the task.
      if (task.pending_approval && status !== 'completed') {
        updates.pending_approval = false;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Log for debugging real-time
      console.log('Status updated successfully in DB, fetching tasks locally...');

      // Notify other tabs via broadcast if possible (extra layer)
      await supabase.channel('user-tasks-changes').send({
        type: 'broadcast',
        event: 'status-changed',
        payload: { taskId, status }
      });

      // Show appropriate toast message
      if (task.status !== 'completed' || status === 'completed') {
        toast({
          title: 'Status Updated',
          description: status === 'completed'
            ? 'Task marked as completed!'
            : status === 'in_progress'
              ? 'Task started'
              : status === 'in_review'
                ? 'Task moved to review'
                : 'Task status updated',
        });
      }

      // We still call fetchTasks (isSilent=true) to update local state immediately
      fetchTasks(false, true);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      });
    }
  };

  const handleRequestDeadlineChange = (task: Task) => {
    setSelectedTask(task);
    setRequestDialogOpen(true);
  };



  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.status !== 'completed' || !task.finish_time) {
        return true;
      }
      return isSameDay(new Date(task.finish_time), new Date());
    });
  }, [tasks]);

  if (loading) {
    return (
      <DashboardLayout title="My Tasks">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Tasks"
      description="View and manage your assigned tasks"
      actions={undefined}
    >
      {/* Performance Chart */}
      <PerformanceChart tasks={tasks} />

      <KanbanBoard
        tasks={filteredTasks}
        onStatusChange={handleStatusChange}
        onRequestDeadlineChange={handleRequestDeadlineChange}
        isAdmin={false}
      />

      {hasMore && (
        <div
          ref={(el) => {
            if (el && !loadingMore && !loading) {
              const observer = new IntersectionObserver(
                (entries) => {
                  if (entries[0].isIntersecting) {
                    fetchTasks(true);
                  }
                },
                { threshold: 0.1 }
              );
              observer.observe(el);
            }
          }}
          className="mt-8 flex justify-center pb-12"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-60">Loading More Tasks...</span>
          </div>
        </div>
      )}

      <DeadlineRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        task={selectedTask}
        onSuccess={() => fetchTasks(false, true)}
      />

    </DashboardLayout>
  );
};

export default UserDashboard;

