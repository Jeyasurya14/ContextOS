// frontend/src/app/refund/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Refund Policy — ContextOS',
  description: 'Refund Policy for ContextOS subscriptions.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="border-b border-dark-700 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-dark-50">ContextOS</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-dark-300 hover:text-dark-100 transition text-sm">Log in</Link>
            <Link href="/register" className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-dark-50 mb-2">Refund Policy</h1>
        <p className="text-dark-400 text-sm mb-10">Last updated: March 12, 2026</p>

        <div className="space-y-8 text-dark-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">1. Overview</h2>
            <p>
              We want you to be satisfied with ContextOS. This Refund Policy outlines the circumstances under
              which we offer refunds for paid subscriptions. Please read this policy carefully before purchasing
              a subscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">2. Free Plan</h2>
            <p>
              The Free plan is provided at no cost and does not involve any charges. No refund applies to the
              Free plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">3. Pro Plan — Monthly Subscriptions</h2>
            <p>
              If you are unsatisfied with the Pro plan, you may request a full refund within <strong className="text-dark-50">7 days</strong> of
              your initial purchase or renewal. After the 7-day window, no refunds will be issued for the
              current billing period. You may cancel your subscription at any time, and you will retain access
              to Pro features until the end of your current billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">4. Pro Plan — Annual Subscriptions</h2>
            <p>
              Annual subscriptions are eligible for a full refund within <strong className="text-dark-50">14 days</strong> of
              the initial purchase. After the 14-day window, we offer a prorated refund for the remaining
              unused months if you cancel within the first 3 months. No refunds will be issued after the first
              3 months of an annual subscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">5. How to Request a Refund</h2>
            <p className="mb-3">To request a refund:</p>
            <ol className="list-decimal list-inside space-y-2 text-dark-300">
              <li>
                Email us at{' '}
                <a href="mailto:billing@contextos.dev" className="text-brand-light hover:underline">billing@contextos.dev</a>{' '}
                with the subject line &quot;Refund Request&quot;.
              </li>
              <li>Include your registered email address and the reason for the refund.</li>
              <li>We will review your request and respond within 3 business days.</li>
              <li>Approved refunds will be processed to your original payment method within 5-10 business days.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">6. Non-Refundable Situations</h2>
            <p className="mb-3">Refunds will not be issued in the following cases:</p>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li>Requests made after the applicable refund window has expired</li>
              <li>Account termination due to violation of our Terms and Conditions</li>
              <li>Failure to cancel auto-renewal before the next billing cycle</li>
              <li>Dissatisfaction with AI-generated answer quality (AI responses vary and are not guaranteed to be perfect)</li>
              <li>Third-party service outages (GitHub, Notion, Slack) that temporarily affect integrations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">7. Cancellation</h2>
            <p>
              You can cancel your subscription at any time through the{' '}
              <Link href="/dashboard/billing" className="text-brand-light hover:underline">Billing dashboard</Link>{' '}
              or via the Stripe customer portal. Cancellation stops future charges but does not trigger an
              automatic refund. If you wish to receive a refund, please follow the process described in
              Section 5.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">8. Service Downtime</h2>
            <p>
              If the Service experiences significant downtime (more than 24 consecutive hours) due to issues on
              our end, we will offer affected Pro subscribers a proportional credit or extension to their
              subscription. This does not apply to scheduled maintenance windows, which we announce in advance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Refund Policy from time to time. Changes will be posted on this page with an
              updated revision date. Material changes will be communicated to subscribers via email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">10. Contact</h2>
            <p>
              For billing or refund questions, contact us at{' '}
              <a href="mailto:billing@contextos.dev" className="text-brand-light hover:underline">billing@contextos.dev</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-dark-700 py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-dark-400 text-sm">&copy; 2026 ContextOS. All rights reserved.</span>
          <div className="flex gap-6 text-sm text-dark-400">
            <Link href="/privacy" className="hover:text-dark-200 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-dark-200 transition">Terms</Link>
            <Link href="/refund" className="hover:text-dark-200 transition">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
