import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types/database';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { format, subDays, isSameDay, subMonths, isSameMonth, subYears, startOfDay, startOfMonth } from 'date-fns';
import { CheckCircle, Clock, ListTodo, Filter } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface PerformanceChartProps {
    tasks: Task[];
}

type TimeRange = '7d' | '30d' | '6m' | '1y';

export const PerformanceChart = ({ tasks }: PerformanceChartProps) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const chartData = useMemo(() => {
        const now = new Date();
        let data = [];

        if (timeRange === '7d' || timeRange === '30d') {
            const days = timeRange === '7d' ? 7 : 30;
            // Daily grouping
            data = Array.from({ length: days }, (_, i) => {
                const date = subDays(now, days - 1 - i);
                return {
                    date,
                    label: format(date, 'MMM d'),
                    completed: 0,
                };
            });

            tasks.forEach((task) => {
                if (task.status === 'completed' && task.finish_time) {
                    const finishDate = new Date(task.finish_time);
                    const dayStat = data.find(d => isSameDay(d.date, finishDate));
                    if (dayStat) {
                        dayStat.completed += 1;
                    }
                }
            });
        } else {
            // Monthly grouping
            const months = timeRange === '6m' ? 6 : 12;
            data = Array.from({ length: months }, (_, i) => {
                const date = subMonths(now, months - 1 - i);
                return {
                    date,
                    label: format(date, 'MMM'),
                    completed: 0,
                };
            });

            tasks.forEach((task) => {
                if (task.status === 'completed' && task.finish_time) {
                    const finishDate = new Date(task.finish_time);
                    const monthStat = data.find(d => isSameMonth(d.date, finishDate));
                    if (monthStat) {
                        monthStat.completed += 1;
                    }
                }
            });
        }

        return data;
    }, [tasks, timeRange]);

    const stats = useMemo(() => {
        const now = new Date();
        const startDate =
            timeRange === '7d' ? subDays(now, 7) :
                timeRange === '30d' ? subDays(now, 30) :
                    timeRange === '6m' ? subMonths(now, 6) :
                        subYears(now, 1);

        const completedTasks = tasks.filter(t => {
            if (t.status !== 'completed' || !t.finish_time) return false;
            const finishDate = new Date(t.finish_time);
            return finishDate >= startDate;
        });

        const totalCompleted = completedTasks.length;

        if (totalCompleted === 0) return { onTimeRate: 0, totalCompleted: 0 };

        const onTimeTasks = completedTasks.filter(t => {
            const finishTime = new Date(t.finish_time!);
            const deadline = new Date(t.deadline);
            return finishTime <= deadline;
        });

        return {
            onTimeRate: Math.round((onTimeTasks.length / totalCompleted) * 100),
            totalCompleted,
        };
    }, [tasks, timeRange]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border text-popover-foreground shadow-md rounded-lg p-3 text-sm">
                    <p className="font-semibold mb-1">{label}</p>
                    <p className="text-primary font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {payload[0].value} Task{payload[0].value !== 1 ? 's' : ''} Completed
                    </p>
                </div>
            );
        }
        return null;
    };

    if (stats.totalCompleted === 0) {
        return (
            <div className="mb-8">
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center h-[200px] text-center">
                        <ListTodo className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                        <h3 className="font-semibold text-lg text-muted-foreground">No Activity Yet</h3>
                        <p className="text-sm text-muted-foreground/80">Complete tasks to see your productivity insights here.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
            {/* Chart */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            Productivity Overview
                        </CardTitle>
                        <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                            <SelectTrigger className="w-[140px] h-8">
                                <Filter className="h-3.5 w-3.5 mr-2" />
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="6m">Last 6 Months</SelectItem>
                                <SelectItem value="1y">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                                <Bar dataKey="completed" radius={[4, 4, 0, 0]} maxBarSize={50} fill="url(#colorCompleted)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="space-y-4">
                <Card className="flex flex-col justify-center bg-primary/5 border-none shadow-none">
                    <CardContent className="pt-6 text-center">
                        <div className="mb-2 flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/5">
                                <CheckCircle className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-primary mb-1">{stats.totalCompleted}</div>
                        <p className="text-sm text-muted-foreground font-medium">Total Completed Tasks</p>
                    </CardContent>
                </Card>

                <Card className="flex flex-col justify-center bg-green-500/5 border-none shadow-none">
                    <CardContent className="pt-6 text-center">
                        <div className="mb-2 flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center ring-4 ring-green-500/5">
                                <Clock className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-green-600 mb-1">{stats.onTimeRate}%</div>
                        <p className="text-sm text-muted-foreground font-medium">On-Time Completion Rate</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
