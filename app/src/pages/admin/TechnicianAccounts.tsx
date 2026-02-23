import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  UserCog,
  Mail,
  Phone,
  ShieldCheck,
  ShieldOff,
  Calendar,
  Pencil,
  Power,
  UserPlus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  useAuth,
  type TechnicianAccountSummary,
  type TechnicianSignupRequestSummary,
} from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { formatPhoneForDisplay, formatUsPhoneInput } from '@/lib/phone';
import {
  approveAdminEmailChangeRequest,
  fetchAdminEmailChangeRequests,
  getStoredAdminToken,
  rejectAdminEmailChangeRequest,
  type BackendEmailChangeRequest,
} from '@/lib/backend-api';

type EditFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export default function TechnicianAccountsPage() {
  const {
    technicianAccounts,
    pendingTechnicianRequests,
    syncAdminData,
    updateTechnicianAccount,
    setTechnicianAccountActive,
    approveTechnicianSignupRequest,
    rejectTechnicianSignupRequest,
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TechnicianAccountSummary | null>(null);
  const [form, setForm] = useState<EditFormState>({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [emailChangeRequests, setEmailChangeRequests] = useState<BackendEmailChangeRequest[]>([]);
  const [emailRequestsLoading, setEmailRequestsLoading] = useState(false);

  const loadEmailChangeRequests = async () => {
    const token = getStoredAdminToken();
    if (!token) {
      setEmailChangeRequests([]);
      return;
    }
    setEmailRequestsLoading(true);
    try {
      const rows = await fetchAdminEmailChangeRequests(token, 'PENDING');
      setEmailChangeRequests(rows);
    } catch {
      setEmailChangeRequests([]);
    } finally {
      setEmailRequestsLoading(false);
    }
  };

  useEffect(() => {
    void loadEmailChangeRequests();
  }, []);

  useEffect(() => {
    void syncAdminData().catch(() => {
      // Keep currently cached data if backend sync fails temporarily.
    });
  }, [syncAdminData]);

  const activeCount = technicianAccounts.filter((item) => item.isActive).length;
  const pendingCount = pendingTechnicianRequests.length;

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return technicianAccounts;
    }

    return technicianAccounts.filter((account) =>
      account.name.toLowerCase().includes(query)
      || account.email.toLowerCase().includes(query)
      || (account.phone ?? '').toLowerCase().includes(query)
    );
  }, [searchQuery, technicianAccounts]);

  const filteredPendingRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return pendingTechnicianRequests;
    }

    return pendingTechnicianRequests.filter((request) =>
      request.name.toLowerCase().includes(query)
      || request.email.toLowerCase().includes(query)
      || (request.phone ?? '').toLowerCase().includes(query)
    );
  }, [pendingTechnicianRequests, searchQuery]);

  const filteredEmailChangeRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return emailChangeRequests;
    }
    return emailChangeRequests.filter((request) =>
      request.current_email.toLowerCase().includes(query)
      || request.requested_email.toLowerCase().includes(query)
      || (request.technician_name ?? '').toLowerCase().includes(query)
    );
  }, [emailChangeRequests, searchQuery]);

  const openEditDialog = (account: TechnicianAccountSummary) => {
    setSelectedAccount(account);
    setForm({
      name: account.name,
      email: account.email,
      phone: account.phone ?? '',
      password: '',
    });
    setFormError(null);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAccount) {
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      await updateTechnicianAccount(selectedAccount.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password || undefined,
      });
      setEditDialogOpen(false);
      setSelectedAccount(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save account changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (account: TechnicianAccountSummary) => {
    const nextState = !account.isActive;
    const message = nextState
      ? `Activate ${account.name}'s account?`
      : `Deactivate ${account.name}'s account?`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      await setTechnicianAccountActive(account.id, nextState);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to update account status.');
    }
  };

  const handleApproveRequest = async (request: TechnicianSignupRequestSummary) => {
    if (!window.confirm(`Approve signup request for ${request.name}?`)) {
      return;
    }

    try {
      await approveTechnicianSignupRequest(request.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to approve signup request.');
    }
  };

  const handleRejectRequest = async (request: TechnicianSignupRequestSummary) => {
    if (!window.confirm(`Reject signup request for ${request.name}?`)) {
      return;
    }

    try {
      await rejectTechnicianSignupRequest(request.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to reject signup request.');
    }
  };

  const handleApproveEmailChangeRequest = async (request: BackendEmailChangeRequest) => {
    if (!window.confirm(`Approve email change for ${request.technician_name ?? 'technician'}?`)) {
      return;
    }
    const token = getStoredAdminToken();
    if (!token) {
      window.alert('Admin session missing. Please login again.');
      return;
    }
    try {
      await approveAdminEmailChangeRequest(token, request.id);
      await loadEmailChangeRequests();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to approve email change request.');
    }
  };

  const handleRejectEmailChangeRequest = async (request: BackendEmailChangeRequest) => {
    if (!window.confirm(`Reject email change for ${request.technician_name ?? 'technician'}?`)) {
      return;
    }
    const token = getStoredAdminToken();
    if (!token) {
      window.alert('Admin session missing. Please login again.');
      return;
    }
    try {
      await rejectAdminEmailChangeRequest(token, request.id);
      await loadEmailChangeRequests();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to reject email change request.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Technician Accounts</h1>
          <p className="text-sm text-gray-500 font-medium">Admin-only account management for technician sign-in access.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:w-[520px]">
          <Card className="p-3 border-gray-200">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Accounts</p>
            <p className="text-xl font-bold text-gray-900">{technicianAccounts.length}</p>
          </Card>
          <Card className="p-3 border-gray-200">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
            <p className="text-xl font-bold text-emerald-700">{activeCount}</p>
          </Card>
          <Card className="p-3 border-gray-200">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending Requests</p>
            <p className="text-xl font-bold text-amber-700">{pendingCount}</p>
          </Card>
        </div>
      </div>

      <Card className="p-4 border-gray-200">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/40">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            Pending Email Change Requests
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Review technician email updates before applying to account login identity.
          </p>
        </div>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="pl-6 w-[220px]">Technician</TableHead>
              <TableHead className="w-[260px]">Current Email</TableHead>
              <TableHead className="w-[260px]">Requested Email</TableHead>
              <TableHead className="w-[220px]">Requested At</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailRequestsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-gray-500">
                  Loading email change requests...
                </TableCell>
              </TableRow>
            ) : filteredEmailChangeRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-gray-500">
                  No pending email change requests.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmailChangeRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-[#f7faff]">
                  <TableCell className="pl-6">
                    <div>
                      <p className="font-semibold text-gray-900">{request.technician_name ?? 'Technician'}</p>
                      <p className="text-xs text-gray-500 font-mono">{request.technician_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{request.current_email}</TableCell>
                  <TableCell className="text-sm text-blue-700 font-medium">{request.requested_email}</TableCell>
                  <TableCell className="text-sm text-gray-700">{formatDateTime(request.requested_at)}</TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => void handleApproveEmailChangeRequest(request)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleRejectEmailChangeRequest(request)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-amber-50/40">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-600" />
            Pending Signup Requests
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Approve requests to create technician accounts and allow login.
          </p>
        </div>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="pl-6 w-[220px]">Technician</TableHead>
              <TableHead className="w-[260px]">Contact</TableHead>
              <TableHead className="w-[220px]">Requested At</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPendingRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-28 text-center text-sm text-gray-500">
                  No pending signup requests.
                </TableCell>
              </TableRow>
            ) : (
              filteredPendingRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-[#fffdf7]">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{request.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{request.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{request.email}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{request.phone ? formatPhoneForDisplay(request.phone) : 'Not set'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDateTime(request.requestedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApproveRequest(request)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectRequest(request)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f6fbfb]">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[#2F8E92]" />
            Active Technician Accounts
          </h2>
        </div>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="pl-6 w-[220px]">Account</TableHead>
              <TableHead className="w-[260px]">Contact</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[220px]">Last Updated</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-sm text-gray-500">
                  No technician accounts match your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => (
                <TableRow key={account.id} className="hover:bg-[#f9fbfb]">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#e8f4f5] text-[#2F8E92] flex items-center justify-center">
                        <UserCog className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{account.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{account.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{account.email}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{account.phone ? formatPhoneForDisplay(account.phone) : 'Not set'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {account.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 border-gray-300">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDateTime(account.updatedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(account)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={account.isActive ? 'destructive' : 'default'}
                        onClick={() => handleToggleActive(account)}
                        className={!account.isActive ? 'bg-emerald-600 hover:bg-emerald-700' : undefined}
                      >
                        {account.isActive ? <ShieldOff className="w-4 h-4 mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                        {account.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Technician Account</DialogTitle>
            <DialogDescription>Update profile details or set a new password for this account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tech-account-name">Full Name</Label>
              <Input
                id="tech-account-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tech-account-email">Email</Label>
              <Input
                id="tech-account-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tech-account-phone">Phone</Label>
              <Input
                id="tech-account-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: formatUsPhoneInput(event.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tech-account-password">New Password (optional)</Label>
              <Input
                id="tech-account-password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-[#2F8E92] hover:bg-[#27797d]">
              <Power className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
