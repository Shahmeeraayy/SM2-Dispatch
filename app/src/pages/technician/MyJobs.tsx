import { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    User,
    Briefcase,
    MapPin,
    ChevronDown,
    ChevronUp,
    Play,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MOCK_SERVICES } from '../admin/Services';
import { MOCK_DEALERSHIPS } from '../admin/Dealerships';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// --- Types ---

type JobStatus = 'scheduled' | 'in_progress' | 'delayed' | 'completed';
type Urgency = 'low' | 'normal' | 'high' | 'critical';

interface MyJob {
    job_id: string;
    job_code: string;
    dealership_name: string;
    service_name: string;
    job_status: JobStatus;
    urgency?: Urgency;
    scheduled_time?: string;
    zone: string;
    allowed_actions: ('start' | 'done' | 'delay' | 'refuse')[];
}

// --- Mock Data ---

const generateMockMyJobs = (): MyJob[] => {
    const services = MOCK_SERVICES.map(s => s.name);
    const dealers = MOCK_DEALERSHIPS.map(d => d.name);
    const zones = ['Québec', 'Lévis', 'Donnacona', 'St-Raymond'];

    return [
        {
            job_id: 'job-1',
            job_code: 'SM2-2024-1001',
            dealership_name: dealers[Math.floor(Math.random() * dealers.length)] || 'Audi de Quebec',
            service_name: services[Math.floor(Math.random() * services.length)] || 'Bande pare-brise teintée',
            job_status: 'in_progress',
            urgency: 'high',
            zone: zones[Math.floor(Math.random() * zones.length)],
            allowed_actions: ['done', 'delay'],
        },
        {
            job_id: 'job-2',
            job_code: 'SM2-2024-1005',
            dealership_name: dealers[Math.floor(Math.random() * dealers.length)] || 'Toyota Ste-Foy',
            service_name: services[Math.floor(Math.random() * services.length)] || 'Démarreur 2-Way – Audi',
            job_status: 'scheduled',
            urgency: 'normal',
            scheduled_time: new Date(Date.now() + 3600000).toISOString(),
            zone: zones[Math.floor(Math.random() * zones.length)],
            allowed_actions: ['start', 'delay', 'refuse'],
        },
        {
            job_id: 'job-3',
            job_code: 'SM2-2024-1008',
            dealership_name: dealers[Math.floor(Math.random() * dealers.length)] || 'Honda Donnacona',
            service_name: services[Math.floor(Math.random() * services.length)] || 'Main-d’œuvre – régulier',
            job_status: 'delayed',
            urgency: 'critical',
            scheduled_time: new Date(Date.now() - 1800000).toISOString(),
            zone: zones[Math.floor(Math.random() * zones.length)],
            allowed_actions: ['start', 'refuse'],
        },
        {
            job_id: 'job-4',
            job_code: 'SM2-2024-0998',
            dealership_name: dealers[Math.floor(Math.random() * dealers.length)] || 'Audi de Quebec',
            service_name: services[Math.floor(Math.random() * services.length)] || 'PPF capot 12" + ailes',
            job_status: 'completed',
            zone: zones[Math.floor(Math.random() * zones.length)],
            allowed_actions: [],
        },
        {
            job_id: 'job-5',
            job_code: 'SM2-2024-0995',
            dealership_name: dealers[Math.floor(Math.random() * dealers.length)] || 'Toyota Ste-Foy',
            service_name: services[Math.floor(Math.random() * services.length)] || 'Teintage complet – standard',
            job_status: 'completed',
            zone: zones[Math.floor(Math.random() * zones.length)],
            allowed_actions: [],
        },
    ];
};

// --- Components ---

function StatusBadge({ status }: { status: JobStatus }) {
    const styles: Record<JobStatus, string> = {
        scheduled: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
        in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
        delayed: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
        completed: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
    };

    const labels: Record<JobStatus, string> = {
        scheduled: 'Scheduled',
        in_progress: 'In Progress',
        delayed: 'Delayed',
        completed: 'Completed',
    };

    return (
        <Badge variant="outline" className={cn('font-semibold text-xs px-2.5 py-0.5 border', styles[status])}>
            {labels[status]}
        </Badge>
    );
}

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

function JobCard({
    job,
    onStart,
    onDone,
    onDelay,
    onRefuse,
}: {
    job: MyJob;
    onStart: (jobId: string) => void;
    onDone: (jobId: string) => void;
    onDelay: (jobId: string) => void;
    onRefuse: (jobId: string) => void;
}) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleAction = async (action: string, handler: (jobId: string) => void) => {
        setActionLoading(action);
        await new Promise(resolve => setTimeout(resolve, 600));
        handler(job.job_id);
        setActionLoading(null);
    };

    const formatScheduledTime = (isoString: string): string => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                            {job.job_code}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                            {job.service_name}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={job.job_status} />
                        {job.urgency && <UrgencyBadge urgency={job.urgency} />}
                    </div>
                </div>

                {/* Dealership */}
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {job.dealership_name}
                    </span>
                </div>

                {/* Zone & Scheduled Time */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 text-[#2F8E92] dark:text-teal-400" />
                        <span className="font-medium">{job.zone}</span>
                    </div>
                    {job.scheduled_time && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{formatScheduledTime(job.scheduled_time)}</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {job.allowed_actions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                        {job.allowed_actions.includes('start') && (
                            <Button
                                onClick={() => handleAction('start', onStart)}
                                disabled={!!actionLoading}
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "bg-[#2F8E92] hover:bg-[#267276] text-white",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'start' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                START
                            </Button>
                        )}

                        {job.allowed_actions.includes('done') && (
                            <Button
                                onClick={() => handleAction('done', onDone)}
                                disabled={!!actionLoading}
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "bg-emerald-600 hover:bg-emerald-700 text-white",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'done' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                DONE
                            </Button>
                        )}

                        {job.allowed_actions.includes('delay') && (
                            <Button
                                onClick={() => handleAction('delay', onDelay)}
                                disabled={!!actionLoading}
                                variant="outline"
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "border-2 border-orange-500 text-orange-600 hover:bg-orange-50",
                                    "dark:border-orange-600 dark:text-orange-500 dark:hover:bg-orange-900/20",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'delay' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                )}
                                DELAY
                            </Button>
                        )}

                        {job.allowed_actions.includes('refuse') && (
                            <Button
                                onClick={() => handleAction('refuse', onRefuse)}
                                disabled={!!actionLoading}
                                variant="outline"
                                className={cn(
                                    "flex-1 h-11 text-sm font-semibold rounded-xl",
                                    "border-2 border-red-500 text-red-600 hover:bg-red-50",
                                    "dark:border-red-600 dark:text-red-500 dark:hover:bg-red-900/20",
                                    "disabled:opacity-50"
                                )}
                            >
                                {actionLoading === 'refuse' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                )}
                                REFUSE
                            </Button>
                        )}
                    </div>
                )}
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

export default function MyJobsPage() {
    const { techId: previewTechId } = useParams();
    const routeBase = previewTechId ? `/admin/tech-preview/${previewTechId}` : '/tech';
    const [jobs, setJobs] = useState<MyJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompleted, setShowCompleted] = useState(false);

    // Modals
    const [delayModalOpen, setDelayModalOpen] = useState(false);
    const [refuseModalOpen, setRefuseModalOpen] = useState(false);
    const [doneModalOpen, setDoneModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    // Delay Modal State
    const [delayMinutes, setDelayMinutes] = useState<string>('15');
    const [delayCustomMinutes, setDelayCustomMinutes] = useState('');
    const [delayNote, setDelayNote] = useState('');

    // Refuse Modal State
    const [refuseReason, setRefuseReason] = useState('');
    const [refuseComment, setRefuseComment] = useState('');

    // Action Loading
    const [confirmLoading, setConfirmLoading] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, [previewTechId]);

    const fetchJobs = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setJobs(generateMockMyJobs());
        setLoading(false);
    };

    const activeJobs = jobs.filter(j => ['scheduled', 'in_progress', 'delayed'].includes(j.job_status));
    const completedJobs = jobs.filter(j => j.job_status === 'completed');

    // Handlers
    const handleStart = async (jobId: string) => {
        console.log('Start job:', jobId);
        // In production: API call to start job
        setJobs(prev => prev.map(j =>
            j.job_id === jobId
                ? { ...j, job_status: 'in_progress' as JobStatus, allowed_actions: ['done', 'delay'] }
                : j
        ));
    };

    const handleDone = (jobId: string) => {
        setSelectedJobId(jobId);
        setDoneModalOpen(true);
    };

    const confirmDone = async () => {
        if (!selectedJobId) return;

        setConfirmLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log('Complete job:', selectedJobId);
        // In production: API call to complete job
        setJobs(prev => prev.map(j =>
            j.job_id === selectedJobId
                ? { ...j, job_status: 'completed' as JobStatus, allowed_actions: [] }
                : j
        ));

        setConfirmLoading(false);
        setDoneModalOpen(false);
        setSelectedJobId(null);
    };

    const handleDelay = (jobId: string) => {
        setSelectedJobId(jobId);
        setDelayModalOpen(true);
    };

    const confirmDelay = async () => {
        if (!selectedJobId) return;

        const minutes = delayMinutes === 'custom'
            ? parseInt(delayCustomMinutes)
            : parseInt(delayMinutes);

        if (!minutes || minutes <= 0) return;

        setConfirmLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log('Delay job:', selectedJobId, 'Minutes:', minutes, 'Note:', delayNote);
        // In production: API call to delay job
        setJobs(prev => prev.map(j =>
            j.job_id === selectedJobId
                ? { ...j, job_status: 'delayed' as JobStatus }
                : j
        ));

        // Reset form
        setDelayMinutes('15');
        setDelayCustomMinutes('');
        setDelayNote('');
        setConfirmLoading(false);
        setDelayModalOpen(false);
        setSelectedJobId(null);
    };

    const handleRefuse = (jobId: string) => {
        setSelectedJobId(jobId);
        setRefuseModalOpen(true);
    };

    const confirmRefuse = async () => {
        if (!selectedJobId || !refuseReason) return;

        setConfirmLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log('Refuse job:', selectedJobId, 'Reason:', refuseReason, 'Comment:', refuseComment);
        // In production: API call to refuse job
        setJobs(prev => prev.filter(j => j.job_id !== selectedJobId));

        // Reset form
        setRefuseReason('');
        setRefuseComment('');
        setConfirmLoading(false);
        setRefuseModalOpen(false);
        setSelectedJobId(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="max-w-2xl mx-auto px-5 py-4">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                        My Jobs
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {activeJobs.length} active • {completedJobs.length} completed
                    </p>
                </div>
            </div>

            {/* Job List */}
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
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
                                <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Active Jobs */}
                        {activeJobs.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                                    Active
                                </h2>
                                {activeJobs.map((job) => (
                                    <JobCard
                                        key={job.job_id}
                                        job={job}
                                        onStart={handleStart}
                                        onDone={handleDone}
                                        onDelay={handleDelay}
                                        onRefuse={handleRefuse}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Completed Jobs (Collapsible) */}
                        {completedJobs.length > 0 && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    className="w-full flex items-center justify-between px-1 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <span>Completed ({completedJobs.length})</span>
                                    {showCompleted ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </button>

                                {showCompleted && (
                                    <div className="space-y-3">
                                        {completedJobs.map((job) => (
                                            <JobCard
                                                key={job.job_id}
                                                job={job}
                                                onStart={handleStart}
                                                onDone={handleDone}
                                                onDelay={handleDelay}
                                                onRefuse={handleRefuse}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Empty State */}
                        {activeJobs.length === 0 && completedJobs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5">
                                    <Calendar className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    No Jobs Assigned
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                    You don't have any jobs assigned. Check Available Jobs to accept new work.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delay Modal */}
            <Dialog open={delayModalOpen} onOpenChange={setDelayModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delay Job</DialogTitle>
                        <DialogDescription>
                            Select delay duration and add an optional note
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="delay-minutes">Delay Duration</Label>
                            <Select value={delayMinutes} onValueChange={setDelayMinutes}>
                                <SelectTrigger id="delay-minutes">
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15 minutes</SelectItem>
                                    <SelectItem value="30">30 minutes</SelectItem>
                                    <SelectItem value="60">60 minutes</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {delayMinutes === 'custom' && (
                            <div className="space-y-2">
                                <Label htmlFor="custom-minutes">Custom Minutes</Label>
                                <Input
                                    id="custom-minutes"
                                    type="number"
                                    placeholder="Enter minutes"
                                    value={delayCustomMinutes}
                                    onChange={(e) => setDelayCustomMinutes(e.target.value)}
                                    min="1"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="delay-note">Note (Optional)</Label>
                            <Textarea
                                id="delay-note"
                                placeholder="Add a note about the delay..."
                                value={delayNote}
                                onChange={(e) => setDelayNote(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDelayModalOpen(false);
                                setDelayMinutes('15');
                                setDelayCustomMinutes('');
                                setDelayNote('');
                            }}
                            disabled={confirmLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelay}
                            disabled={confirmLoading || (delayMinutes === 'custom' && !delayCustomMinutes)}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {confirmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm Delay
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Refuse Modal */}
            <Dialog open={refuseModalOpen} onOpenChange={setRefuseModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Refuse Job</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for refusing this job
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="refuse-reason">Reason *</Label>
                            <Select value={refuseReason} onValueChange={setRefuseReason}>
                                <SelectTrigger id="refuse-reason">
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="too_far">Too far from location</SelectItem>
                                    <SelectItem value="no_equipment">Don't have required equipment</SelectItem>
                                    <SelectItem value="schedule_conflict">Schedule conflict</SelectItem>
                                    <SelectItem value="vehicle_issue">Vehicle issue</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="refuse-comment">Additional Comment (Optional)</Label>
                            <Textarea
                                id="refuse-comment"
                                placeholder="Add any additional details..."
                                value={refuseComment}
                                onChange={(e) => setRefuseComment(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRefuseModalOpen(false);
                                setRefuseReason('');
                                setRefuseComment('');
                            }}
                            disabled={confirmLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmRefuse}
                            disabled={confirmLoading || !refuseReason}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {confirmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm Refuse
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Done Confirmation Modal */}
            <Dialog open={doneModalOpen} onOpenChange={setDoneModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Complete Job</DialogTitle>
                        <DialogDescription>
                            Mark this job as completed?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            This action will mark the job as completed and move it to your completed jobs list.
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDoneModalOpen(false)}
                            disabled={confirmLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDone}
                            disabled={confirmLoading}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {confirmLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm Complete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bottom Navigation */}
            <BottomNav activeTab="my-jobs" routeBase={routeBase} />
        </div>
    );
}
