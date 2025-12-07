import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useState } from "react";
import { useMonitorStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { APIKeysView } from "./APIKeysView";
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
} from "@/components/ui/alert-dialog"

function ResetDatabaseDialog() {
    const { resetDatabase } = useMonitorStore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleReset = async () => {
        const success = await resetDatabase();
        setOpen(false);
        if (success) {
            toast({ title: "System Reset", description: "Database has been reset. Redirecting..." });
            window.location.reload();
        } else {
            toast({ title: "Error", description: "Failed to reset database", variant: "destructive" });
        }
    };

    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Label className="text-base text-red-400">Reset Database</Label>
                <p className="text-sm text-muted-foreground">
                    Permanently delete all data (monitors, history, users) and restore defaults.
                </p>
            </div>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">Reset Everything</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove your data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-slate-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white">
                            Reset Everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export function SettingsView() {
    const { user, updateUser } = useMonitorStore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const timezone = formData.get("timezone") as string;
        const password = formData.get("password") as string;

        try {
            await updateUser({
                timezone,
                password: password || undefined
            });
            toast({ title: "Settings updated", description: "Your profile has been updated successfully." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your workspace preferences.
                </p>
            </div>
            <Separator />
            <div className="grid gap-6">
                <Card className="bg-slate-900/20 border-slate-800">
                    <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                        <CardDescription>
                            Manage your account preferences and security.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Username</Label>
                                <Input value={user?.name || ''} disabled className="bg-slate-900 border-slate-800 max-w-md" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Timezone</Label>
                                <select
                                    name="timezone"
                                    defaultValue={user?.timezone || 'UTC'}
                                    className="flex h-9 w-full max-w-md rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">America/New_York (EST)</option>
                                    <option value="America/Chicago">America/Chicago (CST)</option>
                                    <option value="America/Denver">America/Denver (MST)</option>
                                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                                    <option value="Europe/London">Europe/London (GMT)</option>
                                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                </select>
                            </div>

                            <Separator />

                            <div className="grid gap-2">
                                <Label>New Password</Label>
                                <Input
                                    name="password"
                                    type="password"
                                    placeholder="Leave empty to keep current"
                                    className="bg-slate-900 border-slate-800 max-w-md"
                                />
                            </div>

                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/20 border-slate-800">
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Customize how the dashboard looks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between max-w-md p-4 border border-slate-800 rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base">Dark Mode</Label>
                                <p className="text-sm text-slate-500">Enable dark theme for the interface.</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Enabled</Button>
                        </div>
                    </CardContent>
                </Card>

                <APIKeysView />

                <Card className="bg-red-950/10 border-red-900/50">
                    <CardHeader>
                        <CardTitle className="text-red-500">Danger Zone</CardTitle>
                        <CardDescription className="text-red-400/60">
                            Destructive actions that cannot be undone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResetDatabaseDialog />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
