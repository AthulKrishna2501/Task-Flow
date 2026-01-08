import { Task, Profile } from '@/types/database';

interface EmployeePerformance {
  id: string;
  name: string;
  avatar_url: string | null;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  cancelledTasks: number;  // Tasks that were cancelled
  efficiency: number; // Percentage of tasks completed on time
  avgCompletionTime: number; // Average hours to complete tasks
  completionRate: number; // Percentage of tasks completed (vs still pending)
  punctualityRate: number; // Percentage of completed tasks that were on time
  performanceScore: number; // Overall score based on all metrics (0-100)
  performanceRating: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

// Calculate performance metrics for each employee based on their tasks
export const calculateEmployeePerformance = (tasks: Task[], profiles: Profile[]): EmployeePerformance[] => {
  // Group tasks by user ID
  const tasksByUser = tasks.reduce((acc, task) => {
    const userId = task.assigned_user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Calculate performance metrics for each user
  const performanceData: EmployeePerformance[] = [];

  for (const [userId, userTasks] of Object.entries(tasksByUser)) {
    // Find the profile for this user
    const profile = profiles.find(p => p.id === userId);
    
    if (!profile) continue; // Skip if no profile found for this user

    // Calculate metrics
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = userTasks.filter(task => task.status === 'in_progress').length;
    const todoTasks = userTasks.filter(task => task.status === 'todo').length;
    const reviewTasks = userTasks.filter(task => task.status === 'in_review' || task.status === 'done').length;
    const cancelledTasks = totalTasks - (completedTasks + inProgressTasks + todoTasks + reviewTasks); // Remaining tasks
    
    const overdueTasks = userTasks.filter(task => {
      if (task.status === 'completed') {
        // Check if completed after deadline
        return task.finish_time && new Date(task.finish_time) > new Date(task.deadline);
      } else {
        // Check if not completed and deadline has passed
        return new Date(task.deadline) < new Date() && task.status !== 'completed';
      }
    }).length;

    // Calculate efficiency - percentage of tasks completed on time
    const tasksCompletedOnTime = userTasks.filter(task => {
      return task.status === 'completed' && 
             task.finish_time && 
             new Date(task.finish_time) <= new Date(task.deadline);
    }).length;
    
    const efficiency = totalTasks > 0 ? (tasksCompletedOnTime / totalTasks) * 100 : 0;
    
    // Calculate completion rate
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Calculate punctuality rate (of completed tasks, how many were on time)
    const punctualityRate = completedTasks > 0 ? (tasksCompletedOnTime / completedTasks) * 100 : 0;

    // Calculate average completion time in hours
    let totalCompletionTime = 0;
    let completionTimeCount = 0;
    
    userTasks.forEach(task => {
      if (task.start_time && task.finish_time) {
        const startTime = new Date(task.start_time).getTime();
        const finishTime = new Date(task.finish_time).getTime();
        const durationHours = (finishTime - startTime) / (1000 * 60 * 60); // Convert ms to hours
        totalCompletionTime += durationHours;
        completionTimeCount++;
      }
    });
    
    const avgCompletionTime = completionTimeCount > 0 
      ? totalCompletionTime / completionTimeCount 
      : 0;

    // Calculate comprehensive performance score
    // Weight different factors based on importance
    let score = 0;
    
    // 30% weight to completion rate (higher is better)
    score += (completionRate * 0.3);
    
    // 25% weight to punctuality (on-time completion)
    score += (punctualityRate * 0.25);
    
    // 20% weight to efficiency (overall on-time rate)
    score += (efficiency * 0.2);
    
    // 15% weight to average completion time (with inverse relationship - faster is better)
    // Normalize completion time to a 0-100 scale (assuming max 100 hours to complete a task)
    const timeEfficiency = avgCompletionTime > 0 ? Math.max(0, 100 - (avgCompletionTime * 5)) : 100; // Higher values for faster completion
    score += (timeEfficiency * 0.15);
    
    // 10% weight to low cancellation rate (lower is better)
    const cancellationRate = totalTasks > 0 ? ((cancelledTasks || 0) / totalTasks) * 100 : 0;
    const cancellationScore = 100 - cancellationRate;
    score += (Math.max(0, cancellationScore) * 0.1);

    // Determine performance rating based on overall score
    let performanceRating: 'excellent' | 'good' | 'average' | 'needs_improvement' = 'average';
    
    if (score >= 85) {
      performanceRating = 'excellent';
    } else if (score >= 70) {
      performanceRating = 'good';
    } else if (score >= 50) {
      performanceRating = 'average';
    } else {
      performanceRating = 'needs_improvement';
    }

    performanceData.push({
      id: userId,
      name: profile.full_name || profile.email || 'Unknown User',
      avatar_url: profile.avatar_url,
      totalTasks,
      completedTasks,
      overdueTasks,
      cancelledTasks: cancelledTasks || 0,
      efficiency: parseFloat(efficiency.toFixed(1)),
      avgCompletionTime: parseFloat(avgCompletionTime.toFixed(1)),
      completionRate: parseFloat(completionRate.toFixed(1)),
      punctualityRate: parseFloat(punctualityRate.toFixed(1)),
      performanceScore: parseFloat(score.toFixed(1)),
      performanceRating
    });
  }

  // Sort by performance score
  return performanceData.sort((a, b) => b.performanceScore - a.performanceScore);
};