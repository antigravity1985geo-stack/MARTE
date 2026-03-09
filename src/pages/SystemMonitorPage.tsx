import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSystemMonitor } from '@/hooks/useSystemMonitor';
import { useActivityLogs } from '@/hooks/useActivityLog';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
    Activity, ShieldCheck, Database, Zap, Clock, Users,
    ArrowUpRight, AlertCircle, CheckCircle2, Loader2, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityLog } from '@/hooks/useActivityLog';
import { OperationStat } from '@/hooks/useSystemMonitor';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function SystemMonitorPage() {
    const { health, trends, operationStats, isLoading } = useSystemMonitor();
    const { data: recentLogs } = useActivityLogs(10);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <PageTransition>
            <div className="space-y-6 pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            სისტემის მონიტორინგი (BI)
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">მართვის პანელი, სისტემის ჯანმრთელობა და აქტივობის ანალიტიკა</p>
                    </div>
                    <Badge variant="outline" className="gap-1 px-3 py-1 border-green-500/50 text-green-600 bg-green-50 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                        Live System Healthy
                    </Badge>
                </div>

                {/* Health Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <Badge variant="secondary" className="text-[10px] uppercase">Latency</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">{health?.dbLatency}ms</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                                    Database Response Time
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <Badge variant="secondary" className="text-[10px] uppercase">Uptime</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">{health?.uptime}</p>
                                <Progress value={99.9} className="h-1" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                    <Database className="h-5 w-5" />
                                </div>
                                <Badge variant="secondary" className="text-[10px] uppercase">Storage</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">{health?.storageUsed.split(' / ')[0]}</p>
                                <p className="text-xs text-muted-foreground">Total: {health?.storageUsed.split(' / ')[1]}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                <Badge variant="secondary" className="text-[10px] uppercase">Real-time</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">Active</p>
                                <p className="text-xs text-muted-foreground">Internal Monitoring Enabled</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Trends Chart */}
                    <Card className="lg:col-span-2 shadow-sm border-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                სისტემის დატვირთვა (24h)
                            </CardTitle>
                            <CardDescription>აქტივობების განაწილება საათების მიხედვით</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#0ea5e9"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Operational Distribution (BI) */}
                    <Card className="shadow-sm border-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                საოპერაციო BI
                            </CardTitle>
                            <CardDescription>მოქმედებების ტიპების განაწილება</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={operationStats}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {operationStats.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-2">
                                {(operationStats as OperationStat[]).slice(0, 4).map((stat, i) => (
                                    <div key={stat.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="capitalize">{stat.name}</span>
                                        </div>
                                        <span className="font-medium">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* System Logs Snippet */}
                <Card className="shadow-sm border-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                ბოლო სისტემური მოვლენები
                            </CardTitle>
                            <CardDescription>Activity Log Live Feed</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <a href="/activity-log">Show Full Log</a>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(recentLogs as ActivityLog[])?.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-muted last:border-0 last:pb-0">
                                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${log.action === 'delete' ? 'bg-red-500' :
                                        log.action === 'create' ? 'bg-green-500' : 'bg-blue-500'
                                        }`} />
                                    <div className="flex-1 space-y-0.5">
                                        <p className="text-sm font-medium">
                                            {log.user_name} - {log.action.toUpperCase()} ({log.entity_type})
                                        </p>
                                        <p className="text-xs text-muted-foreground">{log.entity_name || 'System Action'}</p>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(log.created_at).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    );
}
