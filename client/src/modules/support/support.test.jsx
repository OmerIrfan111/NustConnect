import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
import http from '@core/api/http.js';
import { AuthProvider, DEMO_USER } from '../auth/useAuth.js';
import ComplaintsList from './pages/ComplaintsList.jsx';
import HelpBox from './pages/HelpBox.jsx';
import FaqList from './pages/FaqList.jsx';

const wrap = (ui, path = '/complaints', user = DEMO_USER) =>
  render(
    <AuthProvider initialUser={user}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </AuthProvider>,
  );

beforeEach(() => vi.clearAllMocks());

describe('ComplaintsList', () => {
  test('renders user complaints and handles empty state', async () => {
    http.get.mockResolvedValueOnce({
      data: {
        complaints: [
          {
            id: 'c1',
            title: 'Broken AC in Lab 2',
            description: 'Needs servicing',
            location: 'SEECS',
            category: 'electrical',
            status: 'submitted',
            createdAt: '2026-11-20T10:00:00Z',
          },
        ],
      },
    });
    wrap(<ComplaintsList />);
    expect(await screen.findByText('Broken AC in Lab 2')).toBeInTheDocument();
  });
});

describe('HelpBox', () => {
  test('submits anonymous question and displays privacy banner', async () => {
    http.get.mockResolvedValue({ data: { entries: [] } });
    http.post.mockResolvedValue({ data: { entry: { id: 'hb1', status: 'open' } } });

    wrap(<HelpBox />, '/help-box');
    expect(await screen.findByText(/no user ID, email, or IP address/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Your Question (Anonymous)'), 'Where is the counseling office located?');
    await userEvent.click(screen.getByRole('button', { name: 'Send Anonymously' }));

    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith('/support/helpbox', {
        category: 'academics',
        question: 'Where is the counseling office located?',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted anonymously/i);
  });
});

describe('FaqList', () => {
  test('renders public FAQ articles for guests and filters by search', async () => {
    http.get.mockResolvedValue({
      data: {
        articles: [
          { id: 'f1', title: 'How to reset LMS password', category: 'it_lms', body: 'Use the NUST portal.', isSample: true },
        ],
      },
    });

    wrap(
      <Routes>
        <Route path="/faq" element={<FaqList />} />
      </Routes>,
      '/faq',
      null,
    );

    expect(await screen.findByText('How to reset LMS password')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search FAQ' }), 'LMS{Enter}');
    await waitFor(() => expect(http.get).toHaveBeenLastCalledWith('/support/faq', { params: { q: 'LMS' } }));
  });
});
