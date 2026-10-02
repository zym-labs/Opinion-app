export const metadata = { title: 'Support · Opinion' };

// Apple 1.2 requires published contact information.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@opinion.example';

export default function Support() {
  return (
    <>
      <h1>Support</h1>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We reply within 2 working days, and review reports
        of harmful content within 24 hours.
      </p>
      <h2>Report content</h2>
      <p>In the app, open the poll or quote and tap Report. Reports are anonymous.</p>
      <h2>Appeal a moderation decision</h2>
      <p>Email us with the date and the poll question. A different moderator reviews appeals.</p>
      <h2>Delete your account</h2>
      <p>In the app: Profile → Settings → Delete account. Or email us from the address you signed in with.</p>
      <h2>Need help now?</h2>
      <p>
        If you or someone else is in danger, contact local emergency services. Find a free, confidential helpline at{' '}
        <a href="https://findahelpline.com">findahelpline.com</a>.
      </p>
    </>
  );
}
