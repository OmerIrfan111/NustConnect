import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { HERO_SAMPLES, POPULAR, SERVICES, STEPS } from './content.js';
import styles from './Landing.module.css';

function IconTile({ icon: Icon, tone, size = 'md' }) {
  return (
    <span className={`${styles.tile} ${styles[tone]} ${size === 'sm' ? styles.tileSm : ''}`} aria-hidden="true">
      <Icon size={size === 'sm' ? 18 : 20} strokeWidth={2.2} />
    </span>
  );
}

function Hero() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
    else document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <span className={styles.pill}>For NUST students · Sample data</span>
        <h1 id="hero-title" className={styles.heroTitle}>
          One campus. One community. <br className={styles.br} />
          Everything connected.
        </h1>
        <p className={styles.heroLead}>
          Your university life, simplified. Find rides, explore campus services, discover opportunities and connect with
          fellow students all in one place.
        </p>
        <form className={styles.heroSearch} role="search" onSubmit={onSubmit}>
          <label htmlFor="landing-search" className="nc-sr-only">
            Search rides, items, reviews and services
          </label>
          <Search size={18} className={styles.heroSearchIcon} aria-hidden="true" />
          <input
            id="landing-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search rides, items, reviews, services…"
            className={styles.heroSearchInput}
          />
        </form>
        <div className={styles.heroActions}>
          <a href="#services" className={`${styles.btn} ${styles.btnTeal}`}>
            Explore Services
          </a>
          <Link to="/register" className={`${styles.btn} ${styles.btnWhite}`}>
            Get Started
          </Link>
        </div>
      </div>

      <div className={styles.heroPanel} aria-label="Sample activity">
        {HERO_SAMPLES.map((s) => (
          <div key={s.title} className={styles.mini}>
            <IconTile icon={s.icon} tone={s.tone} />
            <div>
              <p className={styles.miniTitle}>{s.title}</p>
              <p className={styles.miniMeta}>{s.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ id, title, sub }) {
  return (
    <header className={styles.sectionHead}>
      <h2 id={id}>{title}</h2>
      {sub && <p className={styles.sectionSub}>{sub}</p>}
    </header>
  );
}

export default function Landing() {
  return (
    <>
      <Hero />

      <section id="services" className={styles.band} aria-labelledby="services-title">
        <SectionHead
          id="services-title"
          title="Everything you need on campus"
          sub="One verified student community for the services you use every day."
        />
        <div className={styles.grid3}>
          {SERVICES.map((s) => (
            <Link key={s.title} to={s.to} className={`${styles.card} ${styles.cardLink}`}>
              <IconTile icon={s.icon} tone={s.tone} />
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardBody}>{s.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.band} ${styles.bandWhite}`} aria-labelledby="popular-title">
        <SectionHead id="popular-title" title="Popular campus services" />
        <div className={styles.grid4}>
          {POPULAR.map((p) => (
            <Link key={p.title} to={p.to} className={`${styles.card} ${styles.popular} ${styles.cardLink}`}>
              <div className={`${styles.thumb} ${styles[p.tone]}`} aria-hidden="true">
                <p.icon size={36} strokeWidth={1.6} />
              </div>
              <h3 className={styles.popularTitle}>{p.title}</h3>
              <p className={styles.cardBody}>Sample campus service</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.band} aria-labelledby="how-title">
        <SectionHead id="how-title" title="How it works" sub="Three steps to get started." />
        <ol className={`${styles.grid3} ${styles.steps}`}>
          {STEPS.map((s, i) => (
            <li key={s.title} className={styles.card}>
              <span className={styles.stepNum} aria-hidden="true">
                {i + 1}
              </span>
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardBody}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.cta} aria-labelledby="cta-title">
        <h2 id="cta-title" className={styles.ctaTitle}>
          Join the student community
        </h2>
        <p className={styles.ctaSub}>Create your account with a NUST email address.</p>
        <Link to="/register" className={`${styles.btn} ${styles.btnNavy}`}>
          Create Account
        </Link>
      </section>
    </>
  );
}
