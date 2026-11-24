import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../api/http.js', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
import http from '../api/http.js';
import { AuthProvider } from '../../modules/auth/useAuth.js';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chips,
  EmptyState,
  ErrorState,
  Input,
  Loading,
  NotificationDot,
  PageHeader,
  ProfileChip,
  ReportButton,
  SampleDataBanner,
  SearchBar,
  ServiceCard,
  StarRating,
  Tabs,
  fillOf,
  initialsOf,
  snapToHalf,
} from './index.js';
import DevUiPage from './DevUiPage.jsx';

const wrap = (ui, { user = { id: '1', name: 'Ahmed Khan', role: 'student', verified: true } } = {}) =>
  render(
    <AuthProvider initialUser={user}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>,
  );

beforeEach(() => vi.clearAllMocks());

describe('Button', () => {
  test('renders variants and fires onClick', async () => {
    const onClick = vi.fn();
    wrap(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('disabled and loading buttons cannot be clicked, and loading is announced as busy', async () => {
    const onClick = vi.fn();
    wrap(
      <>
        <Button disabled onClick={onClick}>
          Off
        </Button>
        <Button loading onClick={onClick}>
          Busy
        </Button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Off' }));
    await userEvent.click(screen.getByRole('button', { name: 'Busy' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Busy' })).toHaveAttribute('aria-busy', 'true');
  });

  test('`to` renders a link, but a disabled one falls back to an inert button', () => {
    const { unmount } = wrap(<Button to="/rides">Rides</Button>);
    expect(screen.getByRole('link', { name: 'Rides' })).toHaveAttribute('href', '/rides');
    unmount();
    wrap(
      <Button to="/rides" disabled>
        Rides
      </Button>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rides' })).toBeDisabled();
  });

  test('defaults to type=button so it never submits a form by accident', () => {
    wrap(<Button>Go</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('Input', () => {
  test('label is connected to the field', () => {
    wrap(<Input label="NUST Email" />);
    expect(screen.getByLabelText('NUST Email')).toBeInTheDocument();
  });

  test('error state: red message, aria-invalid and described-by', () => {
    wrap(<Input label="Email" error="Invalid email" />);
    const field = screen.getByLabelText('Email');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Invalid email');
  });

  test('hint is read as a description, and textarea / select variants work', () => {
    wrap(
      <>
        <Input label="Batch" hint="For example 2023" />
        <Input label="Notes" as="textarea" />
        <Input label="School" as="select">
          <option>SEECS</option>
        </Input>
      </>,
    );
    expect(screen.getByLabelText('Batch')).toHaveAccessibleDescription('For example 2023');
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA');
    expect(screen.getByLabelText('School').tagName).toBe('SELECT');
  });

  test('two inputs never share an id', () => {
    wrap(
      <>
        <Input label="A" />
        <Input label="B" />
      </>,
    );
    expect(screen.getByLabelText('A').id).not.toBe(screen.getByLabelText('B').id);
  });
});

describe('SearchBar', () => {
  test('submits the trimmed text on Enter and ignores empty submits', async () => {
    const onSearch = vi.fn();
    wrap(<SearchBar onSearch={onSearch} />);
    const box = screen.getByRole('searchbox', { name: 'Search' });
    await userEvent.type(box, '  arduino  {Enter}');
    expect(onSearch).toHaveBeenCalledWith('arduino');
    await userEvent.clear(box);
    await userEvent.type(box, '   {Enter}');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  test('can be controlled', async () => {
    const onChange = vi.fn();
    wrap(<SearchBar value="abc" onChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox'), 'd');
    expect(onChange).toHaveBeenCalledWith('abcd');
  });

  test('two search bars get different ids', () => {
    wrap(
      <>
        <SearchBar label="One" />
        <SearchBar label="Two" />
      </>,
    );
    expect(screen.getByLabelText('One').id).not.toBe(screen.getByLabelText('Two').id);
  });
});

describe('Card and ServiceCard', () => {
  test('a card with `to` is a link; with onClick it is a button; otherwise plain', async () => {
    const onClick = vi.fn();
    wrap(
      <>
        <Card to="/a">Link card</Card>
        <Card onClick={onClick}>Button card</Card>
        <Card>Plain card</Card>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Link card' })).toHaveAttribute('href', '/a');
    await userEvent.click(screen.getByRole('button', { name: 'Button card' }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText('Plain card')).toBeInTheDocument();
  });

  test('ServiceCard shows icon, title and description inside one link', () => {
    wrap(<ServiceCard icon={() => <svg data-testid="icon" />} title="RideShare" description="Share rides." to="/rides" />);
    const link = screen.getByRole('link', { name: /RideShare/ });
    expect(within(link).getByTestId('icon')).toBeInTheDocument();
    expect(link).toHaveTextContent('Share rides.');
  });
});

describe('Badge', () => {
  test('variants have the default texts from the design board', () => {
    wrap(
      <>
        <Badge variant="verified" />
        <Badge variant="new" />
        <Badge variant="available" />
        <Badge variant="full" />
      </>,
    );
    for (const t of ['Verified Student', 'New', 'Available', 'Full']) expect(screen.getByText(t)).toBeInTheDocument();
  });

  test('children override the text', () => {
    wrap(<Badge variant="available">2 seats available</Badge>);
    expect(screen.getByText('2 seats available')).toBeInTheDocument();
  });
});

describe('StarRating', () => {
  test('fill maths handles 0 to 5 and half values', () => {
    expect([1, 2, 3, 4, 5].map((i) => fillOf(0, i))).toEqual([0, 0, 0, 0, 0]);
    expect([1, 2, 3, 4, 5].map((i) => fillOf(3.5, i))).toEqual([1, 1, 1, 0.5, 0]);
    expect([1, 2, 3, 4, 5].map((i) => fillOf(5, i))).toEqual([1, 1, 1, 1, 1]);
  });

  test('values are clamped and snapped to the nearest half', () => {
    expect(snapToHalf(4.3)).toBe(4.5);
    expect(snapToHalf(4.2)).toBe(4);
    expect(snapToHalf(7)).toBe(5);
    expect(snapToHalf(-2)).toBe(0);
    expect(snapToHalf('abc')).toBe(0);
  });

  test('read-only rating exposes a text alternative and half stars', () => {
    const { container } = wrap(<StarRating value={3.5} />);
    expect(screen.getByRole('img', { name: 'Rated 3.5 out of 5' })).toBeInTheDocument();
    expect([...container.querySelectorAll('[data-fill]')].map((n) => n.dataset.fill)).toEqual(['1', '1', '1', '0.5', '0']);
  });

  test('0 and 5 render correctly', () => {
    wrap(
      <>
        <StarRating value={0} label="zero" />
        <StarRating value={5} label="five" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'zero' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'five' })).toBeInTheDocument();
  });

  test('interactive mode is a radio group of whole stars', async () => {
    const onChange = vi.fn();
    wrap(<StarRating value={2} onChange={onChange} label="Your rating" />);
    expect(screen.getByRole('radiogroup', { name: 'Your rating' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.getByRole('radio', { name: '2 stars' })).toHaveAttribute('aria-checked', 'true');
  });

  test('arrow keys change the rating', async () => {
    const onChange = vi.fn();
    wrap(<StarRating value={2} onChange={onChange} />);
    screen.getByRole('radio', { name: '2 stars' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});

describe('Tabs and Chips', () => {
  const items = [
    { value: 'a', label: 'Teachers', count: 3 },
    { value: 'b', label: 'Cafes' },
    { value: 'c', label: 'Hostels' },
  ];

  test('Tabs mark the selected tab, only it is tabbable, and clicking selects', async () => {
    const onChange = vi.fn();
    wrap(<Tabs items={items} value="b" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'Cafes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Cafes' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Teachers/ })).toHaveAttribute('tabindex', '-1');
    await userEvent.click(screen.getByRole('tab', { name: /Hostels/ }));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  test('Tabs: arrow keys wrap around, Home and End jump', async () => {
    const onChange = vi.fn();
    wrap(<Tabs items={items} value="c" onChange={onChange} />);
    screen.getByRole('tab', { name: /Hostels/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('c');
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  test('Chips: single choice and multiple choice', async () => {
    const onChange = vi.fn();
    const { unmount } = wrap(<Chips items={[{ value: 'all', label: 'All' }, { value: 'books', label: 'Books' }]} value="all" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Books' }));
    expect(onChange).toHaveBeenCalledWith('books');
    unmount();

    const onMulti = vi.fn();
    wrap(<Chips multiple items={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} value={['x']} onChange={onMulti} />);
    await userEvent.click(screen.getByRole('button', { name: 'Y' }));
    expect(onMulti).toHaveBeenLastCalledWith(['x', 'y']);
    await userEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(onMulti).toHaveBeenLastCalledWith([]);
  });
});

describe('Avatar, ProfileChip, NotificationDot', () => {
  test('initials', () => {
    expect(initialsOf('Ahmed Khan')).toBe('AK');
    expect(initialsOf('Ahmed Raza Khan')).toBe('AK');
    expect(initialsOf('ayesha')).toBe('A');
    expect(initialsOf('')).toBe('?');
  });

  test('photo when given, initials otherwise', () => {
    const { unmount } = wrap(<Avatar name="Ahmed Khan" src="/uploads/a.png" />);
    expect(screen.getByRole('img', { name: "Ahmed Khan's photo" })).toHaveAttribute('src', '/uploads/a.png');
    unmount();
    wrap(<Avatar name="Ahmed Khan" />);
    expect(screen.getByRole('img', { name: 'Ahmed Khan' })).toHaveTextContent('AK');
  });

  test('ProfileChip shows name and "BSCS · Batch 2023"', () => {
    wrap(<ProfileChip name="Ahmed Khan" department="BSCS" batch="2023" />);
    expect(screen.getByText('BSCS · Batch 2023')).toBeInTheDocument();
  });

  test('NotificationDot hides at 0 and caps large numbers', () => {
    const { container, rerender } = wrap(<NotificationDot count={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(
      <AuthProvider initialUser={null}>
        <NotificationDot count={42} />
      </AuthProvider>,
    );
    expect(screen.getByText('9+')).toBeInTheDocument();
  });
});

describe('page-level components', () => {
  test('PageHeader renders the h1, subtitle and actions', () => {
    wrap(<PageHeader title="Find a Ride" subtitle="Browse rides" actions={<Button>Post</Button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Find a Ride' })).toBeInTheDocument();
    expect(screen.getByText('Browse rides')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post' })).toBeInTheDocument();
  });

  test('EmptyState, ErrorState (with retry), Loading and SampleDataBanner', async () => {
    const retry = vi.fn();
    wrap(
      <>
        <EmptyState title="Nothing here" description="Try later" action={<Button>Add</Button>} />
        <ErrorState message="Could not load." onRetry={retry} />
        <Loading label="Loading rides" />
        <SampleDataBanner />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading rides');
    expect(screen.getByRole('note')).toHaveTextContent(/Sample data/);
  });
});

describe('ReportButton (contract: POST /api/admin/reports)', () => {
  test('opens a form and posts the target, reason and details', async () => {
    http.post.mockResolvedValue({ data: { accepted: true } });
    wrap(<ReportButton targetType="ride" targetId={123} />);
    await userEvent.click(screen.getByRole('button', { name: 'Report this ride' }));
    await userEvent.selectOptions(screen.getByLabelText('Why are you reporting this?'), 'abuse');
    await userEvent.type(screen.getByLabelText('Details (optional)'), '  rude driver ');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/reports', { targetType: 'ride', targetId: '123', reason: 'abuse', details: 'rude driver' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Thanks');
  });

  test('a failure shows the server message and keeps the form so the user can retry', async () => {
    http.post.mockRejectedValue({ status: 500, message: 'Server down' });
    wrap(<ReportButton targetType="item" targetId="9" />);
    await userEvent.click(screen.getByRole('button', { name: 'Report this item' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
    expect(screen.getByRole('button', { name: 'Send report' })).toBeInTheDocument();
  });

  test('Cancel closes the panel; the trigger exposes aria-expanded', async () => {
    wrap(<ReportButton targetType="ride" targetId="1" />);
    const trigger = screen.getByRole('button', { name: 'Report this ride' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: 'Report this ride' })).not.toBeInTheDocument();
  });

  test('signed-out visitors get a sign-in link instead of the form', () => {
    wrap(<ReportButton targetType="ride" targetId="1" />, { user: null });
    expect(screen.getByRole('link', { name: /Sign in to report/ })).toHaveAttribute('href', expect.stringContaining('/login'));
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('DevUiPage', () => {
  test('renders every section without errors', () => {
    wrap(<DevUiPage />);
    for (const t of ['Buttons', 'Inputs', 'Badges', 'Star rating', 'Cards', 'Tabs and chips', 'People', 'States', 'Report button']) {
      expect(screen.getByRole('heading', { name: t })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 1, name: 'UI kit' })).toBeInTheDocument();
  });
});
