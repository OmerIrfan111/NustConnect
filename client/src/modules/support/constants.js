export const COMPLAINT_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'internet', label: 'Wi-Fi / Internet' },
  { value: 'hostel', label: 'Hostels' },
  { value: 'classroom', label: 'Classrooms & Labs' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export const COMPLAINT_STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  reopened: 'Reopened',
};

export const ALLOWED_TRANSITIONS = {
  submitted: ['under_review', 'assigned', 'in_progress', 'resolved'],
  under_review: ['assigned', 'in_progress', 'resolved'],
  assigned: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: ['reopened'],
  reopened: ['under_review', 'assigned', 'in_progress', 'resolved'],
};

export const HELPBOX_CATEGORIES = [
  { value: 'academics', label: 'Academics' },
  { value: 'hostels', label: 'Hostels & Mess' },
  { value: 'transport', label: 'Transport' },
  { value: 'mental_health', label: 'Wellbeing & Support' },
  { value: 'administration', label: 'Administration' },
  { value: 'campus_life', label: 'Campus Life' },
  { value: 'other', label: 'Other' },
];

export const FAQ_CATEGORIES = [
  { value: 'all', label: 'All Topics' },
  { value: 'academics', label: 'Academics' },
  { value: 'hostels', label: 'Hostels' },
  { value: 'transport', label: 'Transport' },
  { value: 'it_lms', label: 'IT & LMS' },
  { value: 'fees_scholarships', label: 'Fees & Scholarships' },
  { value: 'campus_life', label: 'Campus Life' },
  { value: 'general', label: 'General' },
];

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
