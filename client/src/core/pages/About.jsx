import { ShieldCheck, Layers, Lock } from 'lucide-react';
import styles from './StaticPage.module.css';

const PILLARS = [
  { icon: Layers, title: 'One place', body: 'Rides, marketplace, reviews, lost & found, complaints, maps and more under one login.' },
  { icon: ShieldCheck, title: 'Verified students', body: 'NUST email verification means you are dealing with real students, not strangers.' },
  { icon: Lock, title: 'Privacy by design', body: 'Anonymous help stays anonymous. Complaints and sensitive data have strict access control.' },
];

export default function About() {
  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>About</span>
        <h1 className={styles.title}>About NUSTConnect</h1>
        <p className={styles.lead}>
          NUSTConnect is a NUST-only student community platform that brings everyday campus services into one verified
          ecosystem: RideShare, Review Hub, Marketplace, Lost &amp; Found, Complaint Tracker, Bill Splitting, Campus Map,
          an Anonymous Help Box, Opportunities, Trips &amp; Meetups and Donations.
        </p>
        <div className={styles.grid}>
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className={styles.card}>
              <div className={styles.tile} aria-hidden="true">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
        <div className={styles.section} style={{ marginTop: 'var(--nc-space-10)' }}>
          <h2>Why we built it</h2>
          <p>
            Students rely on scattered WhatsApp groups, Facebook posts and single-purpose sites for rides, second-hand
            items, reviews and lost belongings. Information gets buried, repeated and lost. NUSTConnect replaces ten group
            chats with one search, and each module makes the others more useful — a Murree trip uses the organizer,
            RideShare and bill splitting together.
          </p>
        </div>
        <p className={styles.note}>
          CS-313 Web Engineering student project. All data shown is sample data. Not officially affiliated with or
          endorsed by NUST.
        </p>
      </div>
    </section>
  );
}
