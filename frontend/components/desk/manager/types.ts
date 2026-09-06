export interface PerformanceChat {
  id: string;
  customerId: string;
  status: string;
  queuedAt: string;
  assignedAt: string | null;
  firstResponseAt: string | null;
  firstResponseSeconds: number | null;
  lateReplyCount: number;
  lastCustomerMessageAt: string | null;
  lastAgentReplyAt: string | null;
  slaBreached: boolean;
  messages: Array<{
    id: string;
    senderType: string;
    text: string;
    sentAt: string;
  }>;
}

export type DrillFilterType = 'ALL' | 'LATE' | 'SLOW';

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m`;
}
