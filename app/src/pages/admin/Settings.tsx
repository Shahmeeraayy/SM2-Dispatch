import { useEffect, useState } from 'react';
import {
    Database,
    AlertCircle,
    RefreshCw,
    Clock,
    Moon,
    Sun,
    Smartphone,
    Monitor,
    Zap,
    Mail,
    FileText,
    ListFilter,
    PlusCircle
} from 'lucide-react';
import { priorityRules as initialPriorityRules } from '@/mock/data';
import { MOCK_DEALERSHIPS } from './Dealerships';
import { MOCK_SERVICES } from './Services';
import type { PriorityRule, UrgencyLevel } from '@/types';





import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import {
    type InvoiceCompanyProfile,
    loadInvoiceCompanyProfile,
    saveInvoiceCompanyProfile,
} from '@/lib/invoice-company';
import {
    fetchAdminInvoiceBrandingSettings,
    getStoredAdminToken,
    updateAdminInvoiceBrandingSettings,
} from '@/lib/backend-api';
import { useAuth } from '@/contexts/AuthContext';



// --- Mock Data & Types ---

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'degraded' | 'online';
type ThemeMode = 'light' | 'dark' | 'system';

interface OperationalSettings {
    callback_timeout_min: number;
    invoice_timeout_min: number;
    parsing_confidence: number;
    unassigned_alert_min: number;
    max_retries: number;
}

const MOCK_SETTINGS: OperationalSettings = {
    callback_timeout_min: 5,
    invoice_timeout_min: 2,
    parsing_confidence: 0.85,
    unassigned_alert_min: 15,
    max_retries: 3
};

interface IntegrationState {
    isConnected: boolean;
    isConnecting: boolean;
    lastSync?: string;
    accountName?: string;
    phoneNumber?: string;
}


// --- Components ---

function StatusBadge({ status }: { status: ConnectionStatus }) {
    const styles = {
        healthy: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30",
        online: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
        connected: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30",
        degraded: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
        reconnecting: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
        down: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30",
        maintenance: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
        disconnected: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
    };

    const labels = {
        healthy: "Healthy",
        online: "Online",
        connected: "Connected",
        degraded: "Degraded",
        reconnecting: "Reconnecting",
        down: "Down",
        maintenance: "Maintenance",
        disconnected: "Disconnected",
    };

    return (
        <Badge variant="outline" className={cn("font-medium", styles[status])}>
            {labels[status]}
        </Badge>
    );
}

const normalizeInvoiceCompanyProfile = (profile: InvoiceCompanyProfile): InvoiceCompanyProfile => ({
    logo_url: profile.logo_url?.trim() || undefined,
    name: profile.name.trim(),
    street_address: profile.street_address.trim(),
    city: profile.city.trim(),
    state: profile.state.trim(),
    zip_code: profile.zip_code.trim(),
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    website: profile.website.trim(),
});



export default function SettingsPage() {
    const { hasBackendAdminToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [savedSettings, setSavedSettings] = useState<OperationalSettings>(MOCK_SETTINGS);
    const [settings, setSettings] = useState<OperationalSettings>(MOCK_SETTINGS);
    const [savedInvoiceCompany, setSavedInvoiceCompany] = useState<InvoiceCompanyProfile>(() => loadInvoiceCompanyProfile());
    const [invoiceCompany, setInvoiceCompany] = useState<InvoiceCompanyProfile>(() => loadInvoiceCompanyProfile());
    const [priorityRules, setPriorityRules] = useState<PriorityRule[]>(initialPriorityRules);
    const [isAddingRule, setIsAddingRule] = useState(false);
    const [newRule, setNewRule] = useState<Partial<PriorityRule>>({
        targetUrgency: 'HIGH',
        rankingScore: 10,
        isActive: true,
        dealershipId: '',
        serviceId: '',
        description: ''
    });

    const { theme, setTheme } = useTheme();



    const [qbState, setQbState] = useState<IntegrationState>({
        isConnected: true,
        isConnecting: false,
        lastSync: '2 hours ago',
        accountName: 'SM2 Dispatch Inc.'
    });

    const [twilioState, setTwilioState] = useState<IntegrationState>({
        isConnected: true,
        isConnecting: false,
        phoneNumber: '+1(555) ***-8821'
    });

    useEffect(() => {
        let cancelled = false;

        const loadInvoiceBrandingSettings = async () => {
            const localProfile = loadInvoiceCompanyProfile();
            setSavedInvoiceCompany(localProfile);
            setInvoiceCompany(localProfile);

            const adminToken = getStoredAdminToken();
            if (!hasBackendAdminToken || !adminToken) {
                return;
            }

            try {
                const backendProfileRaw = await fetchAdminInvoiceBrandingSettings(adminToken);
                if (cancelled) {
                    return;
                }

                const backendProfile = normalizeInvoiceCompanyProfile({
                    logo_url: backendProfileRaw.logo_url ?? undefined,
                    name: backendProfileRaw.name,
                    street_address: backendProfileRaw.street_address,
                    city: backendProfileRaw.city,
                    state: backendProfileRaw.state,
                    zip_code: backendProfileRaw.zip_code,
                    phone: backendProfileRaw.phone,
                    email: backendProfileRaw.email,
                    website: backendProfileRaw.website,
                });

                setSavedInvoiceCompany(backendProfile);
                setInvoiceCompany(backendProfile);
                saveInvoiceCompanyProfile(backendProfile);
            } catch {
                // Keep local storage profile as fallback when backend is unavailable.
            }
        };

        void loadInvoiceBrandingSettings();

        return () => {
            cancelled = true;
        };
    }, [hasBackendAdminToken]);

    const handleSaveSettings = async () => {
        const normalizedCompanyProfile: InvoiceCompanyProfile = normalizeInvoiceCompanyProfile(invoiceCompany);

        if (
            !normalizedCompanyProfile.name ||
            !normalizedCompanyProfile.street_address ||
            !normalizedCompanyProfile.city ||
            !normalizedCompanyProfile.state ||
            !normalizedCompanyProfile.zip_code ||
            !normalizedCompanyProfile.phone ||
            !normalizedCompanyProfile.email ||
            !normalizedCompanyProfile.website
        ) {
            alert("Please complete the full invoice company profile (all fields except logo are required).");
            return;
        }

        setLoading(true);
        try {
            const adminToken = getStoredAdminToken();
            let nextCompanyProfile = normalizedCompanyProfile;

            if (hasBackendAdminToken && adminToken) {
                const backendSavedProfile = await updateAdminInvoiceBrandingSettings(adminToken, normalizedCompanyProfile);
                nextCompanyProfile = normalizeInvoiceCompanyProfile({
                    logo_url: backendSavedProfile.logo_url ?? undefined,
                    name: backendSavedProfile.name,
                    street_address: backendSavedProfile.street_address,
                    city: backendSavedProfile.city,
                    state: backendSavedProfile.state,
                    zip_code: backendSavedProfile.zip_code,
                    phone: backendSavedProfile.phone,
                    email: backendSavedProfile.email,
                    website: backendSavedProfile.website,
                });
            }

            setSavedSettings({ ...settings });
            setSavedInvoiceCompany(nextCompanyProfile);
            setInvoiceCompany(nextCompanyProfile);
            saveInvoiceCompanyProfile(nextCompanyProfile);
            alert("Settings saved successfully.");
        } catch (error) {
            const detail = error instanceof Error ? error.message : "Unable to save settings.";
            alert(`Failed to save invoice branding settings: ${detail}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSettings = () => {
        setSettings({ ...savedSettings });
        setInvoiceCompany({ ...savedInvoiceCompany });
    };

    const handleThemeChange = (newTheme: ThemeMode) => {
        setTheme(newTheme);
        // In real app: update context, persist to backend, update document class
        // useTheme hook handles document class update
    };

    const handleConnectQB = () => {
        setQbState(prev => ({ ...prev, isConnecting: true }));
        // Simulate OAuth flow
        setTimeout(() => {
            setQbState({
                isConnected: true,
                isConnecting: false,
                lastSync: 'Just now',
                accountName: 'SM2 Dispatch Inc.'
            });
            alert("Successfully connected to QuickBooks Online!");
        }, 1500);
    };

    const handleDisconnectQB = () => {
        if (confirm("Are you sure you want to disconnect QuickBooks? This will stop invoice syncing.")) {
            setQbState({
                isConnected: false,
                isConnecting: false
            });
        }
    };

    const handleConnectTwilio = () => {
        setTwilioState(prev => ({ ...prev, isConnecting: true }));
        // Simulate API Key validation
        setTimeout(() => {
            setTwilioState({
                isConnected: true,
                isConnecting: false,
                phoneNumber: '+1(555) ***-8821'
            });
            alert("Successfully connected to Twilio!");
        }, 1200);
    };

    const handleTestIntegration = (integration: string) => {
        alert(`Testing ${integration} connection...`);
    };

    const handleDeleteRule = (id: string) => {
        setPriorityRules(prev => prev.filter(r => r.id !== id));
    };

    const handleToggleRule = (id: string) => {
        setPriorityRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
    };

    const handleAddRule = () => {
        const rule: PriorityRule = {
            id: `rule-${Date.now()}`,
            description: newRule.description || 'New Priority Rule',
            dealershipId: newRule.dealershipId || (MOCK_DEALERSHIPS[0]?.id || ''),
            serviceId: newRule.serviceId === 'any' ? undefined : newRule.serviceId,
            targetUrgency: newRule.targetUrgency || 'HIGH',
            rankingScore: (newRule.rankingScore !== undefined) ? newRule.rankingScore : 10,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setPriorityRules(prev => [...prev, rule]);
        setIsAddingRule(false);
        setNewRule({
            targetUrgency: 'HIGH',
            rankingScore: 10,
            isActive: true,
            dealershipId: '',
            serviceId: '',
            description: ''
        });
    };




    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">

            {/* 1. Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground font-medium">System configuration, integrations, and reliability controls</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                        Last updated: {new Date().toLocaleTimeString()}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">

                {/* Section G - Ranking Rules */}


                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                <ListFilter className="w-4 h-4 text-[#2F8E92]" /> Dispatch Ranking Rules
                            </CardTitle>

                            <Dialog open={isAddingRule} onOpenChange={setIsAddingRule}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-8 bg-[#2F8E92] text-white hover:bg-[#267276]">
                                        <PlusCircle className="w-3.5 h-3.5 mr-2" /> Add Rule
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Create New Ranking Rule</DialogTitle>
                                        <DialogDescription>Define logic to automatically escalate job ranking.</DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Rule Description</Label>
                                            <Input
                                                placeholder="e.g., Prioritize Audi repairs"
                                                value={newRule.description}
                                                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Dealership</Label>
                                                <Select
                                                    value={newRule.dealershipId}
                                                    onValueChange={(v) => setNewRule({ ...newRule, dealershipId: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select dealer" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MOCK_DEALERSHIPS.map(d => (
                                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Service Type</Label>
                                                <Select
                                                    value={newRule.serviceId}
                                                    onValueChange={(v) => setNewRule({ ...newRule, serviceId: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Any Service" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="any">Any Service</SelectItem>
                                                        {MOCK_SERVICES.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Target Urgency</Label>
                                                <Select
                                                    value={newRule.targetUrgency}
                                                    onValueChange={(v) => setNewRule({ ...newRule, targetUrgency: v as UrgencyLevel })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="LOW">Low</SelectItem>
                                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                                        <SelectItem value="HIGH">High</SelectItem>
                                                        <SelectItem value="CRITICAL">Critical</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Ranking Score</Label>
                                                <Input
                                                    type="number"
                                                    value={newRule.rankingScore}
                                                    onChange={(e) => setNewRule({ ...newRule, rankingScore: parseInt(e.target.value) })}
                                                />
                                            </div>

                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsAddingRule(false)}>Cancel</Button>
                                        <Button className="bg-[#2F8E92] text-white hover:bg-[#267276]" onClick={handleAddRule}>Save Rule</Button>
                                    </DialogFooter>

                                </DialogContent>
                            </Dialog>
                        </div>
                        <CardDescription className="text-muted-foreground">Manage rule-based escalation and sorting for inbound jobs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[300px]">Rule & Description</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Ranking</TableHead>
                                        <TableHead className="text-center">Active</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>

                                </TableHeader>
                                <TableBody>
                                    {priorityRules.map(rule => {
                                        const dealer = MOCK_DEALERSHIPS.find(d => d.id === rule.dealershipId);
                                        return (
                                            <TableRow key={rule.id}>
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm text-foreground">{rule.description}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{dealer?.name || 'Global'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "font-bold text-[10px]",
                                                        rule.targetUrgency === 'CRITICAL' ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800" :
                                                            rule.targetUrgency === 'HIGH' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" :
                                                                "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                                    )}>
                                                        {rule.targetUrgency}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="font-mono text-sm">+{rule.rankingScore}</TableCell>

                                                <TableCell className="text-center">
                                                    <Switch
                                                        checked={rule.isActive}
                                                        onCheckedChange={() => handleToggleRule(rule.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                    >
                                                        <AlertCircle className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <FileText className="w-4 h-4 text-[#2F8E92]" /> Invoice Branding
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Edit the full company profile shown on generated invoices and PDFs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="invoice_company_logo_url" className="text-foreground">Logo URL (optional)</Label>
                                <Input
                                    id="invoice_company_logo_url"
                                    value={invoiceCompany.logo_url ?? ''}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, logo_url: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_company_name" className="text-foreground">Company Name</Label>
                                <Input
                                    id="invoice_company_name"
                                    value={invoiceCompany.name}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, name: e.target.value })}
                                    placeholder="SM2 Dispatch"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_company_email" className="text-foreground">Billing Email</Label>
                                <Input
                                    id="invoice_company_email"
                                    type="email"
                                    value={invoiceCompany.email}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, email: e.target.value })}
                                    placeholder="billing@sm2dispatch.com"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="invoice_company_street" className="text-foreground">Street Address</Label>
                                <Input
                                    id="invoice_company_street"
                                    value={invoiceCompany.street_address}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, street_address: e.target.value })}
                                    placeholder="123 Dispatch Ave"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_company_city" className="text-foreground">City</Label>
                                <Input
                                    id="invoice_company_city"
                                    value={invoiceCompany.city}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, city: e.target.value })}
                                    placeholder="Quebec"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_company_state" className="text-foreground">State / Province</Label>
                                <Input
                                    id="invoice_company_state"
                                    value={invoiceCompany.state}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, state: e.target.value })}
                                    placeholder="QC"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_company_zip" className="text-foreground">ZIP / Postal Code</Label>
                                <Input
                                    id="invoice_company_zip"
                                    value={invoiceCompany.zip_code}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, zip_code: e.target.value })}
                                    placeholder="G1A 1A1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_company_phone" className="text-foreground">Phone</Label>
                                <Input
                                    id="invoice_company_phone"
                                    value={invoiceCompany.phone}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, phone: e.target.value })}
                                    placeholder="+1-418-555-0100"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="invoice_company_website" className="text-foreground">Website</Label>
                                <Input
                                    id="invoice_company_website"
                                    value={invoiceCompany.website}
                                    onChange={(e) => setInvoiceCompany({ ...invoiceCompany, website: e.target.value })}
                                    placeholder="https://www.sm2dispatch.com"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section F - Appearance (User Preference) */}


                <Card className="border-border shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Monitor className="w-4 h-4 text-purple-600" /> Appearance
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Customize your interface theme</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Light Mode */}
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={cn(
                                    "flex flex-col items-start p-4 rounded-xl border-2 transition-all hover:bg-muted/50",
                                    theme === 'light' ? "border-[#2F8E92] bg-[#E6F4F4]/30 ring-1 ring-[#2F8E92]" : "border-border bg-card"
                                )}
                            >
                                <div className="mb-3 p-2 bg-gray-100 rounded-lg text-gray-500">
                                    <Sun className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-sm text-foreground">Light Mode</span>
                                <span className="text-xs text-muted-foreground mt-1 text-left">Standard professional light theme</span>
                            </button>

                            {/* Dark Mode */}
                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={cn(
                                    "flex flex-col items-start p-4 rounded-xl border-2 transition-all hover:bg-muted/50 dark:hover:bg-muted/10",
                                    theme === 'dark' ? "border-[#2F8E92] bg-[#E6F4F4]/30 ring-1 ring-[#2F8E92]" : "border-border bg-card"
                                )}
                            >
                                <div className="mb-3 p-2 bg-gray-800 rounded-lg text-gray-400">
                                    <Moon className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-sm text-foreground">Dark Mode</span>
                                <span className="text-xs text-muted-foreground mt-1 text-left">Reduced eye strain for low-light</span>
                            </button>

                            {/* System Mode */}
                            <button
                                onClick={() => handleThemeChange('system')}
                                className={cn(
                                    "flex flex-col items-start p-4 rounded-xl border-2 transition-all hover:bg-muted/50",
                                    theme === 'system' ? "border-[#2F8E92] bg-[#E6F4F4]/30 ring-1 ring-[#2F8E92]" : "border-border bg-card"
                                )}
                            >
                                <div className="mb-3 p-2 bg-muted rounded-lg text-muted-foreground">
                                    <Monitor className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-sm text-foreground">System Default</span>
                                <span className="text-xs text-muted-foreground mt-1 text-left">Sync with device preference</span>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Section C - Operational Thresholds */}
                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Zap className="w-4 h-4 text-amber-600" /> Operational Thresholds
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Configure system timeouts and alert triggers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="callback_timeout" className="text-foreground">Callback Timeout (min)</Label>
                                <Input
                                    id="callback_timeout"
                                    type="number"
                                    value={settings.callback_timeout_min}
                                    onChange={(e) => setSettings({ ...settings, callback_timeout_min: parseInt(e.target.value) })}
                                />
                                <p className="text-[10px] text-muted-foreground">Max wait time for webhook return</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_timeout" className="text-foreground">Invoice Timeout (min)</Label>
                                <Input
                                    id="invoice_timeout"
                                    type="number"
                                    value={settings.invoice_timeout_min}
                                    onChange={(e) => setSettings({ ...settings, invoice_timeout_min: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="parsing_confidence" className="text-foreground">Parsing Confidence Threshold</Label>
                                <Input
                                    id="parsing_confidence"
                                    type="number" step="0.01"
                                    value={settings.parsing_confidence}
                                    onChange={(e) => setSettings({ ...settings, parsing_confidence: parseFloat(e.target.value) })}
                                />
                                <p className="text-[10px] text-muted-foreground">Value between 0.0 and 1.0</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="max_retries" className="text-foreground">Max Retry Attempts</Label>
                                <Select defaultValue={settings.max_retries.toString()} onValueChange={(v) => setSettings({ ...settings, max_retries: parseInt(v) })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select retries" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Attempt</SelectItem>
                                        <SelectItem value="3">3 Attempts</SelectItem>
                                        <SelectItem value="5">5 Attempts</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t border-border py-3">
                        <div className="ml-auto flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={handleCancelSettings} disabled={loading}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveSettings} disabled={loading}>
                                {loading && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>

                {/* Section D - Integrations */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* QuickBooks */}
                    <Card className="border-border shadow-sm relative overflow-hidden bg-card">
                        <div className="absolute top-0 right-0 p-3">
                            <StatusBadge status={qbState.isConnected ? 'connected' : 'disconnected'} />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                <Database className="w-4 h-4 text-green-600" /> QuickBooks Online
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">Accounting synchronization</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {qbState.isConnected ? (
                                <>
                                    <div className="p-3 bg-muted/50 rounded-md border border-border">
                                        <span className="text-xs text-muted-foreground uppercase font-bold">Connected Account</span>
                                        <p className="text-sm font-medium text-foreground mt-1">{qbState.accountName}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Last sync: {qbState.lastSync}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleTestIntegration('QuickBooks')}>
                                            Test Connection
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={handleDisconnectQB} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                                            Disconnect
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/30 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center">
                                        <Database className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                                        <p className="text-sm text-muted-foreground">Connect your QuickBooks account to enable automatic invoicing.</p>
                                    </div>
                                    <Button
                                        className="w-full bg-[#2CA01C] hover:bg-[#2CA01C]/90 text-white"
                                        onClick={handleConnectQB}
                                        disabled={qbState.isConnecting}
                                    >
                                        {qbState.isConnecting ? (
                                            <>
                                                <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> Connecting...
                                            </>
                                        ) : (
                                            'Connect QuickBooks'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Twilio */}
                    <Card className="border-border shadow-sm relative overflow-hidden bg-card">
                        <div className="absolute top-0 right-0 p-3">
                            <StatusBadge status={twilioState.isConnected ? 'connected' : 'disconnected'} />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                                <Smartphone className="w-4 h-4 text-red-500" /> Twilio SMS
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">Messaging gateway status</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {twilioState.isConnected ? (
                                <>
                                    <div className="p-3 bg-muted/50 rounded-md border border-border">
                                        <span className="text-xs text-muted-foreground uppercase font-bold">Active Number</span>
                                        <p className="text-sm font-medium text-foreground mt-1 font-mono">{twilioState.phoneNumber}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Webhook: Active</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleTestIntegration('Twilio')}>
                                            Send Test SMS
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setTwilioState(prev => ({ ...prev, isConnected: false }))} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                                            Disconnect
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/30 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center">
                                        <Smartphone className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                                        <p className="text-sm text-muted-foreground">Configure Twilio to enable SMS notifications and dispatching.</p>
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-[#F22F46] hover:bg-[#F22F46]/90 text-white">
                                                Configure Twilio
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Connect Twilio</DialogTitle>
                                                <DialogDescription>
                                                    Enter your Twilio API credentials to enable SMS functionality.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Account SID</Label>
                                                    <Input placeholder="AC..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Auth Token</Label>
                                                    <Input type="password" placeholder="••••••••••••••••" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Phone Number</Label>
                                                    <Input placeholder="+1(586) 556-0113" />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => { }}>Cancel</Button>
                                                <Button onClick={handleConnectTwilio} disabled={twilioState.isConnecting}>
                                                    {twilioState.isConnecting ? 'Verifying...' : 'Save & Connect'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Section E - Notifications */}
                <Card className="border-border shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Mail className="w-4 h-4 text-foreground" /> Notification Preferences
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Manage administrator alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium text-foreground">Invoice Failures</Label>
                                <p className="text-xs text-muted-foreground">Notify when sync fails</p>
                            </div>
                            <Switch checked={true} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium text-foreground">Worker Offline</Label>
                                <p className="text-xs text-muted-foreground">Critical alert for downtime</p>
                            </div>
                            <Switch checked={true} />
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
