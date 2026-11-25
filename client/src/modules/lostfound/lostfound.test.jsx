import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
import http from '@core/api/http.js';
import { AuthProvider, DEMO_USER } from '../auth/useAuth.js';
import LostFoundBoard from './pages/LostFoundBoard.jsx';
import PostLostFound from './pages/PostLostFound.jsx';
import LostFoundDetail from './pages/LostFoundDetail.jsx';

const wrap = (ui, initialEntry = '/lost-found') =>
  render(
    <AuthProvider initialUser={DEMO_USER}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </AuthProvider>,
  );

beforeEach(() => vi.clearAllMocks());

describe('LostFoundBoard', () => {
  test('renders items, sample banner, and filters by Lost / Found tabs', async () => {
    http.get.mockResolvedValue({
      data: {
        items: [
          {
            id: '1',
            type: 'found',
            title: 'Casio Calculator',
            description: 'Found in SEECS',
            category: 'electronics',
            location: 'SEECS',
            eventDate: '2026-11-20T00:00:00Z',
            status: 'open',
            ownerName: 'Ayesha Malik',
            photos: [],
            isSample: true,
          },
        ],
        total: 1,
      },
    });

    wrap(<LostFoundBoard />);
    expect(await screen.findByText('Casio Calculator')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/Sample data/i);

    await userEvent.click(screen.getByRole('tab', { name: 'Lost' }));
    await waitFor(() => expect(http.get).toHaveBeenLastCalledWith('/lostfound/items', { params: expect.objectContaining({ type: 'lost' }) }));
  });

  test('shows error state with retry and empty state when nothing matches', async () => {
    http.get.mockRejectedValueOnce({ message: 'Network failed' });
    wrap(<LostFoundBoard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network failed');

    http.get.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No matching items found' })).toBeInTheDocument();
  });
});

describe('PostLostFound', () => {
  test('validates fields and posts a new item', async () => {
    http.post.mockResolvedValue({ data: { item: { id: 'abc' } } });
    wrap(
      <Routes>
        <Route path="/lost-found/new" element={<PostLostFound />} />
        <Route path="/lost-found/:id" element={<div>Detail Page</div>} />
      </Routes>,
      '/lost-found/new',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Publish Post' }));
    expect(screen.getByText('Title must be at least 3 characters.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Item Title'), 'Blue Backpack');
    await userEvent.type(screen.getByLabelText('Campus Location'), 'Central Library');
    await userEvent.type(screen.getByLabelText('Description'), 'Navy blue laptop backpack left on 2nd floor.');
    await userEvent.click(screen.getByRole('button', { name: 'Publish Post' }));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/lostfound/items', expect.objectContaining({ title: 'Blue Backpack' })));
    expect(await screen.findByText('Detail Page')).toBeInTheDocument();
  });
});

describe('LostFoundDetail', () => {
  test('renders item details and submits claim for non-owner', async () => {
    http.get.mockResolvedValue({
      data: {
        item: {
          id: 'item1',
          type: 'found',
          title: 'Keychain',
          description: 'Silver keychain near C1.',
          category: 'keys',
          location: 'C1',
          eventDate: '2026-11-20T00:00:00Z',
          status: 'open',
          ownerId: 'other-user',
          ownerName: 'Ayesha Malik',
          ownerVerified: true,
          ocrStatus: 'manual',
          photos: [],
        },
        claims: [],
        isOwner: false,
      },
    });
    http.post.mockResolvedValue({ data: { claim: { id: 'c1', status: 'pending' } } });

    wrap(
      <Routes>
        <Route path="/lost-found/:id" element={<LostFoundDetail />} />
      </Routes>,
      '/lost-found/item1',
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Keychain' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Identifying proof'), 'It has a green SEECS tag');
    await userEvent.click(screen.getByRole('button', { name: 'Submit Claim Request' }));

    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith('/lostfound/items/item1/claims', { message: 'It has a green SEECS tag' }),
    );
  });
});
