import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/TaskCard';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import EmployeePerformanceMetrics from '@/components/EmployeePerformanceMetrics';
import TeamMembers from '@/components/TeamMembers';
import { EmployeePerformance } from '@/lib/performance';
import { Task, TaskStatus, DeadlineRequest, Profile } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ListTodo, Clock, CheckCircle, AlertTriangle, Users, TrendingUp, UserX, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { calculateEmployeePerformance, EmployeePerformance } from '@/lib/performance';

const PAGE_SIZE = 20;

const AdminDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DeadlineRequest[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [performanceData, setPerformanceData] = useState<EmployeePerformance[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [removeEmployeeConfirmOpen, setRemoveEmployeeConfirmOpen] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState<{ id: string; name: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async (isLoadMore = false, isSilent = false) => {
    if (isLoadMore) setLoadingMore(true);
    else if (!isSilent) setLoading(true);

    const currentPage = isLoadMore ? page + 1 : 0;

    try {
      // Fetch tasks with pagination
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (tasksError) throw tasksError;

      const newTasksRaw = tasksData || [];

      // Fetch profiles for assigned users
      const { data: profiles } = await supabase.from('profiles').select('*');
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch all pending deadline requests to highlight on cards
      const { data: allPendingRequests } = await supabase
        .from('deadline_requests')
        .select('task_id')
        .eq('status', 'pending');

      const requestedTaskIds = new Set(allPendingRequests?.map(r => r.task_id) || []);

      // Combine tasks with profiles and request status
      const tasksWithProfiles = newTasksRaw.map(task => ({
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

      setHasMore(newTasksRaw.length === PAGE_SIZE);

      // Only fetch these once or when refreshing (not on load more for tasks necessarily, 
      // but they are small so it's okay for now. Ideally split them)
      if (!isLoadMore) {
        // Fetch pending deadline requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('deadline_requests')
          .select('*')
          .eq('status', 'pending');

        if (requestsError) throw requestsError;
        setPendingRequests((requestsData || []) as DeadlineRequest[]);

        // Fetch all profiles to calculate performance
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) throw profilesError;

        // Calculate performance data
        const calculatedPerformance = calculateEmployeePerformance(tasksWithProfiles as Task[], (profilesData || []) as Profile[]);
        setPerformanceData(calculatedPerformance);

        // Prepare team members data with task metrics
        const enrichedProfiles = (profilesData || []).map(profile => {
          // Count tasks for each user
          const userTasks = tasksWithProfiles.filter(task => task.assigned_user_id === profile.id);
          const totalTasks = userTasks.length;
          const completedTasks = userTasks.filter(task => task.status === 'completed').length;
          const overdueTasks = userTasks.filter(task => {
            if (task.status === 'completed') {
              // Check if completed after deadline
              return task.finish_time && new Date(task.finish_time) > new Date(task.deadline);
            } else {
              // Check if not completed and deadline has passed
              return new Date(task.deadline) < new Date() && task.status !== 'completed';
            }
          }).length;

          return {
            id: profile.id,
            name: profile.full_name || profile.email || 'Unknown User',
            email: profile.email,
            avatar_url: profile.avatar_url,
            is_approved: profile.is_approved || false,
            created_at: profile.created_at,
            totalTasks,
            completedTasks,
            overdueTasks
          };
        });

        setTeamMembers(enrichedProfiles);

        // Fetch team member count
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;
        setTeamCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Get current user ID
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();

    fetchData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('Admin received real-time task update:', payload);
          fetchData(false, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deadline_requests' },
        (payload) => {
          console.log('Admin received real-time request update:', payload);
          fetchData(false, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Admin received real-time profile update:', payload);
          fetchData(false, true);
        }
      )
      // Listen for broadcast as a fallback
      .on('broadcast', { event: 'status-changed' }, (payload) => {
        console.log('Admin received broadcast update:', payload);
        fetchData(false, true);
      })
      .subscribe((status) => {
        console.log('Admin subscription status:', status);
      });

    // Polling fallback every 30 seconds
    const pollingInterval = setInterval(() => {
      console.log('Admin polling for updates...');
      fetchData(false, true);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, []);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      const updates: Record<string, unknown> = { status };

      if (status === 'completed') {
        updates.pending_approval = false;
        // Ensure finish_time is set if it wasn't already (e.g., admin direct move)
        const task = tasks.find(t => t.id === taskId);
        if (task && !task.finish_time) {
          updates.finish_time = new Date().toISOString();
        }
      } else if (status === 'in_review') {
        updates.finish_time = new Date().toISOString();
      } else {
        // If an admin moves it out of completed or into another state, clear pending_approval
        updates.pending_approval = false;

        // If moving to in_progress and no start time, set it
        const task = tasks.find(t => t.id === taskId);
        if (status === 'in_progress' && task && !task.start_time) {
          updates.start_time = new Date().toISOString();
        }
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

      fetchData(false, true);
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

      fetchData(false, true);
    } catch (error) {
      console.error('Error approving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve task',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
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

      fetchData(false, true);
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

  const handleRemoveEmployee = async (employeeId: string) => {
    try {
      // Remove the user from the system by deleting their profile and associated data
      // First, get all tasks assigned to this user and reassign them or clear assignment
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('assigned_user_id', employeeId);

      if (userTasks && userTasks.length > 0) {
        // Option 1: Unassign tasks from this user (keeping them in the system)
        const taskIds = userTasks.map(task => task.id);
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ assigned_user_id: null }) // Or assign to another admin
          .in('id', taskIds);

        if (updateError) throw updateError;
      }

      // Delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', employeeId);

      if (rolesError) throw rolesError;

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeId);

      if (profileError) throw profileError;

      toast({
        title: 'Employee Removed',
        description: `Employee ${employeeToRemove?.name} has been removed from the system`,
      });

      // Refresh the data to reflect changes
      fetchData(false, true);
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove employee',
        variant: 'destructive',
      });
    } finally {
      setRemoveEmployeeConfirmOpen(false);
      setEmployeeToRemove(null);
    }
  };

  const confirmRemoveEmployee = async () => {
    if (!employeeToRemove) return;
    await handleRemoveEmployee(employeeToRemove.id);
  };

  const handleRequestDeadlineChange = (task: Task) => {
    // For admin users, they can directly edit a task to change its deadline
    // So we'll open the create/edit dialog with the task to be edited
    setEditingTask(task);
    setCreateDialogOpen(true);
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.pending_approval).length,
    overdue: tasks.filter(t => {
      // Only tasks with deadline before today (not including today) should be overdue
      // Use Asia/Kolkata timezone for all date operations
      const today = new Date();
      const taskDeadline = new Date(t.deadline);

      // Convert to Asia/Kolkata timezone for comparison
      const todayKolkata = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const deadlineKolkata = new Date(taskDeadline.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      // Create date objects with the same time (00:00:00) for date-only comparison in Kolkata timezone
      const todayNormalized = new Date(todayKolkata.getFullYear(), todayKolkata.getMonth(), todayKolkata.getDate());
      const deadlineNormalized = new Date(deadlineKolkata.getFullYear(), deadlineKolkata.getMonth(), deadlineKolkata.getDate());

      return deadlineNormalized < todayNormalized && t.status !== 'completed';
    }).length,
    completed: tasks.filter(t => t.status === 'completed').length,
    completedLate: tasks.filter(t =>
      t.status === 'completed' &&
      t.finish_time &&
      new Date(t.finish_time) > new Date(t.deadline)
    ).length,
  };

  const recentTasks = tasks.slice(0, 5);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Admin Dashboard"
      description="Overview of all tasks and team activity"
      actions={
        <div className="flex items-center gap-2">

          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate('/admin/tasks')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate('/admin/tasks?filter=pending')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate('/admin/tasks?filter=overdue')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Late</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.completedLate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance Metrics */}
      <EmployeePerformanceMetrics performanceData={performanceData} />

      {/* Team Members */}
      <TeamMembers
        teamMembers={teamMembers}
        onRemoveMember={(memberId, memberName) => {
          setEmployeeToRemove({ id: memberId, name: memberName });
          setRemoveEmployeeConfirmOpen(true);
        }}
      />

      {/* Pending Approvals Alert */}
      {pendingRequests.length > 0 && (
        <Card className="mb-8 border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              {pendingRequests.length} Deadline Request{pendingRequests.length > 1 ? 's' : ''} Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/requests')}>
              Review Requests
            </Button>
          </CardContent>
        </Card>
      )}



      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div
          ref={(el) => {
            if (el && !loadingMore && !loading) {
              const observer = new IntersectionObserver(
                (entries) => {
                  if (entries[0].isIntersecting) {
                    fetchData(true);
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


      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSuccess={() => fetchData(false, true)}
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

      <AlertDialog open={removeEmployeeConfirmOpen} onOpenChange={setRemoveEmployeeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove {employeeToRemove?.name}
              from the system, unassign their tasks, and delete all their profile data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRemoveEmployeeConfirmOpen(false);
              setEmployeeToRemove(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>

  );
};

export default AdminDashboard;
