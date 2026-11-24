import { Link } from 'react-router-dom';
import { MessageCircleQuestion, ClipboardList, Mail } from 'lucide-react';
import styles from './StaticPage.module.css';

const CHANNELS = [
  {
    icon: MessageCircleQuestion,
    title: 'Ask anonymously',
    body: 'Have a question you would rather not attach your name to? Use the Help Box.',
    to: '/help-box',
    cta: 'Open Help Box',
  },
  {
    icon: ClipboardList,
    title: 'Report a facility issue',
    body: 'Broken fan, water problem or Wi-Fi outage? File a trackable complaint.',
    to: '/complaints',
    cta: 'File a complaint',
  },
  {
    icon: Mail,
    title: 'Talk to the team',
    body: 'Feedback, partnership or a bug in the platform — reach the project team.',
    href: 'mailto:team@nustconnect.example',
    cta: 'team@nustconnect.example',
  },
];

export default function Contact() {
  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>Contact</span>
        <h1 className={styles.title}>Get in touch</h1>
        <p className={styles.lead}>Pick the channel that fits what you need.</p>
        <div className={styles.grid}>
          {CHANNELS.map(({ icon: Icon, title, body, to, href, cta }) => (
            <div key={title} className={styles.card}>
              <div className={styles.tile} aria-hidden="true">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <p style={{ marginTop: 'var(--nc-space-3)' }}>
                {to ? (
                  <Link to={to} style={{ color: 'var(--nc-teal-700)', fontWeight: 'var(--nc-fw-semibold)' }}>
                    {cta} →
                  </Link>
                ) : (
                  <a href={href} style={{ color: 'var(--nc-teal-700)', fontWeight: 'var(--nc-fw-semibold)' }}>
                    {cta}
                  </a>
                )}
              </p>
            </div>
          ))}
        </div>
        <p className={styles.note}>The email address above is a placeholder for this student project.</p>
      </div>
    </section>
  );
}
