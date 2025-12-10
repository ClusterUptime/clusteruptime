import { useState, useEffect } from "react";
import { Monitor, useMonitorStore } from "@/lib/store";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/monitor-visuals";
import { Trash2, Save, Activity, Clock, BarChart } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

interface MonitorDetailsSheetProps {
    monitor: Monitor;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MonitorDetailsSheet({ monitor, open, onOpenChange }: MonitorDetailsSheetProps) {
    const { updateMonitor, deleteMonitor, user } = useMonitorStore();
    const [name, setName] = useState(monitor.name);
    const [url, setUrl] = useState(monitor.url);
    const [interval, setInterval] = useState(monitor.interval || 60);
    const [stats, setStats] = useState({ uptime24h: 100, uptime7d: 100, uptime30d: 100 });
    const [latencyData, setLatencyData] = useState([]);
    const [timeRange, setTimeRange] = useState("1h");

    useEffect(() => {
        if (open) {
            setName(monitor.name);
            setUrl(monitor.url);
            setInterval(monitor.interval || 60);
        }
    }, [open, monitor]);

    useEffect(() => {
        if (open && monitor.id) {
            // Fetch Uptime Stats
            fetch(`/api/monitors/${monitor.id}/uptime`)
                .then(res => res.json())
                .then(data => setStats(data))
                .catch(err => console.error("Failed to fetch stats", err));

            // Fetch Latency Data
            fetchLatency(monitor.id, timeRange);
        }
    }, [open, monitor.id, timeRange]);

    const fetchLatency = (id: string, range: string) => {
        fetch(`/api/monitors/${id}/latency?range=${range}`)
            .then(res => res.json())
            .then(data => {
                if (data) {
                    const sortedData = data
                        .map((point: any) => ({
                            ...point,
                            timestamp: new Date(point.timestamp).getTime()
                        }))
                        .sort((a: any, b: any) => a.timestamp - b.timestamp);

                    const filledData = fillDataGaps(sortedData, range);
                    setLatencyData(filledData);
                }
            })
            .catch(err => console.error("Failed to fetch latency", err));
    }

    const fillDataGaps = (data: any[], range: string) => {
        if (data.length === 0) return [];

        const now = new Date().getTime();
        let step = 60 * 60 * 1000; // Default 1 hour
        let start = now - 24 * 60 * 60 * 1000;

        if (range === "1h") {
            step = 60 * 1000; // 1 minute
            start = now - 60 * 60 * 1000;
        } else if (range === "7d") {
            step = 60 * 60 * 1000; // 1 hour
            start = now - 7 * 24 * 60 * 60 * 1000;
        } else if (range === "30d") {
            step = 24 * 60 * 60 * 1000; // 1 day (Backend groups by day? Wait, verify store.go logic. Store forces hour for > 25. Let's stick to hour? 30d * 24 = 720 points. Acceptable.)
            // Actually, for 30d, visual gap might be better if per hour? 
            // Let's assume backend returns hourly for 30d too as per previous verify.
            step = 60 * 60 * 1000;
            start = now - 30 * 24 * 60 * 60 * 1000;
        }

        const filled = [];
        const dataMap = new Map(data.map(d => {
            // Round timestamp to nearest step to key match? 
            // Or just check tolerance.
            // Simple approach: Iterate time steps. If we have a point close enough, use it.
            return [d.timestamp, d];
        }));

        // Optimize: Pointer walk
        let dataIndex = 0;
        // Align start to next step boundary to mesh with backend? 
        // Backend groups by pure strftime/time.
        // Let's just walk from calculated Start to Now.

        for (let t = start; t <= now; t += step) {
            // Find point within half a step tolerance
            let found = null;

            // Advance dataIndex until we pass t + step/2
            while (dataIndex < data.length) {
                const point = data[dataIndex];
                const diff = Math.abs(point.timestamp - t);
                if (diff < step / 2) {
                    found = point;
                    break;
                }
                if (point.timestamp > t + step / 2) {
                    break; // Passed
                }
                dataIndex++;
            }

            if (found) {
                if (found.failed) {
                    filled.push({ ...found, latency: null });
                } else {
                    filled.push(found);
                }
            } else {
                filled.push({ timestamp: t, latency: null, failed: false }); // Gap is just gap, not failure? Or unknown? Assume unknown/gap.
            }
        }

        return filled;
    }

    const getFailureZones = (data: any[]) => {
        const zones = [];
        let start = null;

        // Helper to determine step size roughly for zone width
        // Assume consistent step from timeRange logic or measure it?
        // Let's just use adjacent points.

        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            if (point.failed) {
                if (start === null) start = point.timestamp;
            } else {
                if (start !== null) {
                    // Close zone
                    // Extend end to cover the full step? 
                    // AreaChart points are usually "starts" of intervals or instant points.
                    // Let's make the zone span from start timestamp to previous failed timestamp.
                    zones.push({ start, end: data[i - 1].timestamp });
                    start = null;
                }
            }
        }
        // Close trailing zone
        if (start !== null) {
            zones.push({ start, end: data[data.length - 1].timestamp });
        }
        return zones;
    };

    const handleSave = () => {
        updateMonitor(monitor.id, { name, url, interval });
        onOpenChange(false);
    };

    const formatUptime = (val: number) => {
        if (val === 100) return "100%";
        return val.toFixed(2) + "%";
    }

    const formatXAxis = (tickItem: string) => {
        const date = new Date(tickItem);
        const tz = user?.timezone || undefined;

        if (timeRange === "1h") return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz });
        if (timeRange === "24h") return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz });
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });
    }

    const getUptimeColor = (val: number) => {
        if (val >= 98) return "text-emerald-400";
        if (val >= 90) return "text-amber-400";
        return "text-rose-400"; // Red for < 90%
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-[600px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-slate-100">{monitor.name}</SheetTitle>
                        <StatusBadge status={monitor.status} />
                    </div>
                    <SheetDescription className="text-slate-400 font-mono text-xs">
                        ID: {monitor.id}
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="metrics" className="w-full">
                    <TabsList className="bg-slate-900 border border-slate-800 w-full grid grid-cols-3">
                        <TabsTrigger value="metrics">Metrics</TabsTrigger>
                        <TabsTrigger value="events">Events</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="metrics" className="mt-6 space-y-6">
                        {/* Uptime Cards */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-900 border border-slate-800 rounded p-3 text-center">
                                <span className="text-xs text-slate-500 block mb-1">24h Uptime</span>
                                <span className={`text-lg font-semibold ${getUptimeColor(stats.uptime24h)}`}>{formatUptime(stats.uptime24h)}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded p-3 text-center">
                                <span className="text-xs text-slate-500 block mb-1">7d Uptime</span>
                                <span className={`text-lg font-semibold ${getUptimeColor(stats.uptime7d)}`}>{formatUptime(stats.uptime7d)}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded p-3 text-center">
                                <span className="text-xs text-slate-500 block mb-1">30d Uptime</span>
                                <span className={`text-lg font-semibold ${getUptimeColor(stats.uptime30d)}`}>{formatUptime(stats.uptime30d)}</span>
                            </div>
                        </div>

                        {/* Latency Chart */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <BarChart className="w-4 h-4 text-blue-400" /> Response Time
                                </h3>
                                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                                    {["1h", "24h", "7d", "30d"].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setTimeRange(r)}
                                            className={`px-3 py-1 text-xs rounded-md transition-all ${timeRange === r ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-[250px] w-full bg-slate-900/40 border border-slate-800/50 rounded-lg p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={latencyData}>
                                        <defs>
                                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="timestamp"
                                            stroke="#64748b"
                                            fontSize={10}
                                            tickFormatter={formatXAxis}
                                            minTickGap={30}
                                            domain={[
                                                () => {
                                                    const now = new Date().getTime();
                                                    if (timeRange === "1h") return now - 60 * 60 * 1000;
                                                    if (timeRange === "24h") return now - 24 * 60 * 60 * 1000;
                                                    if (timeRange === "7d") return now - 7 * 24 * 60 * 60 * 1000;
                                                    if (timeRange === "30d") return now - 30 * 24 * 60 * 60 * 1000;
                                                    return now - 24 * 60 * 60 * 1000;
                                                },
                                                () => new Date().getTime()
                                            ]}
                                            allowDataOverflow={true}
                                            type="number"
                                            scale="time"
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={10}
                                            tickFormatter={(val) => `${val}ms`}
                                            width={50}
                                            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '6px' }}
                                            itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                                            labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                                            labelFormatter={(label) => {
                                                if (!user?.timezone) return new Date(label).toLocaleString();
                                                return new Date(label).toLocaleString('en-US', { timeZone: user.timezone });
                                            }}
                                            formatter={(value: any) => [value != null ? `${value}ms` : 'Down', 'Latency']}
                                        />

                                        {/* Render red zones for downtime */}
                                        {latencyData.map((entry: any, index: number) => {
                                            if (entry.failed) {
                                                // Find width of this failure slot based on previous/next or step? 
                                                // Simplified: Render a ReferenceArea for this specific timestamp +/- half step? 
                                                // Better: If we have contiguous failures, merge them?
                                                // For now, let's just render a ReferenceArea for each failed point covering its slot.
                                                // But ReferenceArea needs x1, x2.
                                                // We need to pre-calculate zones outside JSX for cleaner render.
                                                return null;
                                            }
                                            return null;
                                        })}

                                        {getFailureZones(latencyData).map((zone: any, i: number) => (
                                            <ReferenceArea
                                                key={i}
                                                x1={zone.start}
                                                x2={zone.end}
                                                fill="#ef4444"
                                                fillOpacity={0.1}
                                                strokeOpacity={0}
                                            />
                                        ))}

                                        <Area
                                            type="monotone"
                                            dataKey="latency"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorLatency)"
                                            isAnimationActive={true}
                                            connectNulls={false} // Ensure line breaks
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="events" className="mt-6 space-y-4">
                        <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Activity Log
                        </h3>
                        {monitor.events && monitor.events.length > 0 ? (
                            <div className="relative border-l border-slate-800 ml-2 space-y-6">
                                {monitor.events.map((event) => (
                                    <div key={event.id} className="ml-6 relative">
                                        <div className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-slate-950 ${event.type === 'up' ? 'bg-green-500' :
                                            event.type === 'down' ? 'bg-red-500' : 'bg-yellow-500'
                                            }`} />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(event.timestamp).toLocaleString()}
                                            </span>
                                            <p className="text-sm text-slate-200">{event.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                                No events recorded yet.
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="settings" className="mt-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Display Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} className="bg-slate-900 border-slate-800" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Target URL</Label>
                                <Input value={url} onChange={e => setUrl(e.target.value)} className="bg-slate-900 border-slate-800 font-mono text-xs" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Check Frequency</Label>
                                <Select onValueChange={(v) => setInterval(Number(v))} value={interval.toString()}>
                                    <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
                                        <SelectItem value="10" className="cursor-pointer">10 Seconds</SelectItem>
                                        <SelectItem value="30" className="cursor-pointer">30 Seconds</SelectItem>
                                        <SelectItem value="60" className="cursor-pointer">1 Minute</SelectItem>
                                        <SelectItem value="300" className="cursor-pointer">5 Minutes</SelectItem>
                                        <SelectItem value="600" className="cursor-pointer">10 Minutes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500">
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <h3 className="text-sm font-medium text-red-500 mb-2">Danger Zone</h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Deleting this monitor is irreversible. All history will be lost.
                            </p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-900">
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Monitor
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">
                                            This action cannot be undone. This will permanently delete the monitor
                                            <strong> {monitor.name} </strong> and remove all its data.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                deleteMonitor(monitor.id);
                                                onOpenChange(false);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white border-none"
                                        >
                                            Delete Monitor
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TabsContent>

                </Tabs>
            </SheetContent>
        </Sheet>
    )
}
