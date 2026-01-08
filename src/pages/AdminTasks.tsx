import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskCard } from '@/components/TaskCard';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { Task, TaskStatus, Profile } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminTasks = () => {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchTasks = async (isLoadMore = false, isSilent = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else if (!isSilent) {
        setLoading(true);
      }

      const currentPage = isLoadMore ? page + 1 : 0;

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      // Fetch profiles for assigned users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch pending deadline requests
      const { data: allPendingRequests } = await supabase
        .from('deadline_requests')
        .select('task_id')
        .eq('status', 'pending');

      const requestedTaskIds = new Set(allPendingRequests?.map(r => r.task_id) || []);

      // Combine tasks with profiles and request status
      const tasksWithProfiles = (tasksData || []).map(task => ({
        ...task,
        assigned_user: profileMap.get(task.assigned_user_id) as Profile | undefined,
        deadline_requested: requestedTaskIds.has(task.id)
      }));

      if (isLoadMore) {
        setTasks(prev => [...prev, ...tasksWithProfiles as Task[]]);
        setPage(currentPage);
      } else {
        setTasks(tasksWithProfiles as Task[]);
        setPage(0);
      }

      setHasMore((tasksData || []).length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
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
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks(false, true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deadline_requests' },
        () => fetchTasks(false, true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchTasks(false, true)
      )
      .subscribe();

    // Polling fallback every 30 seconds
    const pollingInterval = setInterval(() => {
      console.log('Admin tasks polling for updates...');
      fetchTasks(false, true);
    }, 30000);

    // Set filter from URL params
    const filter = searchParams.get('filter');
    if (filter === 'pending') {
      setStatusFilter('pending_approval');
    } else if (filter === 'overdue') {
      setStatusFilter('overdue');
    }

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [searchParams]);

  // Reset member filter when tasks change to ensure valid options
  useEffect(() => {
    // If the currently selected member is not in the task list, reset to 'all'
    if (memberFilter !== 'all' && !tasks.some(task => task.assigned_user_id === memberFilter)) {
      setMemberFilter('all');
    }
  }, [tasks, memberFilter]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      const updates: Record<string, unknown> = { status };

      if (status === 'completed') {
        updates.pending_approval = false;
        updates.finish_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Task status changed to ${status.replace('_', ' ')}`,
      });

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

  const handleApproveCompletion = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed' as TaskStatus,
          pending_approval: false,
          finish_time: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task Approved',
        description: 'Task has been marked as completed',
      });

      fetchTasks(false, true);
    } catch (error) {
      console.error('Error approving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve task',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDeleteId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDeleteId);

      if (error) throw error;

      toast({
        title: 'Task Deleted',
        description: 'Task has been removed',
      });

      fetchTasks(false, true);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setTaskToDeleteId(null);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    // Search filter
    const matchesSearch = task.task_name.toLowerCase().includes(search.toLowerCase()) ||
      task.assigned_user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      task.assigned_user?.email.toLowerCase().includes(search.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'pending_approval') {
      matchesStatus = task.pending_approval;
    } else if (statusFilter === 'overdue') {
      // Only tasks with deadline before today (not including today) should be overdue
      // Use Asia/Kolkata timezone for all date operations
      const today = new Date();
      const taskDeadline = new Date(task.deadline);

      // Convert to Asia/Kolkata timezone for comparison
      const todayKolkata = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const deadlineKolkata = new Date(taskDeadline.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      // Create date objects with the same time (00:00:00) for date-only comparison in Kolkata timezone
      const todayNormalized = new Date(todayKolkata.getFullYear(), todayKolkata.getMonth(), todayKolkata.getDate());
      const deadlineNormalized = new Date(deadlineKolkata.getFullYear(), deadlineKolkata.getMonth(), deadlineKolkata.getDate());

      matchesStatus = deadlineNormalized < todayNormalized && task.status !== 'completed';
    } else if (statusFilter === 'completed_late') {
      // Tasks that are completed but were finished after the deadline
      matchesStatus = task.status === 'completed' &&
        task.finish_time &&
        new Date(task.finish_time) > new Date(task.deadline);
    } else if (statusFilter !== 'all') {
      matchesStatus = task.status === statusFilter;
    }

    // Member filter
    let matchesMember = true;
    if (memberFilter !== 'all') {
      matchesMember = task.assigned_user_id === memberFilter;
    }

    return matchesSearch && matchesStatus && matchesMember;
  });

  if (loading) {
    return (
      <DashboardLayout title="All Tasks">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="All Tasks"
      description="Manage all team tasks"
      actions={
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed_late">Completed Late</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {tasks
              .filter(task => task.assigned_user)
              .map(task => task.assigned_user!)
              .filter((user, index, self) =>
                index === self.findIndex(u => u.id === user.id)
              )
              .map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isAdmin
            onStatusChange={handleStatusChange}
            onEdit={(task) => {
              setEditingTask(task);
              setCreateDialogOpen(true);
            }}
            onDelete={handleDeleteTask}
            onApprove={handleApproveCompletion}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No tasks found</p>
          {statusFilter !== 'all' && (
            <Button variant="outline" onClick={() => setStatusFilter('all')}>
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div
          ref={(el) => {
            if (el && !loadingMore && !loading) {
              const observer = new IntersectionObserver(
                (entries) => {
                  if (entries[0].isIntersecting) {
                    // Only trigger if we're not currently filtering, or at least handle it
                    // Infinite scroll usually works best with the full list or filtered list
                    // fetchTasks handles the current filter because it doesn't clear tasks on isLoadMore
                    fetchTasks(true);
                  }
                },
                { threshold: 0.1 }
              );
              observer.observe(el);
            }
          }}
          className="mt-8 flex justify-center py-8"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-60">Loading More Tasks...</span>
          </div>
        </div>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSuccess={() => fetchTasks(false, true)}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminTasks;
