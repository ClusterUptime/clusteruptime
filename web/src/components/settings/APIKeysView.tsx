import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMonitorStore, APIKey } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Copy, Key } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"

export function APIKeysView() {
    const { fetchAPIKeys, createAPIKey, deleteAPIKey } = useMonitorStore();
    const [keys, setKeys] = useState<APIKey[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [newKeyName, setNewKeyName] = useState("");
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        setLoading(true);
        const data = await fetchAPIKeys();
        setKeys(data);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newKeyName) return;
        const key = await createAPIKey(newKeyName);
        if (key) {
            setCreatedKey(key);
            setNewKeyName("");
            loadKeys();
        } else {
            toast({ title: "Error", description: "Failed to create API Key", variant: "destructive" });
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to revoke this API Key?")) {
            await deleteAPIKey(id);
            loadKeys();
            toast({ title: "Revoked", description: "API Key revoked successfully." });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "API Key copied to clipboard" });
    };

    const closeSheet = () => {
        setIsSheetOpen(false);
        setCreatedKey(null);
    };

    return (
        <Card className="bg-slate-900/20 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>
                        Manage API keys for programmatic access to the ClusterUptime API.
                    </CardDescription>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Generate New Key
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SheetHeader>
                            <SheetTitle>Generate New API Key</SheetTitle>
                            <SheetDescription>
                                Give your key a name to identify it later.
                            </SheetDescription>
                        </SheetHeader>

                        {!createdKey ? (
                            <div className="grid gap-4 py-6">
                                <div className="grid gap-2">
                                    <Label>Key Name</Label>
                                    <Input
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        placeholder="e.g. CI/CD Pipeline"
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <Button onClick={handleCreate} disabled={!newKeyName}>Generate Key</Button>
                            </div>
                        ) : (
                            <div className="py-6 space-y-4">
                                <div className="p-4 bg-green-900/20 border border-green-900/50 rounded-lg text-sm text-green-400">
                                    <strong>Success!</strong> Your API Key has been generated.
                                </div>
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Copy this now. It will not be shown again.
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-3 bg-slate-950 rounded border border-slate-800 font-mono text-sm break-all">
                                            {createdKey}
                                        </code>
                                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdKey)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <SheetFooter className="mt-4">
                                    <Button onClick={closeSheet} className="w-full">Done</Button>
                                </SheetFooter>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-4 text-slate-500">Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 italic">
                        No API Keys generated yet.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="w-[150px]">Name</TableHead>
                                <TableHead>Key Prefix</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {keys.map((key) => (
                                <TableRow key={key.id} className="border-slate-800 hover:bg-slate-800/30">
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Key className="w-3 h-3 text-slate-500" />
                                        {key.name}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-slate-400">
                                        {key.keyPrefix}...
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {new Date(key.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)} className="text-slate-500 hover:text-red-400 hover:bg-red-950/30">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
