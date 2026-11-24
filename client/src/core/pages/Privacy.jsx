import styles from './StaticPage.module.css';

export default function Privacy() {
  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>Legal</span>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.lead}>We collect the minimum data needed to run a trusted student community.</p>

        <div className={styles.section}>
          <h2>What we collect</h2>
          <ul>
            <li>NUST email, name, department and batch — to verify you are a NUST student.</li>
            <li>Optional profile details and contact preferences — to coordinate rides, sales and mentorship.</li>
            <li>Content you post: listings, photos, prices, locations, reviews and complaints.</li>
            <li>Aggregated usage analytics — never tied to individual people in reports.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Anonymous and sensitive features</h2>
          <ul>
            <li>Help Box questions store no account identity, ever.</li>
            <li>Complaints are visible only to you and authorised staff.</li>
            <li>Lost &amp; Found OCR masks ID and CNIC-like numbers and never shows raw extracted text.</li>
            <li>Reviews can be displayed without your name; other students never see reviewer identity.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Your choices</h2>
          <ul>
            <li>Control who can see your contact details in Settings.</li>
            <li>Delete your data at any time from your profile.</li>
          </ul>
        </div>

        <p className={styles.note}>
          Draft policy for a CS-313 student project. Not a legal document and not affiliated with NUST.
        </p>
      </div>
    </section>
  );
}
