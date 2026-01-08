import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task, TaskStatus } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface DeadlineDashboardProps {
  isAdmin?: boolean;
}

export const DeadlineDashboard = ({ isAdmin = false }: DeadlineDashboardProps) => {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('deadline', { ascending: true });

      // If not admin, only fetch tasks assigned to current user
      if (!isAdmin && user) {
        query = query.eq('assigned_user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate today's date range using Asia/Kolkata timezone
      const today = new Date();
      const todayKolkata = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const todayNormalized = new Date(todayKolkata.getFullYear(), todayKolkata.getMonth(), todayKolkata.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKolkata = new Date(tomorrow.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const tomorrowNormalized = new Date(tomorrowKolkata.getFullYear(), tomorrowKolkata.getMonth(), tomorrowKolkata.getDate());

      // Separate tasks into today and upcoming
      const todayTasksList: Task[] = [];
      const upcomingTasksList: Task[] = [];

      (data || []).forEach(task => {
        const taskDeadline = new Date(task.deadline);
        const taskDeadlineKolkata = new Date(taskDeadline.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const taskDeadlineNormalized = new Date(taskDeadlineKolkata.getFullYear(), taskDeadlineKolkata.getMonth(), taskDeadlineKolkata.getDate());

        if (taskDeadlineNormalized.getTime() === todayNormalized.getTime()) {
          todayTasksList.push(task as Task);
        } else if (taskDeadlineNormalized.getTime() >= tomorrowNormalized.getTime()) {
          upcomingTasksList.push(task as Task);
        }
      });

      setTodayTasks(todayTasksList);
      setUpcomingTasks(upcomingTasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Today's Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Deadlines
            <Badge variant="secondary" className="ml-auto">
              {todayTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayTasks.length > 0 ? (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium truncate">{task.task_name}</h4>
                    <Badge
                      variant={task.status === 'completed' ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Due: Today</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No tasks due today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Tasks
            <Badge variant="secondary" className="ml-auto">
              {upcomingTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingTasks.length > 0 ? (
            <div className="space-y-3">
              {upcomingTasks.slice(0, 5).map((task) => {
                const deadlineDate = new Date(task.deadline);
                const deadlineKolkata = new Date(deadlineDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                const deadlineNormalized = new Date(deadlineKolkata.getFullYear(), deadlineKolkata.getMonth(), deadlineKolkata.getDate());

                const today = new Date();
                const todayKolkata = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                const todayNormalized = new Date(todayKolkata.getFullYear(), todayKolkata.getMonth(), todayKolkata.getDate());

                const daysDiff = Math.ceil((deadlineNormalized.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24));

                let timeLabel = '';
                if (daysDiff === 1) {
                  timeLabel = 'Tomorrow';
                } else if (daysDiff > 1 && daysDiff <= 7) {
                  timeLabel = `In ${daysDiff} days`;
                } else {
                  timeLabel = deadlineDate.toLocaleDateString();
                }

                return (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium truncate">{task.task_name}</h4>
                      <Badge
                        variant={task.status === 'completed' ? 'default' : 'outline'}
                        className="ml-2"
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {timeLabel}</span>
                      {daysDiff <= 3 && daysDiff > 0 && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                );
              })}
              {upcomingTasks.length > 5 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  + {upcomingTasks.length - 5} more tasks
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No upcoming tasks</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};