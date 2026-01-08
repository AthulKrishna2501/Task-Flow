import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Profile, Task } from '@/types/database';
import { Calendar, Clock, CheckCircle, AlertTriangle, TrendingUp, UserX } from 'lucide-react';

interface EmployeePerformance {
  id: string;
  name: string;
  avatar_url: string | null;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  cancelledTasks: number;
  efficiency: number; // Percentage of tasks completed on time
  avgCompletionTime: number; // Average hours to complete tasks
  completionRate: number; // Percentage of tasks completed
  punctualityRate: number; // Percentage of completed tasks that were on time
  performanceScore: number; // Overall score based on all metrics
  performanceRating: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

interface EmployeePerformanceMetricsProps {
  performanceData: EmployeePerformance[];
}

const getPerformanceBadgeVariant = (rating: string) => {
  switch (rating) {
    case 'excellent':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'good':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'average':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'needs_improvement':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPerformanceColor = (rating: string) => {
  switch (rating) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-blue-600';
    case 'average':
      return 'text-yellow-600';
    case 'needs_improvement':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const EmployeePerformanceMetrics = ({ performanceData }: EmployeePerformanceMetricsProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <span>Employee Performance Metrics</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performanceData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No performance data available
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {performanceData.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {employee.avatar_url ? (
                      <img 
                        src={employee.avatar_url} 
                        alt={employee.name} 
                        className="rounded-xl w-10 h-10 object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10 flex items-center justify-center text-gray-500">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{employee.name}</h3>
                      <Badge 
                        className={`text-xs capitalize ${getPerformanceBadgeVariant(employee.performanceRating)}`}
                      >
                        {employee.performanceRating.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overall Score</span>
                      <span className={getPerformanceColor(employee.performanceRating)}>
                        {employee.performanceScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={employee.performanceScore} 
                      className="h-2"
                    />
                    
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completion</span>
                          <span>{employee.completionRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Punctuality</span>
                          <span>{employee.punctualityRate}%</span>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Time</span>
                          <span>{employee.avgCompletionTime.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Overdue</span>
                          <span className="text-red-600">{employee.overdueTasks}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{employee.completedTasks} done</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span>{employee.cancelledTasks} cancelled</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeePerformanceMetrics;