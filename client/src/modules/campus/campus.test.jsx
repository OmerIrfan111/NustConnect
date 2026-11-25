import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
// Leaflet needs a real browser layout engine, so the map widgets are replaced by simple stand-ins in jsdom.
vi.mock('react-leaflet', async () => {
  const { createElement: h } = await import('react');
  return {
    MapContainer: ({ children }) => h('div', { 'data-testid': 'map' }, children),
    TileLayer: ({ eventHandlers }) => h('button', { onClick: () => eventHandlers?.tileerror?.() }, 'simulate tile error'),
    CircleMarker: ({ center }) => h('i', { 'data-testid': 'marker', 'data-lat': center[0] }),
    Popup: () => null,
  };
});
import http from '@core/api/http.js';
import { AuthProvider, DEMO_USER } from '../auth/useAuth.js';
import CampusMap from './pages/CampusMap.jsx';
import FreshieGuide from './pages/FreshieGuide.jsx';
import BillsList from './pages/BillsList.jsx';
import NewBill from './pages/NewBill.jsx';
import BillDetail from './pages/BillDetail.jsx';
import { divideEvenly, formatPKR, toCents } from './money.js';

const wrap = (ui, { path = '/', user = DEMO_USER } = {}) =>
  render(
    <AuthProvider initialUser={user}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </AuthProvider>,
  );

const PLACES = [
  { id: 'l1', name: 'Central Library', category: 'academic', lat: 33.64, lng: 72.99, description: 'Books', landmark: 'By the lawn', directionsUrl: 'https://osm.test/1', isSample: true },
  { id: 'l2', name: 'Concordia Food Court', category: 'food', lat: 33.65, lng: 72.98, description: 'Lunch', landmark: 'Near NBS', directionsUrl: 'https://osm.test/2', isSample: true },
];

beforeEach(() => vi.clearAllMocks());

describe('money helpers', () => {
  test('cents, formatting and exact division', () => {
    expect(toCents('19.99')).toBe(1999);
    expect(formatPKR(2500)).toBe('PKR 2,500');
    expect(formatPKR(333.34)).toBe('PKR 333.34');
    expect(divideEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(divideEvenly(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000);
    expect(divideEvenly(5, 0)).toEqual([]);
  });
});

describe('CampusMap (guests allowed)', () => {
  test('lists places, filters by category and search, labels sample data', async () => {
    http.get.mockResolvedValue({ data: PLACES });
    wrap(<CampusMap />, { user: null });

    expect(await screen.findByRole('button', { name: /Central Library/ })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/Sample data/);
    expect(screen.getAllByTestId('marker')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Food' }));
    expect(screen.queryByRole('button', { name: /Central Library/ })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('marker')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search campus places' }), 'zzz');
    expect(await screen.findByRole('heading', { name: 'No places match' })).toBeInTheDocument();
  });

  test('a tile failure shows a notice and the list keeps working (offline-safe)', async () => {
    http.get.mockResolvedValue({ data: PLACES });
    wrap(<CampusMap />, { user: null });
    await screen.findByRole('button', { name: /Central Library/ });

    await userEvent.click(screen.getByRole('button', { name: 'simulate tile error' }));
    expect(screen.getByRole('status')).toHaveTextContent(/tiles could not load/i);
    await userEvent.click(screen.getByRole('button', { name: /Concordia Food Court/ }));
    expect(screen.getByRole('link', { name: /Get directions/ })).toHaveAttribute('href', 'https://osm.test/2');
  });

  test('shows an error with retry when the locations cannot load', async () => {
    http.get.mockRejectedValueOnce({ message: 'Offline' });
    wrap(<CampusMap />, { user: null });
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    http.get.mockResolvedValueOnce({ data: PLACES });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /Central Library/ })).toBeInTheDocument();
  });
});

describe('FreshieGuide (guests allowed)', () => {
  test('shows articles and filters by topic', async () => {
    http.get.mockResolvedValue({
      data: {
        guides: [
          { id: 'g1', title: 'First week checklist', section: 'first_week', summary: 'Do these', body: 'Collect your ID', isSample: true },
          { id: 'g2', title: 'Shuttle routes', section: 'transport', summary: 'Buses', body: 'Every 15 minutes' },
        ],
      },
    });
    wrap(<FreshieGuide />, { user: null });
    expect(await screen.findByRole('heading', { name: 'First week checklist' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Transport' }));
    expect(screen.queryByRole('heading', { name: 'First week checklist' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shuttle routes' })).toBeInTheDocument();
  });
});

describe('BillsList', () => {
  const bill = { id: 'b1', title: 'Murree cabin', totalAmount: 3000, remainingCents: 200000, status: 'open', splitMethod: 'equal', creatorName: 'Ahmed Khan', participants: [{}, {}, {}] };

  test('shows bills and an empty state', async () => {
    http.get.mockResolvedValueOnce({ data: { bills: [bill] } });
    wrap(<BillsList />);
    expect(await screen.findByRole('heading', { name: 'Murree cabin' })).toBeInTheDocument();
    expect(screen.getByText(/PKR 3,000 · 3 people/)).toBeInTheDocument();

    http.get.mockResolvedValueOnce({ data: { bills: [] } });
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('heading', { name: 'No bills yet' })).toBeInTheDocument();
    await waitFor(() => expect(http.get).toHaveBeenLastCalledWith('/campus/bills', { params: { status: 'open' } }));
  });
});

describe('NewBill', () => {
  test('adds a person through the lookup contract and creates an equal split', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'u2', name: 'Ayesha Malik', verified: true }] });
    http.post.mockResolvedValue({ data: { bill: { id: 'new1' } } });
    wrap(
      <Routes>
        <Route path="/bills/new" element={<NewBill />} />
        <Route path="/bills/:id" element={<div>Bill page</div>} />
      </Routes>,
      { path: '/bills/new' },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create bill' }));
    expect(screen.getByText('Give the bill a title.')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Title'), 'Dinner');
    await userEvent.type(screen.getByLabelText('Total (PKR)'), '1000');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search students' }), 'Aye{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: 'Add Ayesha Malik' }));
    expect(http.get).toHaveBeenCalledWith('/auth/users/lookup', { params: { q: 'Aye' } });
    expect(within(screen.getByRole('list', { name: 'People on this bill' })).getByText('Ayesha Malik')).toBeInTheDocument();
    expect(screen.getByText(/Each person pays about PKR 500/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Create bill' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    const [url, payload] = http.post.mock.calls[0];
    expect(url).toBe('/campus/bills');
    expect(payload).toEqual(expect.objectContaining({ title: 'Dinner', total: 1000, splitMethod: 'equal' }));
    expect(payload.participants.map((p) => p.userId)).toEqual([DEMO_USER.id, 'u2']);
    expect(await screen.findByText('Bill page')).toBeInTheDocument();
  });

  test('a custom split that does not add up is blocked before sending', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'u2', name: 'Bilal Raza', verified: true }] });
    wrap(<NewBill />, { path: '/bills/new' });

    await userEvent.type(screen.getByLabelText('Title'), 'Trip');
    await userEvent.type(screen.getByLabelText('Total (PKR)'), '100');
    await userEvent.selectOptions(screen.getByLabelText('How to split'), 'custom');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search students' }), 'Bi{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: 'Add Bilal Raza' }));
    await userEvent.type(screen.getByLabelText(`Amount for ${DEMO_USER.name}`), '30');
    await userEvent.type(screen.getByLabelText('Amount for Bilal Raza'), '60');

    await userEvent.click(screen.getByRole('button', { name: 'Create bill' }));
    expect(await screen.findByText('Custom amounts must add up to the total.')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('BillDetail', () => {
  const participant = (userId, name, owed, paid) => ({
    userId,
    name,
    owedAmount: owed,
    paidAmount: paid,
    balanceCents: Math.round((owed - paid) * 100),
    balanceAmount: owed - paid,
  });
  const detail = (paid) => ({
    bill: {
      id: 'b1',
      title: 'Hostel pizza',
      description: '',
      totalAmount: 300,
      splitMethod: 'equal',
      creatorId: 'sample-user-1',
      creatorName: 'Ayesha Malik',
      status: paid >= 150 ? 'settled' : 'open',
      participants: [participant('sample-user-1', 'Ayesha Malik', 150, 150), participant(DEMO_USER.id, 'Ahmed Khan', 150, paid)],
      items: [],
      payments: paid ? [{ userId: DEMO_USER.id, userName: 'Ahmed Khan', amount: paid, note: '', recordedAt: '2026-11-20T10:00:00Z' }] : [],
    },
    settlement: paid >= 150 ? [] : [{ fromUserId: DEMO_USER.id, fromName: 'Ahmed Khan', toName: 'Ayesha Malik', amount: 150 - paid }],
    isCreator: false,
  });

  test('shows balances and the settle-up view, and records the participant\'s own payment', async () => {
    http.get.mockResolvedValue({ data: detail(0) });
    http.post.mockResolvedValue({ data: detail(150) });
    wrap(
      <Routes>
        <Route path="/bills/:id" element={<BillDetail />} />
      </Routes>,
      { path: '/bills/b1' },
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Hostel pizza' })).toBeInTheDocument();
    expect(screen.getByText(/Ahmed Khan pays Ayesha Malik/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete bill' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(screen.getByText('Enter an amount greater than zero.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Amount (PKR)'), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/campus/bills/b1/payments', { userId: DEMO_USER.id, amount: 150, note: '' }));
    expect(await screen.findByText('Everyone is settled. Nothing left to pay.')).toBeInTheDocument();
  });

  test('a 403 from the API shows an error instead of the bill', async () => {
    http.get.mockRejectedValue({ status: 403, message: 'Only people on this bill can view it' });
    wrap(
      <Routes>
        <Route path="/bills/:id" element={<BillDetail />} />
      </Routes>,
      { path: '/bills/b9' },
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Only people on this bill can view it');
  });
});
