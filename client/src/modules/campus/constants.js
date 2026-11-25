export const LOCATION_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'gate', label: 'Gates' },
  { value: 'academic', label: 'Academic' },
  { value: 'food', label: 'Food' },
  { value: 'hostel', label: 'Hostels' },
  { value: 'admin', label: 'Admin' },
  { value: 'sports', label: 'Sports' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export const GUIDE_SECTIONS = [
  { value: 'all', label: 'All topics' },
  { value: 'first_week', label: 'First week' },
  { value: 'academics', label: 'Academics' },
  { value: 'hostels', label: 'Hostels' },
  { value: 'transport', label: 'Transport' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'safety', label: 'Safety' },
  { value: 'facilities', label: 'Facilities' },
];

export const SPLIT_METHODS = [
  { value: 'equal', label: 'Split equally' },
  { value: 'item', label: 'By item' },
  { value: 'custom', label: 'Custom amounts' },
];

export const SPLIT_LABELS = Object.fromEntries(SPLIT_METHODS.map((m) => [m.value, m.label]));

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
