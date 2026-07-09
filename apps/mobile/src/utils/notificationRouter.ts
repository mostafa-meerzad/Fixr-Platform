import { router } from 'expo-router';
import { UserRole } from '@fixr/shared';

// Handles navigation from both FCM push payloads and in-app notification inbox rows.
// FCM uses its own type strings (VERIFICATION_APPROVED, JOB_POSTED, EXPERT_EN_ROUTE …).
// DB notifications use NotificationType enum values (EXPERT_VERIFIED, JOB_PUBLISHED …).
// Both sets are handled here so the two call sites share one function.
export function navigateFromNotification(
  data: Record<string, string | undefined>,
  role: UserRole | undefined,
) {
  const { type, jobId, channel_id } = data;

  // Stream Chat push: type = "message.new", channel_id = "job-<jobId>"
  if (type === 'message.new') {
    const match = (channel_id ?? '').match(/^(?:messaging:)?job-(.+)$/);
    if (match) router.push(`/(shared)/chat/${match[1]}` as any);
    return;
  }

  switch (type) {
    // Homeowner receives new bid
    case 'BID_RECEIVED':
    // Homeowner receives notice that expert withdrew bid
    case 'BID_WITHDRAWN':
      if (jobId) router.push(`/(homeowner)/job/${jobId}` as any);
      break;

    // Expert receives new job in their zone (FCM: JOB_POSTED, DB: JOB_PUBLISHED)
    case 'JOB_POSTED':
    case 'JOB_PUBLISHED':
      if (jobId) router.push(`/(expert)/job/${jobId}` as any);
      break;

    // Expert receives bid accepted or job assigned (FCM: BID_ACCEPTED, DB: JOB_ASSIGNED)
    case 'BID_ACCEPTED':
    case 'JOB_ASSIGNED':
    // Expert receives job-completed confirmation
    case 'JOB_COMPLETED':
      if (jobId) router.push(`/(expert)/active-job/${jobId}` as any);
      break;

    // Homeowner receives expert status updates
    case 'EXPERT_EN_ROUTE':
    case 'EXPERT_ARRIVED':
    case 'COMPLETION_REQUESTED':
      if (jobId) router.push(`/(homeowner)/active-job/${jobId}` as any);
      break;

    // Expert's bid was rejected → go to bids list
    case 'BID_REJECTED':
      router.push('/(expert)/my-bids' as any);
      break;

    case 'JOB_CANCELLED':
      if (role === UserRole.EXPERT) router.push('/(expert)/my-bids' as any);
      else router.push('/(homeowner)/my-jobs' as any);
      break;

    // Expert verification approved (FCM: VERIFICATION_APPROVED, DB: EXPERT_VERIFIED)
    case 'VERIFICATION_APPROVED':
    case 'EXPERT_VERIFIED':
      router.push('/(expert)/browse' as any);
      break;

    // Expert verification rejected (FCM: VERIFICATION_REJECTED, DB: EXPERT_REJECTED)
    case 'VERIFICATION_REJECTED':
    case 'EXPERT_REJECTED':
      router.push('/(expert)/profile' as any);
      break;

    // Dispute notifications — route to the active-job screen for the relevant role
    case 'DISPUTE_OPENED':
    case 'DISPUTE_RESOLVED':
      if (jobId) {
        if (role === UserRole.EXPERT) {
          router.push(`/(expert)/active-job/${jobId}` as any);
        } else {
          router.push(`/(homeowner)/active-job/${jobId}` as any);
        }
      }
      break;

    default:
      break;
  }
}
