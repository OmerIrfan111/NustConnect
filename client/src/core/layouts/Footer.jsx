import { Link } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';
import styles from './Footer.module.css';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      ['RideShare', '/rides'],
      ['Marketplace', '/marketplace'],
      ['Review Hub', '/reviews'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['Help Box', '/help-box'],
      ['Complaints', '/complaints'],
      ['Lost & Found', '/lost-found'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Contact', '/contact'],
      ['Privacy Policy', '/privacy'],
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.brand}>
          <Logo onDark />
          <p className={styles.tagline}>One campus. One community. Everything connected.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className={styles.heading}>{col.title}</h2>
            <ul className={styles.list}>
              {col.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className={styles.link}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className={styles.legal}>
        © {new Date().getFullYear()} NUSTConnect — student project with sample data. Not officially affiliated with or
        endorsed by NUST.
      </p>
    </footer>
  );
}
