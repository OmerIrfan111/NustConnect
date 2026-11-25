export const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'id_card', label: 'ID Cards' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books & Notes' },
  { value: 'keys', label: 'Keys' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'documents', label: 'Documents' },
  { value: 'other', label: 'Other' },
];

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.filter((c) => c.value !== 'all').map((c) => [c.value, c.label]));

export const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'returned', label: 'Returned' },
  { value: 'all', label: 'All Statuses' },
];

export function formatDate(value) {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
