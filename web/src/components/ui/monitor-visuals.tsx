import { Badge } from "@/components/ui/badge";
import { Monitor } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";

export const StatusBadge = ({ status }: { status: Monitor['status'] }) => {
    if (status === 'up') {
        return (
            <Badge variant="outline" className="border-green-800 bg-green-950/50 text-green-400 gap-1 px-2 py-1">
                <ArrowUp className="w-3 h-3" />
                Operational
            </Badge>
        );
    }
    if (status === 'down') {
        return (
            <Badge variant="destructive" className="bg-red-950/50 border-red-800 text-red-500 gap-1 px-2 py-1 animate-pulse">
                <ArrowDown className="w-3 h-3" />
                Downtime
            </Badge>
        );
    }
    return (
        <Badge variant="secondary" className="bg-yellow-950/50 border-yellow-800 text-yellow-500 gap-1 px-2 py-1">
            <AlertTriangle className="w-3 h-3" />
            Degraded
        </Badge>
    );
};

export const UptimeHistory = ({ history }: { history: Monitor['history'] }) => {
    // Check if history is null/undefined and default to empty array
    // Also, if it's empty, we might want to render placeholders? 
    // For now, let's just properly map over a safe array.
    const safeHistory = history || [];

    // If it's a new monitor, it might have no history. Let's render empty slots or just nothing?
    // User asked: "rellena con algo diferner" (fill with something different).
    // Let's ensure we display something so layout doesn't collapse.
    // If empty, let's create an array of "empty" states?
    // Actually, backend should return empty array, but it returning null is the bug.
    // Let's just fix the crash first.

    return (
        <div className="flex gap-[2px] h-8 items-end w-full max-w-[200px] sm:max-w-none" title="Last 20 checks">
            {safeHistory.map((status, i) => (
                <div
                    key={i}
                    className={cn(
                        "flex-1 rounded-sm transition-all duration-500",
                        status === 'up' && "bg-green-500/20 hover:bg-green-500/80 h-full",
                        status === 'degraded' && "bg-yellow-500/50 hover:bg-yellow-500 h-3/4",
                        status === 'down' && "bg-red-500/80 hover:bg-red-500 h-full",
                    )}
                />
            ))}
        </div>
    );
};
