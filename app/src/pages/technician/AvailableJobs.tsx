import { useState, useEffect, useMemo } from 'react';
import {
    RefreshCw,
    MapPin,
    Clock,
    Briefcase,
    Calendar,
    Home,
    User,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Plus,
    Trash2,
    XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_SERVICES } from '../admin/Services';
import { MOCK_DEALERSHIPS } from '../admin/Dealerships';

// --- Types ---

type Urgency = 'low' | 'normal' | 'high' | 'critical';

interface AvailableJob {
    job_id: string;
    job_code: string;
    dealership_name: string;
    service_name: string;
    urgency: Urgency;
    zone: string;
    created_at: string;
    note_preview?: string;
    status?: 'READY_FOR_TECH_ACCEPTANCE';
    eligible_tech_ids?: string[];
    rejected_tech_ids?: string[];
    is_test_dummy?: boolean;
}

interface JobRejectionRecord {
    job_id: string;
    tech_id: string;
    rejected_at: string;
}

interface PersistedAuditEvent {
    id: string;
    created_at: string;
    event_type: string;
    actor_type: 'WEB_APP';
    actor_name: string;
    summary: string;
    payload_json: Record<string, unknown>;
    severity: 'info' | 'warning' | 'critical';
}

// --- Mock Data Generator ---

const DEALERSHIPS = MOCK_DEALERSHIPS.map(d => d.name);
const SERVICES = MOCK_SERVICES.map(s => s.name);
const ZONES = ['Québec', 'Lévis', 'Donnacona', 'St-Raymond'];

const AVAILABLE_JOBS_STORAGE_KEY = 'sm_dispatch_available_jobs';
const JOB_REJECTIONS_STORAGE_KEY = 'sm_dispatch_job_rejections';

const generateMockJobs = (count: number): AvailableJob[] => {
    return Array.from({ length: count }).map((_, i) => {
        const urgency = ['low', 'normal', 'high', 'critical'][Math.floor(Math.random() * 4)] as Urgency;
        const hasNote = Math.random() > 0.7;

        return {
            job_id: `job-${i}`,
            job_code: `SM2-2024-${1000 + i}`,
            dealership_name: DEALERSHIPS[Math.floor(Math.random() * DEALERSHIPS.length)],
            service_name: SERVICES[Math.floor(Math.random() * SERVICES.length)],
            urgency,
            zone: ZONES[Math.floor(Math.random() * ZONES.length)],
            created_at: new Date(Date.now() - Math.random() * 7200000).toISOString(), // Within last 2 hours
            note_preview: hasNote ? 'Customer waiting on-site. Bring diagnostic tools.' : undefined,
            status: 'READY_FOR_TECH_ACCEPTANCE',
            rejected_tech_ids: [],
        };
    });
};

const MOCK_JOBS = generateMockJobs(8);

const readStoredJobs = (): AvailableJob[] => {
    try {
        const raw = localStorage.getItem(AVAILABLE_JOBS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as AvailableJob[]) : [];
    } catch {
        return [];
    }
};

const writeStoredJobs = (jobs: AvailableJob[]) => {
    localStorage.setItem(AVAILABLE_JOBS_STORAGE_KEY, JSON.stringify(jobs));
};

const readStoredRejections = (): JobRejectionRecord[] => {
    try {
        const raw = localStorage.getItem(JOB_REJECTIONS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as JobRejectionRecord[]) : [];
    } catch {
        return [];
    }
};

const appendRejection = (record: JobRejectionRecord) => {
    const existing = readStoredRejections();
    const deduped = existing.filter(
        (item) => !(item.job_id === record.job_id && item.tech_id === record.tech_id)
    );
    localStorage.setItem(JOB_REJECTIONS_STORAGE_KEY, JSON.stringify([record, ...deduped]));
};

const appendAuditLog = (
    _event_type: string,
    _summary: string,
    _payload_json: Record<string, unknown>,
    _severity: 'info' | 'warning' | 'critical' = 'info'
) => {
    // Audit logging intentionally disabled.
};

// --- Components ---

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
    const styles: Record<Urgency, string> = {
        critical: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
        high: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
        normal: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
        low: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
    };

    const labels: Record<Urgency, string> = {
        critical: 'Critical',
        high: 'High',
        normal: 'Normal',
        low: 'Low',
    };

    return (
        <Badge
            variant="outline"
            className={cn(
                'font-semibold text-xs px-2.5 py-0.5 border',
                styles[urgency],
                urgency === 'critical' && 'animate-pulse'
            )}
        >
            {labels[urgency]}
        </Badge>
    );
}

function TimeAgo({ timestamp }: { timestamp: string }) {
    const getTimeAgo = (isoString: string): string => {
        const now = new Date();
        const past = new Date(isoString);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {getTimeAgo(timestamp)}
        </span>
    );
}

function JobCard({
    job,
    onAccept,
    onReject,
}: {
    job: AvailableJob;
    onAccept: (jobId: string) => void;
    onReject: (jobId: string) => void;
}) {
    const [accepting, setAccepting] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    const handleAccept = async () => {
        if (rejecting) return;
        setAccepting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        onAccept(job.job_id);
    };

    const handleReject = async () => {
        if (accepting) return;
        setRejecting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        onReject(job.job_id);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="p-5 pb-4 space-y-3">
                {/* Job Code & Time */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                            {job.job_code}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                            {job.service_name}
                        </p>
                    </div>
                    <UrgencyBadge urgency={job.urgency} />
                </div>

                {/* Dealership */}
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {job.dealership_name}
                    </span>
                </div>

                {/* Zone & Time */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 text-[#2F8E92] dark:text-teal-400" />
                        <span className="font-medium">{job.zone}</span>
                    </div>
                    <TimeAgo timestamp={job.created_at} />
                </div>

                {/* Note Preview (if exists) */}
                {job.note_preview && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            <span className="inline-flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                                <span className="font-medium">Note:</span>
                            </span>{' '}
                            {job.note_preview}
                        </p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5">
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={handleReject}
                        disabled={accepting || rejecting}
                        variant="outline"
                        className={cn(
                            "h-12 text-base font-semibold rounded-xl transition-all duration-200",
                            "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700",
                            "disabled:opacity-70 disabled:cursor-not-allowed"
                        )}
                    >
                        {rejecting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Rejecting...
                            </>
                        ) : (
                            <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Reject
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleAccept}
                        disabled={accepting || rejecting}
                        className={cn(
                            "h-12 text-base font-semibold rounded-xl transition-all duration-200",
                            "bg-[#2F8E92] hover:bg-[#267276] text-white",
                            "disabled:opacity-70 disabled:cursor-not-allowed",
                            "shadow-sm hover:shadow-md active:scale-[0.98]"
                        )}
                    >
                        {accepting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Accepting...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Accept
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function BottomNav({
    activeTab,
    routeBase,
}: {
    activeTab: 'available' | 'my-jobs' | 'schedule' | 'profile';
    routeBase: string;
}) {
    const navigate = useNavigate();

    const tabs = [
        { id: 'available', label: 'Available', icon: Briefcase, path: `${routeBase}/available-jobs` },
        { id: 'my-jobs', label: 'My Jobs', icon: Calendar, path: `${routeBase}/my-jobs` },
        { id: 'schedule', label: 'Schedule', icon: Clock, path: `${routeBase}/schedule` },
        { id: 'profile', label: 'Profile', icon: User, path: `${routeBase}/profile` },
    ] as const;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl z-50 safe-area-bottom">
            <div className="max-w-2xl mx-auto px-2 py-2">
                <div className="flex items-center justify-around gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl transition-all duration-200 flex-1",
                                    isActive
                                        ? "bg-[#2F8E92]/10 dark:bg-[#2F8E92]/20 text-[#2F8E92] dark:text-teal-400"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                                <span className={cn("text-xs font-semibold", isActive && "font-bold")}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// --- Main Component ---

export default function AvailableJobsPage() {
    const [jobs, setJobs] = useState<AvailableJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const { techId: previewTechId } = useParams();
    const { user, technicianAccounts } = useAuth();
    const navigate = useNavigate();
    const technicianDirectory = useMemo(
        () => technicianAccounts.map((tech) => ({
            id: tech.id,
            name: tech.name,
            techCode: tech.id.slice(0, 8).toUpperCase(),
            status: tech.isActive ? 'active' : 'inactive',
        })),
        [technicianAccounts],
    );

    const currentTech = useMemo(() => {
        if (previewTechId) {
            const previewTech = technicianDirectory.find((tech) => tech.id === previewTechId);
            if (previewTech) return previewTech;
            return { id: previewTechId, name: 'Preview Technician', techCode: 'TECH-001', status: 'active' };
        }

        if (user?.role === 'technician') {
            return {
                id: user.id,
                name: user.name,
                techCode: user.id.slice(0, 8).toUpperCase(),
                status: 'active',
            };
        }

        return technicianDirectory[0] ?? { id: 'tech-001', name: 'Technician', techCode: 'TECH-001', status: 'active' };
    }, [previewTechId, technicianDirectory, user]);

    const currentTechId = currentTech.id;
    const currentTechCode = currentTech.techCode ?? currentTech.id;
    const isPreviewMode = Boolean(previewTechId);
    const routeBase = isPreviewMode ? `/admin/tech-preview/${currentTechId}` : '/tech';
    const myJobsPath = `${routeBase}/my-jobs`;

    const isJobVisibleForTech = (job: AvailableJob, techId: string, rejections: JobRejectionRecord[]) => {
        const jobStatus = job.status ?? 'READY_FOR_TECH_ACCEPTANCE';
        if (jobStatus !== 'READY_FOR_TECH_ACCEPTANCE') return false;

        if (job.eligible_tech_ids && job.eligible_tech_ids.length > 0 && !job.eligible_tech_ids.includes(techId)) {
            return false;
        }

        if (job.rejected_tech_ids?.includes(techId)) {
            return false;
        }

        return !rejections.some((entry) => entry.job_id === job.job_id && entry.tech_id === techId);
    };

    const ensureSeedJobs = () => {
        const existing = readStoredJobs();
        if (existing.length > 0) return existing;
        writeStoredJobs(MOCK_JOBS);
        return MOCK_JOBS;
    };

    const fetchJobs = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        const source = ensureSeedJobs();
        const rejections = readStoredRejections();
        const visibleJobs = source
            .filter((job) => isJobVisibleForTech(job, currentTechId, rejections))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setJobs(visibleJobs);
        setLastUpdated(new Date());
        setLoading(false);
    };

    useEffect(() => {
        fetchJobs();
    }, [currentTechId]);

    const handleAcceptJob = (jobId: string) => {
        const acceptedJob = jobs.find((job) => job.job_id === jobId);
        const storedJobs = readStoredJobs().filter((job) => job.job_id !== jobId);
        writeStoredJobs(storedJobs);
        setJobs(prev => prev.filter(j => j.job_id !== jobId));

        if (acceptedJob) {
            appendAuditLog(
                'job.accepted',
                `Job ${acceptedJob.job_code} accepted by ${currentTechCode}`,
                {
                    job_id: acceptedJob.job_id,
                    job_code: acceptedJob.job_code,
                    tech_id: currentTechId,
                    tech_code: currentTechCode,
                }
            );
        }

        setTimeout(() => {
            navigate(myJobsPath);
        }, 500);
    };

    const handleRejectJob = (jobId: string) => {
        const rejectedJob = jobs.find((job) => job.job_id === jobId);
        if (!rejectedJob) return;

        appendRejection({
            job_id: rejectedJob.job_id,
            tech_id: currentTechId,
            rejected_at: new Date().toISOString(),
        });

        const nextJobs = readStoredJobs().map((job) => {
            if (job.job_id !== jobId) return job;
            const rejectedList = job.rejected_tech_ids ?? [];
            if (rejectedList.includes(currentTechId)) return job;
            return { ...job, rejected_tech_ids: [...rejectedList, currentTechId] };
        });
        writeStoredJobs(nextJobs);

        appendAuditLog(
            'job.rejected',
            `Job ${rejectedJob.job_code} rejected by ${currentTechCode}`,
            {
                job_id: rejectedJob.job_id,
                job_code: rejectedJob.job_code,
                tech_id: currentTechId,
                tech_code: currentTechCode,
            },
            'warning'
        );

        setJobs((prev) => prev.filter((job) => job.job_id !== jobId));
        setLastUpdated(new Date());
    };

    const handleCreateDummyJob = () => {
        const now = new Date();
        const jobId = `job-test-${Date.now()}`;
        const jobCode = `TEST-READY-${String(Date.now()).slice(-4)}`;

        const dummyJob: AvailableJob = {
            job_id: jobId,
            job_code: jobCode,
            dealership_name: 'QA Dispatch Dealer',
            service_name: 'Technician Reject Flow Validation',
            urgency: 'normal',
            zone: 'Quebec',
            created_at: now.toISOString(),
            note_preview: `Dummy QA job scoped for ${currentTechCode}. Use Reject to validate refusal flow.`,
            status: 'READY_FOR_TECH_ACCEPTANCE',
            eligible_tech_ids: [currentTechId],
            rejected_tech_ids: [],
            is_test_dummy: true,
        };

        const nextJobs = [dummyJob, ...readStoredJobs()];
        writeStoredJobs(nextJobs);

        appendAuditLog(
            'job.created',
            `Dummy test job ${dummyJob.job_code} created for ${currentTechCode}`,
            {
                job_id: dummyJob.job_id,
                job_code: dummyJob.job_code,
                created_for_tech_id: currentTechId,
                created_for_tech_code: currentTechCode,
                status: dummyJob.status,
                test_data: true,
            }
        );

        setJobs((prev) => [dummyJob, ...prev]);
        setLastUpdated(now);
    };

    const handleClearDummyJobs = () => {
        const existingJobs = readStoredJobs();
        const dummyIds = existingJobs.filter((job) => job.is_test_dummy).map((job) => job.job_id);
        if (dummyIds.length === 0) return;

        writeStoredJobs(existingJobs.filter((job) => !job.is_test_dummy));
        const remainingRejections = readStoredRejections().filter((entry) => !dummyIds.includes(entry.job_id));
        localStorage.setItem(JOB_REJECTIONS_STORAGE_KEY, JSON.stringify(remainingRejections));

        appendAuditLog(
            'job.test_data_cleared',
            `Cleared ${dummyIds.length} dummy available-job record(s)`,
            { removed_job_ids: dummyIds, removed_count: dummyIds.length, test_data: true }
        );

        fetchJobs();
    };

    const handleRefresh = () => {
        fetchJobs();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Available Jobs
                        </h1>
                        {lastUpdated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Updated {lastUpdated.toLocaleTimeString()}
                            </p>
                        )}
                        <p className="text-xs text-[#2F8E92] dark:text-teal-400 mt-0.5 font-medium">
                            Viewing as {currentTech.name} ({currentTechCode})
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCreateDummyJob}
                            className="h-9 gap-1.5 text-xs sm:text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Dummy Job
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearDummyJobs}
                            className="h-9 gap-1.5 text-xs sm:text-sm border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear Dummy
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                            disabled={loading}
                        >
                            <RefreshCw className={cn("w-5 h-5 text-gray-600 dark:text-gray-400", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Job List */}
            <div className="max-w-2xl mx-auto px-4 py-5">
                {loading ? (
                    // Loading State
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse"
                            >
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
                                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    // Empty State
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5">
                            <Briefcase className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            No Available Jobs
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                            There are no jobs available at the moment. Check back soon or refresh to see updates.
                        </p>
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            className="mt-6 h-11 px-6 font-semibold"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                ) : (
                    // Job Cards
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <JobCard
                                key={job.job_id}
                                job={job}
                                onAccept={handleAcceptJob}
                                onReject={handleRejectJob}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <BottomNav activeTab="available" routeBase={routeBase} />
        </div>
    );
}
