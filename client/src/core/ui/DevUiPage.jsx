import { useState } from 'react';
import { Car, Inbox, ShoppingBag } from 'lucide-react';
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
  Skeleton,
  StarRating,
  Tabs,
} from './index.js';
import styles from './DevUiPage.module.css';

const Section = ({ title, children }) => (
  <section className={styles.section} aria-labelledby={`dev-${title}`}>
    <h2 id={`dev-${title}`} className={styles.h2}>
      {title}
    </h2>
    <div className={styles.row}>{children}</div>
  </section>
);

/** /dev/ui (development only): every UI kit component in every state, for visual checks and for module owners to copy from. */
export default function DevUiPage() {
  const [tab, setTab] = useState('teachers');
  const [chip, setChip] = useState('all');
  const [stars, setStars] = useState(3);
  const [query, setQuery] = useState('');

  return (
    <div className={styles.page}>
      <PageHeader title="UI kit" subtitle="Every component from the design board, in every state. Development only." />

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Saving</Button>
        <Button size="sm">Small</Button>
      </Section>

      <Section title="Inputs">
        <div className={styles.col}>
          <Input label="NUST Email" placeholder="name@students.nust.edu.pk" />
          <Input label="Email" defaultValue="not-an-email" error="Invalid email" />
          <Input label="Batch" hint="For example 2023" />
          <Input label="Message" as="textarea" rows={3} />
          <Input label="Department" as="select" defaultValue="SEECS">
            <option>SEECS</option>
            <option>SMME</option>
          </Input>
        </div>
        <div className={styles.col}>
          <SearchBar value={query} onChange={setQuery} onSearch={(q) => setQuery(`searched: ${q}`)} />
        </div>
      </Section>

      <Section title="Badges">
        <Badge variant="verified" />
        <Badge variant="new" />
        <Badge variant="available">2 seats available</Badge>
        <Badge variant="full" />
        <Badge>Neutral</Badge>
        <NotificationDot count={3} />
        <NotificationDot count={42} />
      </Section>

      <Section title="Star rating">
        <StarRating value={0} showValue />
        <StarRating value={3.5} showValue />
        <StarRating value={4.5} showValue />
        <StarRating value={5} showValue />
        <StarRating value={stars} onChange={setStars} label="Your rating" showValue />
      </Section>

      <Section title="Cards">
        <ServiceCard icon={Car} title="RideShare" description="Share rides to and from campus." to="/dev/ui" />
        <ServiceCard icon={ShoppingBag} title="Marketplace" description="Buy and sell second-hand items." to="/dev/ui" />
        <Card selected>
          <strong>Selected card</strong>
          <p>Amber border for the selected product card.</p>
        </Card>
      </Section>

      <Section title="Tabs and chips">
        <div className={styles.col}>
          <Tabs
            label="Review categories"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'teachers', label: 'Teachers', count: 12 },
              { value: 'cafes', label: 'Cafes' },
              { value: 'hostels', label: 'Hostels' },
            ]}
          />
          <Chips
            label="Marketplace categories"
            value={chip}
            onChange={setChip}
            items={[
              { value: 'all', label: 'All' },
              { value: 'electronics', label: 'Electronics' },
              { value: 'books', label: 'Books' },
            ]}
          />
        </div>
      </Section>

      <Section title="People">
        <Avatar name="Ahmed Khan" />
        <Avatar name="Ayesha" size="lg" />
        <ProfileChip name="Ahmed Khan" department="BSCS" batch="2023" verified />
      </Section>

      <Section title="States">
        <div className={styles.col}>
          <EmptyState icon={Inbox} title="Nothing here yet" description="When someone posts a ride it will show up here." action={<Button size="sm">Post a ride</Button>} />
          <ErrorState message="Could not load rides." onRetry={() => {}} />
          <Loading />
          <Skeleton rows={3} />
          <SampleDataBanner />
        </div>
      </Section>

      <Section title="Report button">
        <ReportButton targetType="ride" targetId="demo-1" />
      </Section>
    </div>
  );
}
