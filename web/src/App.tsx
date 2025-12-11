import { useState, useEffect } from "react";
import { Routes, Route, useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect as usePageEffect } from "react"; // Alias to avoid conflict if I used it inside Dashboard, effectively just need simple imports
import { AppSidebar } from "./components/layout/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { Separator } from "./components/ui/separator";
import { useMonitorStore } from "./lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { StatusBadge, UptimeHistory } from "./components/ui/monitor-visuals";
import { Button } from "./components/ui/button";
import { Plus, Trash2, LayoutDashboard, ChevronRight } from "lucide-react";
import { CreateMonitorSheet } from "./components/CreateMonitorSheet";
import { CreateGroupSheet } from "./components/CreateGroupSheet";
import { CreateMaintenanceSheet } from "./components/incidents/CreateMaintenanceSheet";
import { MaintenanceView } from "./components/incidents/MaintenanceView";
import { IncidentsView } from "./components/incidents/IncidentsView";
import { CreateIncidentSheet } from "./components/incidents/CreateIncidentSheet";
import { MonitorDetailsSheet } from "./components/MonitorDetailsSheet";
import { NotificationsView } from "./components/notifications/NotificationsView";
import { CreateChannelSheet } from "./components/notifications/CreateChannelSheet";
import { StatusPage } from "./components/status-page/StatusPage";
import { LoginPage } from "./components/auth/LoginPage";
import { SettingsView } from "./components/settings/SettingsView";
import { StatusPagesView } from "./components/status-pages/StatusPagesView";
import { APIKeysPage } from "./components/settings/APIKeysPage";
import { Navigate } from "react-router-dom"; // Import the new sheet
import { Toaster } from "@/components/ui/toaster";

function MonitorCard({ monitor }: { monitor: any }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className="flex flex-col sm:flex-row items-center justify-between p-4 border border-slate-800/40 rounded-lg bg-card/40 hover:bg-card/60 transition-all gap-4 cursor-pointer group w-full"
      >
        <div className="space-y-1 flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-sm group-hover:text-blue-400 transition-colors truncate block" title={monitor.name}>{monitor.name}</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate block opacity-60" title={monitor.url}>{monitor.url}</div>
        </div>

        <div className="flex-none hidden sm:block">
          <UptimeHistory history={monitor.history} />
        </div>

        <div className="flex items-center gap-3 w-[160px] justify-end shrink-0">
          <div className="text-right whitespace-nowrap">
            <div className="text-xs font-mono text-muted-foreground">{monitor.latency}ms</div>
            <div className="text-[10px] text-muted-foreground opacity-50">{monitor.lastCheck}</div>
          </div>
          <StatusBadge status={monitor.status} />
        </div>
      </div>
      <MonitorDetailsSheet monitor={monitor} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </>
  )
}

function MonitorGroup({ group }: { group: any }) {
  const { deleteGroup } = useMonitorStore();

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete group "${group.name}"?`)) {
      deleteGroup(group.id);
    }
  };

  return (
    <Card className="bg-slate-900/20 border-slate-800/40">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{group.name}</CardTitle>
          </div>
          {group.id !== 'default' && (
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-slate-500 hover:text-red-400 hover:bg-red-950/30">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {(!group.monitors || group.monitors.length === 0) ? (
          <div className="text-sm text-slate-500 italic py-2">No monitors in this group.</div>
        ) : (
          group.monitors.map((m: any) => (
            <MonitorCard key={m.id} monitor={m} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

// New Lightweight Group Card for Overview
// New Lightweight Group Card for Overview (Status Page Style)
function GroupOverviewCard({ group }: { group: any }) {
  const navigate = useNavigate();

  const statusColor =
    group.status === 'up' ? 'bg-green-500' :
      group.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';

  const statusText =
    group.status === 'up' ? 'Operational' :
      group.status === 'degraded' ? 'Degraded' : 'Down';

  const statusTextColor =
    group.status === 'up' ? 'text-green-500' :
      group.status === 'degraded' ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card
      onClick={() => navigate(`/groups/${group.id}`)}
      className="group relative flex flex-row items-center justify-between p-4 rounded-xl border-border/50 bg-card/50 hover:bg-accent/50 transition-all duration-300 cursor-pointer overflow-hidden gap-4 shadow-none"
    >
      {/* Hover Glow & Left Border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="flex items-center gap-3 pl-2">
        <div className="font-medium text-foreground group-hover:text-foreground transition-colors">
          {group.name}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className={`text-sm font-medium ${statusTextColor} transition-colors`}>
            {statusText}
          </div>
          <div className="relative flex items-center justify-center">
            {group.status !== 'up' && (
              <span className={`absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75 animate-ping`} />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor}`} />
          </div>
        </div>

        <div className="pl-2 border-l border-border/50">
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </div>
    </Card>
  )
}

function Dashboard() {
  const { groupId } = useParams();
  const { groups, overview, fetchMonitors, fetchOverview } = useMonitorStore();
  const safeGroups = groups || [];

  // Poll for updates based on view
  useEffect(() => {
    // Initial fetch
    if (groupId) {
      fetchMonitors(groupId);
    } else {
      fetchOverview();
    }

    const interval = setInterval(() => {
      if (groupId) {
        fetchMonitors(groupId);
      } else {
        fetchOverview();
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchMonitors, fetchOverview, groupId]);

  if (!groupId) {
    // Overview Mode
    const safeOverview = overview || [];
    const downGroups = safeOverview.filter(g => g.status === 'down').length;
    const degradedGroups = safeOverview.filter(g => g.status === 'degraded').length;
    const isHealthy = downGroups === 0 && degradedGroups === 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {isHealthy ? "All Systems Operational" : "System Issues Detected"}
          </h2>
          <p className={`text-sm ${isHealthy ? 'text-muted-foreground' : 'text-red-400'}`}>
            {isHealthy
              ? `Monitoring ${safeOverview.length} check groups. Everything looks good.`
              : `${downGroups} groups down, ${degradedGroups} degraded.`}
          </p>
        </div>

        {safeOverview.length === 0 && (
          <div className="text-center text-muted-foreground py-10 border border-border/50 rounded-xl bg-slate-900/20">
            No groups found. Create one to get started.
          </div>
        )}
        <div className="grid gap-3">
          {safeOverview.map(group => (
            <GroupOverviewCard key={group.id} group={group} />
          ))}
        </div>
      </div>
    );
  }

  // Detail Mode (Single Group)
  // We filter from 'groups' state which should now contain only this group's data (populated by fetchMonitors(groupId))
  // However, fetchMonitors replaces the whole 'groups' array.
  return (
    <div className="space-y-8">
      {safeGroups.map(group => (
        <MonitorGroup key={group.id} group={group} />
      ))}
    </div>
  )
}

function AdminLayout() {
  const {
    user,
    groups,
    overview,
    checkAuth,
    fetchOverview,
    addIncident,
    addMaintenance,
    addChannel,
    updateUser,
    isAuthChecked,
    addGroup,
    addMonitor
  } = useMonitorStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Ensure overview is loaded for Sidebar
  useEffect(() => {
    fetchOverview();
  }, []);

  const safeGroups = groups || [];

  // Route Guard
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Wait ...
        </div>
      </div>
    )
  }

  if (!user || !user.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isIncidents = location.pathname === '/incidents';
  const isMaintenance = location.pathname === '/maintenance';
  const isNotifications = location.pathname === '/notifications';
  const isSettings = location.pathname === '/settings';
  const isStatusPages = location.pathname === '/status-pages';
  const isApiKeys = location.pathname === '/api-keys';
  const groupId = location.pathname.startsWith('/groups/') ? location.pathname.split('/')[2] : null;
  const activeGroup = groupId ? safeGroups.find(g => g.id === groupId) : null;

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  const pageTitle = isIncidents
    ? "Incidents"
    : isMaintenance
      ? "Maintenance"
      : isNotifications
        ? "Notifications & Integrations"
        : isSettings
          ? "Settings"
          : isStatusPages
            ? "Status Pages"
            : isApiKeys
              ? "API Keys"
              : (activeGroup ? activeGroup.name : "System Overview");

  const existingGroupNames = (overview || groups || []).map(g => g.name);

  return (
    <SidebarProvider>
      <AppSidebar groups={overview || safeGroups} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-800 bg-[#020617]/50 px-4 backdrop-blur sticky top-0 z-10 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="font-semibold">{pageTitle}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isIncidents ? (
              <CreateIncidentSheet onCreate={addIncident} groups={existingGroupNames} />
            ) : isMaintenance ? (
              <CreateMaintenanceSheet onCreate={addMaintenance} groups={existingGroupNames} />
            ) : isNotifications ? (
              <CreateChannelSheet />
            ) : isSettings ? (
              null
            ) : ( // Dashboard
              <>
                {!activeGroup && <CreateGroupSheet onCreate={addGroup} />}
                <CreateMonitorSheet onCreate={addMonitor} groups={existingGroupNames} />
              </>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 pt-0">
          <main className="max-w-5xl mx-auto space-y-6 py-6">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups/:groupId" element={<Dashboard />} />
              <Route path="/incidents" element={<IncidentsView />} />
              <Route path="/maintenance" element={<MaintenanceView />} />
              <Route path="/notifications" element={<NotificationsView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/status-pages" element={<StatusPagesView />} />
              <Route path="/api-keys" element={<APIKeysPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}

const App = () => {
  const { checkAuth } = useMonitorStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/status/:slug" element={<StatusPage />} />
      <Route path="/*" element={<AdminLayout />} />
    </Routes>
  );
};

export default App;
