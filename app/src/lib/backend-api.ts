const ADMIN_TOKEN_STORAGE_KEY = 'sm_dispatch_admin_access_token';
const TECHNICIAN_TOKEN_STORAGE_KEY = 'sm_dispatch_technician_access_token';
const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: RequestMethod;
  token?: string | null;
  body?: unknown;
};

type DevAdminTokenResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
  role: 'admin';
};

type DevTechnicianTokenResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
  role: 'technician';
};

export type BackendTechnicianListItem = {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string | null;
  profile_picture_url?: string | null;
  status: 'active' | 'deactivated';
  manual_availability: boolean;
  effective_availability: boolean;
  on_leave_now: boolean;
  current_shift_window?: string | null;
  next_time_off_start?: string | null;
  working_days?: number[];
  working_hours_start?: string | null;
  working_hours_end?: string | null;
  after_hours_enabled?: boolean;
  has_pending_email_change_request?: boolean;
  pending_email_change_request_id?: string | null;
  pending_email_change_requested_email?: string | null;
  zones: Array<{ id: string; name: string }>;
  skills: Array<{ id: string; name: string }>;
  current_jobs_count: number;
};

export type BackendOutOfOfficeRange = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
};

export type BackendTechnicianProfile = {
  id: string;
  name: string;
  full_name: string;
  email: string;
  phone?: string | null;
  profile_picture_url?: string | null;
  status: 'active' | 'deactivated';
  manual_availability: boolean;
  effective_availability: boolean;
  on_leave_now: boolean;
  current_shift_window?: string | null;
  next_time_off_start?: string | null;
  working_days: number[];
  working_hours_start?: string | null;
  working_hours_end?: string | null;
  after_hours_enabled: boolean;
  has_pending_email_change_request: boolean;
  pending_email_change_request_id?: string | null;
  pending_email_change_requested_email?: string | null;
  weekly_schedule: Array<{
    day_of_week: number;
    is_enabled: boolean;
    start_time?: string | null;
    end_time?: string | null;
  }>;
  upcoming_time_off: Array<{
    id: string;
    technician_id: string;
    entry_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    created_at: string;
    cancelled_at?: string | null;
  }>;
};

export type BackendEmailChangeRequest = {
  id: string;
  technician_id: string;
  technician_name?: string | null;
  current_email: string;
  requested_email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  remarks?: string | null;
};

export type BackendSignupRequest = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  updated_at: string;
};

export type BackendDealership = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  status: 'active' | 'inactive';
  notes?: string | null;
  last_job_at?: string | null;
  recent_jobs: Array<{
    id: string;
    job_code: string;
    status: string;
    created_at: string;
    assigned_tech?: string | null;
  }>;
};

export type BackendInvoiceBrandingSettings = {
  logo_url?: string | null;
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
};

export type BackendInvoiceLineItem = {
  id: string;
  job_id?: string | null;
  product_service: string;
  description?: string | null;
  quantity: string | number;
  qty: string | number;
  rate: string | number;
  amount: string | number;
  tax_code: string;
  tax_rate: string | number;
  tax_amount: string | number;
  line_order: number;
};

export type BackendInvoice = {
  id: string;
  invoice_number: string;
  job_code?: string | null;
  dealership_name?: string | null;
  technician_name?: string | null;
  company_info?: BackendInvoiceBrandingSettings | null;
  bill_to?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  } | null;
  ship_to?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  } | null;
  invoice_date: string;
  terms: 'NET_15' | 'NET_30' | 'CUSTOM';
  custom_term_days?: number | null;
  due_date: string;
  subtotal: string | number;
  sales_tax_total?: string | number | null;
  sales_tax: string | number;
  shipping: string | number;
  total: string | number;
  customer_message?: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_recorded_at?: string | null;
  voided_at?: string | null;
  created_at: string;
  updated_at: string;
  line_items: BackendInvoiceLineItem[];
};

export type BackendPendingInvoiceApproval = {
  job_id: string;
  job_code: string;
  dealership_name: string;
  technician_name?: string | null;
  service_summary: string;
  vehicle_summary: string;
  completed_at?: string | null;
  estimated_subtotal: string | number;
  estimated_sales_tax: string | number;
  estimated_total: string | number;
  invoice_state: 'pending_approval';
  allowed_actions: string[];
  items: Array<{
    id: string;
    description: string;
    quantity: string | number;
    unit_price: string | number;
    total: string | number;
  }>;
  bill_to?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  } | null;
  ship_to?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  } | null;
};

export type BackendReportsKpis = {
  jobs_created: number;
  jobs_completed: number;
  avg_completion_minutes: number;
  technician_utilization: number;
  invoice_total: number;
  pending_approvals: number;
};

export type BackendDispatchStatusRow = {
  status: string;
  count: number;
  percentage: number;
};

export type BackendInvoiceStatusRow = {
  state: string;
  count: number;
  total_amount: number;
  is_critical: boolean;
};

export type BackendTechnicianPerformanceRow = {
  id: string;
  name: string;
  jobs_assigned: number;
  jobs_completed: number;
  avg_completion_time: string;
  delays_count: number;
  refusals_count: number;
  revenue_generated: number;
};

export type BackendDealershipPerformanceRow = {
  id: string;
  name: string;
  jobs_created: number;
  jobs_completed: number;
  avg_resolution_time: string;
  invoice_total: number;
  attention_flags: number;
};

export type BackendInvoicingDetailRow = {
  technician: string;
  approved_amount: number;
  average_invoice: number;
  growth_percentage?: number | null;
};

export type BackendReportsOverview = {
  generated_at: string;
  from_date: string;
  to_date: string;
  current_period_invoice_count: number;
  revenue_delta: number;
  kpis: BackendReportsKpis;
  dispatch_performance: BackendDispatchStatusRow[];
  invoice_performance: BackendInvoiceStatusRow[];
  technician_performance: BackendTechnicianPerformanceRow[];
  dealership_performance: BackendDealershipPerformanceRow[];
  invoicing_detail_rows: BackendInvoicingDetailRow[];
};

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  return raw && raw.trim() ? raw : null;
}

export function setStoredAdminToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAdminToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function getStoredTechnicianToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(TECHNICIAN_TOKEN_STORAGE_KEY);
  return raw && raw.trim() ? raw : null;
}

export function setStoredTechnicianToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TECHNICIAN_TOKEN_STORAGE_KEY, token);
}

export function clearStoredTechnicianToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TECHNICIAN_TOKEN_STORAGE_KEY);
}

async function tryRefreshAdminToken(expiredToken: string): Promise<string | null> {
  const currentAdminToken = getStoredAdminToken();
  if (!currentAdminToken || currentAdminToken !== expiredToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/dev/admin-token`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    clearStoredAdminToken();
    return null;
  }

  try {
    const payload = await response.json() as DevAdminTokenResponse;
    if (!payload?.access_token || !payload.access_token.trim()) {
      clearStoredAdminToken();
      return null;
    }
    setStoredAdminToken(payload.access_token);
    return payload.access_token;
  } catch {
    clearStoredAdminToken();
    return null;
  }
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && options.token) {
    const refreshedToken = await tryRefreshAdminToken(options.token);
    if (refreshedToken) {
      const retryHeaders: Record<string, string> = { ...headers, Authorization: `Bearer ${refreshedToken}` };
      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers: retryHeaders,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
      if (retryResponse.ok) {
        return retryResponse.json() as Promise<T>;
      }
      // Continue with regular error handling below using retry response.
      let detail = `Request failed (${retryResponse.status})`;
      try {
        const payload = await retryResponse.json() as { detail?: string };
        if (payload?.detail) {
          detail = payload.detail;
        }
      } catch {
        // Keep generic error if backend didn't return JSON.
      }
      throw new Error(detail);
    }
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json() as { detail?: string };
      if (payload?.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep generic error if backend didn't return JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchDevAdminToken(): Promise<DevAdminTokenResponse> {
  return requestJson<DevAdminTokenResponse>('/auth/dev/admin-token', { method: 'POST' });
}

export async function fetchDevTechnicianToken(payload: {
  email: string;
  password: string;
}): Promise<DevTechnicianTokenResponse> {
  return requestJson<DevTechnicianTokenResponse>('/auth/dev/technician-token', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchAdminTechnicians(token: string): Promise<BackendTechnicianListItem[]> {
  return requestJson<BackendTechnicianListItem[]>('/admin/technicians', {
    token,
  });
}

export async function updateAdminTechnician(
  token: string,
  technicianId: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    status?: 'active' | 'deactivated';
    manual_availability?: boolean;
  },
): Promise<BackendTechnicianListItem> {
  return requestJson<BackendTechnicianListItem>(`/admin/technicians/${technicianId}`, {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function createTechnicianSignupRequest(payload: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<BackendSignupRequest> {
  return requestJson<BackendSignupRequest>('/auth/technician-signup-request', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchAdminTechnicianSignupRequests(
  token: string,
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'all',
): Promise<BackendSignupRequest[]> {
  const suffix = status === 'all' ? '' : `?status=${status}`;
  return requestJson<BackendSignupRequest[]>(`/admin/technician-signup-requests${suffix}`, { token });
}

export async function approveAdminTechnicianSignupRequest(
  token: string,
  requestId: string,
): Promise<BackendSignupRequest> {
  return requestJson<BackendSignupRequest>(`/admin/technician-signup-requests/${requestId}/approve`, {
    method: 'POST',
    token,
  });
}

export async function rejectAdminTechnicianSignupRequest(
  token: string,
  requestId: string,
  reason?: string,
): Promise<BackendSignupRequest> {
  return requestJson<BackendSignupRequest>(`/admin/technician-signup-requests/${requestId}/reject`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export async function fetchAdminDealerships(token: string): Promise<BackendDealership[]> {
  return requestJson<BackendDealership[]>('/admin/dealerships', { token });
}

export async function createAdminDealership(
  token: string,
  payload: {
    code?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    notes?: string;
  },
): Promise<BackendDealership> {
  return requestJson<BackendDealership>('/admin/dealerships', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function updateAdminDealership(
  token: string,
  dealershipId: string,
  payload: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    notes?: string;
    status?: 'active' | 'inactive';
  },
): Promise<BackendDealership> {
  return requestJson<BackendDealership>(`/admin/dealerships/${dealershipId}`, {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function updateAdminDealershipStatus(
  token: string,
  dealershipId: string,
  status: 'active' | 'inactive',
): Promise<BackendDealership> {
  return requestJson<BackendDealership>(`/admin/dealerships/${dealershipId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export async function fetchAdminInvoiceBrandingSettings(
  token: string,
): Promise<BackendInvoiceBrandingSettings> {
  return requestJson<BackendInvoiceBrandingSettings>('/admin/settings/invoice-branding', {
    token,
  });
}

export async function updateAdminInvoiceBrandingSettings(
  token: string,
  payload: BackendInvoiceBrandingSettings,
): Promise<BackendInvoiceBrandingSettings> {
  return requestJson<BackendInvoiceBrandingSettings>('/admin/settings/invoice-branding', {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function fetchInvoices(token: string): Promise<BackendInvoice[]> {
  return requestJson<BackendInvoice[]>('/invoices', { token });
}

export async function createInvoice(
  token: string,
  payload: {
    dispatch_job_ids?: string[];
    terms?: 'NET_15' | 'NET_30' | 'CUSTOM';
    custom_term_days?: number;
    shipping?: string | number;
    customer_message?: string;
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  },
): Promise<BackendInvoice> {
  return requestJson<BackendInvoice>('/invoices', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function fetchPendingInvoiceApprovals(token: string): Promise<BackendPendingInvoiceApproval[]> {
  return requestJson<BackendPendingInvoiceApproval[]>('/invoices/pending-approvals', { token });
}

export async function fetchTechnicianMeProfile(token: string): Promise<BackendTechnicianProfile> {
  return requestJson<BackendTechnicianProfile>('/technicians/me', { token });
}

export async function updateTechnicianMeProfile(
  token: string,
  payload: {
    full_name: string;
    phone?: string | null;
    profile_picture_url?: string | null;
  },
): Promise<BackendTechnicianProfile> {
  return requestJson<BackendTechnicianProfile>('/technicians/me', {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function updateTechnicianMeAvailability(
  token: string,
  payload: {
    working_days: number[];
    working_hours_start: string;
    working_hours_end: string;
    after_hours_enabled: boolean;
    out_of_office_ranges: Array<{ start_date: string; end_date: string; note?: string | null }>;
  },
): Promise<BackendTechnicianProfile> {
  return requestJson<BackendTechnicianProfile>('/technicians/me/availability', {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function requestTechnicianEmailChange(
  token: string,
  payload: { requested_email: string },
): Promise<BackendEmailChangeRequest> {
  return requestJson<BackendEmailChangeRequest>('/technicians/me/email-change-request', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function fetchTechnicianEmailChangeRequests(token: string): Promise<BackendEmailChangeRequest[]> {
  return requestJson<BackendEmailChangeRequest[]>('/technicians/me/email-change-requests', {
    token,
  });
}

export async function fetchAdminEmailChangeRequests(
  token: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED',
): Promise<BackendEmailChangeRequest[]> {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
  return requestJson<BackendEmailChangeRequest[]>(`/admin/email-change-requests${suffix}`, { token });
}

export async function approveAdminEmailChangeRequest(
  token: string,
  requestId: string,
  remarks?: string,
): Promise<BackendEmailChangeRequest> {
  return requestJson<BackendEmailChangeRequest>(`/admin/email-change-requests/${requestId}/approve`, {
    method: 'POST',
    token,
    body: { remarks },
  });
}

export async function rejectAdminEmailChangeRequest(
  token: string,
  requestId: string,
  remarks?: string,
): Promise<BackendEmailChangeRequest> {
  return requestJson<BackendEmailChangeRequest>(`/admin/email-change-requests/${requestId}/reject`, {
    method: 'POST',
    token,
    body: { remarks },
  });
}

export async function fetchAdminReportsOverview(
  token: string,
  params?: { from_date?: string; to_date?: string },
): Promise<BackendReportsOverview> {
  const search = new URLSearchParams();
  if (params?.from_date) search.set('from_date', params.from_date);
  if (params?.to_date) search.set('to_date', params.to_date);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return requestJson<BackendReportsOverview>(`/admin/reports/overview${suffix}`, { token });
}
