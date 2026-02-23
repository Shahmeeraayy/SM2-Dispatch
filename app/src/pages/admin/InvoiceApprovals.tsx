import { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Download,
    Filter,
    RefreshCw,
    Search,
    ShieldAlert,
    User,
    ChevronRight,
    DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';
import {
    createInvoice,
    fetchPendingInvoiceApprovals,
    getStoredAdminToken,
    type BackendPendingInvoiceApproval,
} from '@/lib/backend-api';

const INVOICE_APPROVAL_EXPORT_COLUMNS = [
    'JobCode',
    'Dealership',
    'Technician',
    'Service',
    'Vehicle',
    'CompletedAt',
    'EstimatedTotal',
    'InvoiceState',
];

type PendingInvoice = BackendPendingInvoiceApproval;

const toNumber = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

function StatusBadge({ status }: { status: string }) {
    if (status === 'creating') {
        return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">
                Generating...
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Needs Approval
        </Badge>
    );
}

export default function InvoiceApprovalsPage() {
    const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDealership, setFilterDealership] = useState<string>('all');
    const [filterTechnician, setFilterTechnician] = useState<string>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [approvalNote, setApprovalNote] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    const fetchInvoicesData = async () => {
        setLoading(true);
        try {
            const adminToken = getStoredAdminToken();
            if (!adminToken) {
                setInvoices([]);
                return;
            }
            const rows = await fetchPendingInvoiceApprovals(adminToken);
            setInvoices(rows);
        } catch (error) {
            console.error(error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchInvoicesData();
    }, []);

    const dealershipOptions = useMemo(() => Array.from(
        new Set(
            invoices
                .map((invoice) => invoice.dealership_name.trim())
                .filter((dealership) => dealership.length > 0),
        ),
    ).sort((a, b) => a.localeCompare(b)), [invoices]);

    const technicianOptions = useMemo(() => Array.from(
        new Set(
            invoices
                .map((invoice) => (invoice.technician_name || '').trim())
                .filter((technician) => technician.length > 0),
        ),
    ).sort((a, b) => a.localeCompare(b)), [invoices]);

    const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
        const query = searchQuery.toLowerCase().trim();
        const technicianName = invoice.technician_name || '';
        const matchesSearch =
            query.length === 0 ||
            invoice.job_code.toLowerCase().includes(query) ||
            invoice.dealership_name.toLowerCase().includes(query) ||
            technicianName.toLowerCase().includes(query) ||
            invoice.vehicle_summary.toLowerCase().includes(query) ||
            invoice.service_summary.toLowerCase().includes(query);
        const matchesDealership =
            filterDealership === 'all' ||
            invoice.dealership_name.toLowerCase() === filterDealership.toLowerCase();
        const matchesTechnician =
            filterTechnician === 'all' ||
            technicianName.toLowerCase() === filterTechnician.toLowerCase();
        return matchesSearch && matchesDealership && matchesTechnician;
    }), [filterDealership, filterTechnician, invoices, searchQuery]);

    const handleOpenDrawer = (invoice: PendingInvoice) => {
        setSelectedInvoice(invoice);
        setApprovalNote('');
        setDrawerOpen(true);
    };

    const totals = useMemo(() => {
        if (!selectedInvoice) {
            return { subtotal: 0, tax: 0, total: 0 };
        }
        const subtotal = toNumber(selectedInvoice.estimated_subtotal);
        const tax = toNumber(selectedInvoice.estimated_sales_tax);
        const total = toNumber(selectedInvoice.estimated_total);
        return { subtotal, tax, total };
    }, [selectedInvoice]);

    const handleApprove = async () => {
        if (!selectedInvoice) return;
        const adminToken = getStoredAdminToken();
        if (!adminToken) {
            alert('Admin session missing. Please login again.');
            return;
        }

        setIsApproving(true);
        setConfirmDialogOpen(false);
        try {
            await createInvoice(adminToken, {
                dispatch_job_ids: [selectedInvoice.job_id],
                status: 'sent',
                terms: 'NET_15',
                shipping: 0,
                customer_message: approvalNote.trim() || undefined,
            });

            setInvoices((prev) => prev.filter((inv) => inv.job_id !== selectedInvoice.job_id));
            setDrawerOpen(false);
            setSelectedInvoice(null);
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'Unable to approve invoice.';
            alert(`Invoice approval failed: ${detail}`);
        } finally {
            setIsApproving(false);
        }
    };

    const getInvoiceApprovalExportRows = () => filteredInvoices.map((invoice) => ({
        JobCode: invoice.job_code,
        Dealership: invoice.dealership_name,
        Technician: invoice.technician_name || '',
        Service: invoice.service_summary,
        Vehicle: invoice.vehicle_summary,
        CompletedAt: invoice.completed_at || '',
        EstimatedTotal: toNumber(invoice.estimated_total),
        InvoiceState: invoice.invoice_state,
    }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getInvoiceApprovalExportRows(), selectedColumns);
        exportArrayData(exportData, 'invoice_approvals_export', format);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoice Approvals</h1>
                    <p className="text-sm text-gray-500 font-medium">Review pricing and approve invoice creation</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center text-xs text-gray-400 font-medium mr-2">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                    <Button variant="outline" className="h-9" onClick={() => void fetchInvoicesData()}>
                        <RefreshCw className={cn('w-4 h-4 mr-2 text-gray-500', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => setExportModalOpen(true)}>
                        <Download className="w-4 h-4 mr-2 text-gray-500" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Invoice Approvals"
                description="Select the pending-approval columns you want in your CSV."
                availableColumns={INVOICE_APPROVAL_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            <Card className="p-4 border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full lg:w-auto min-w-0 lg:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by Job Code, Dealership, or VIN..."
                            className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <Select value={filterDealership} onValueChange={setFilterDealership}>
                            <SelectTrigger className="w-full sm:w-[170px] border-dashed text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    <SelectValue placeholder="Dealership" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Dealership</SelectItem>
                                {dealershipOptions.map((dealership) => (
                                    <SelectItem key={dealership} value={dealership}>
                                        {dealership}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterTechnician} onValueChange={setFilterTechnician}>
                            <SelectTrigger className="w-full sm:w-[160px] border-dashed text-gray-600">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <SelectValue placeholder="Technician" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Technician</SelectItem>
                                {technicianOptions.map((technician) => (
                                    <SelectItem key={technician} value={technician}>
                                        {technician}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="h-6 w-px bg-gray-200 mx-2" />
                        <Button variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200">
                            All Pending ({filteredInvoices.length})
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[420px]">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No invoices found</h3>
                        <p className="text-sm mt-1 max-w-sm text-center">Try adjusting your search or filters.</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => { setSearchQuery(''); setFilterDealership('all'); setFilterTechnician('all'); }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[180px] pl-6 font-semibold text-xs text-gray-600 uppercase tracking-wider">Job Code</TableHead>
                                <TableHead className="w-[200px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Dealership</TableHead>
                                <TableHead className="w-[180px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Technician</TableHead>
                                <TableHead className="w-[150px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Completed At</TableHead>
                                <TableHead className="w-[180px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Service</TableHead>
                                <TableHead className="w-[120px] text-right font-semibold text-xs text-gray-600 uppercase tracking-wider">Est. Total</TableHead>
                                <TableHead className="w-[140px] text-center font-semibold text-xs text-gray-600 uppercase tracking-wider">Status</TableHead>
                                <TableHead className="w-[100px] text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.map((inv) => (
                                <TableRow
                                    key={inv.job_id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                    onClick={() => handleOpenDrawer(inv)}
                                >
                                    <TableCell className="pl-6 font-medium text-gray-900 group-hover:text-[#2F8E92]">{inv.job_code}</TableCell>
                                    <TableCell className="text-gray-600">{inv.dealership_name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                                                {inv.technician_name?.substring(0, 2) || 'NA'}
                                            </div>
                                            <span className="text-sm text-gray-700">{inv.technician_name || 'Unassigned'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-xs font-mono">
                                        {inv.completed_at ? new Date(inv.completed_at).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-gray-600 max-w-[180px] truncate">{inv.service_summary}</TableCell>
                                    <TableCell className="text-right font-mono font-medium text-gray-900">${toNumber(inv.estimated_total).toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={inv.invoice_state} />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0 shadow-2xl">
                    {selectedInvoice && (
                        <>
                            <div className="p-6 border-b border-gray-200 bg-gray-50">
                                <SheetHeader>
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                                            Pending Approval
                                        </Badge>
                                        <span className="text-xs font-mono text-gray-400">ID: {selectedInvoice.job_id}</span>
                                    </div>
                                    <SheetTitle className="text-xl font-bold text-gray-900">Invoice Preview - {selectedInvoice.job_code}</SheetTitle>
                                    <SheetDescription className="text-sm text-gray-500">
                                        Review and approve services for invoice generation.
                                    </SheetDescription>
                                </SheetHeader>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">
                                    <section className="grid grid-cols-2 gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Dealership</h4>
                                            <div className="font-medium text-gray-900">{selectedInvoice.dealership_name}</div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Vehicle</h4>
                                            <div className="font-medium text-gray-900">{selectedInvoice.vehicle_summary}</div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Technician</h4>
                                            <div className="font-medium text-gray-900">{selectedInvoice.technician_name || 'Unassigned'}</div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Completed</h4>
                                            <div className="font-medium text-gray-900">
                                                {selectedInvoice.completed_at ? new Date(selectedInvoice.completed_at).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="tex-sm font-bold text-gray-900 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" /> Billable Items
                                            </h3>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-gray-50">
                                                    <TableRow>
                                                        <TableHead className="h-8 text-xs font-semibold">Service / Description</TableHead>
                                                        <TableHead className="h-8 w-[60px] text-xs font-semibold text-center">Qty</TableHead>
                                                        <TableHead className="h-8 w-[100px] text-xs font-semibold text-right">Price</TableHead>
                                                        <TableHead className="h-8 w-[100px] text-xs font-semibold text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedInvoice.items.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="py-2 text-sm text-gray-900">{item.description}</TableCell>
                                                            <TableCell className="py-2 text-sm text-center">{toNumber(item.quantity).toFixed(2)}</TableCell>
                                                            <TableCell className="py-2 text-sm text-right">${toNumber(item.unit_price).toFixed(2)}</TableCell>
                                                            <TableCell className="text-right py-2 font-mono text-sm text-gray-700">${toNumber(item.total).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <div className="bg-gray-50/50 p-4 border-t border-gray-200 space-y-2">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>Subtotal</span>
                                                    <span>${totals.subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>Tax</span>
                                                    <span>${totals.tax.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                    <span>Total</span>
                                                    <span>${totals.total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <Label htmlFor="audit-note" className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                            Approval Note (Optional)
                                        </Label>
                                        <Textarea
                                            id="audit-note"
                                            placeholder="Add a note to the audit log about this approval..."
                                            className="resize-none"
                                            value={approvalNote}
                                            onChange={(e) => setApprovalNote(e.target.value)}
                                        />
                                    </section>
                                </div>
                            </ScrollArea>

                            <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-20">
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                                    <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="flex-[2] bg-[#2F8E92] hover:bg-[#267276] text-white shadow-sm font-semibold">
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Approve & Generate
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-gray-900">
                                                    <ShieldAlert className="w-5 h-5 text-orange-600" /> Confirm Invoice Generation
                                                </DialogTitle>
                                                <DialogDescription className="pt-2">
                                                    This will immediately create an invoice for <strong>{selectedInvoice.job_code}</strong> with a total of <strong>${totals.total.toFixed(2)}</strong>.
                                                    <br /><br />
                                                    This action cannot be undone from the portal. Are you sure?
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="mt-4">
                                                <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                                                <Button onClick={() => void handleApprove()} disabled={isApproving} className="bg-[#2F8E92] hover:bg-[#267276]">
                                                    {isApproving ? 'Processing...' : 'Yes, Create Invoice'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
