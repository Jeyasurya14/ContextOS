// frontend/src/app/privacy/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — ContextOS',
  description: 'Privacy Policy for ContextOS.',
};

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-dark-50 mb-2">Privacy Policy</h1>
        <p className="text-dark-400 text-sm mb-10">Last updated: March 12, 2026</p>

        <div className="space-y-8 text-dark-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">1. Introduction</h2>
            <p>
              ContextOS (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy and is committed
              to protecting your personal data. This Privacy Policy explains how we collect, use, store, and
              protect your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li>
                <strong className="text-dark-200">Account information:</strong> Email address, full name, and hashed password when you register.
              </li>
              <li>
                <strong className="text-dark-200">Integration data:</strong> Code commits, pull requests, and issues from GitHub; pages and databases from Notion;
                messages and threads from Slack; file contents and diagnostics from VS Code — only when you explicitly connect these services.
              </li>
              <li>
                <strong className="text-dark-200">Usage data:</strong> Query counts, feature usage, API call frequency, and error logs for service improvement.
              </li>
              <li>
                <strong className="text-dark-200">Billing data:</strong> Subscription plan, payment history, and Stripe customer ID. We do not store credit card
                numbers — all payment processing is handled by Stripe.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li>To provide and maintain the Service, including AI-powered answers</li>
              <li>To process your queries by retrieving relevant context from connected integrations</li>
              <li>To manage your account, subscriptions, and billing</li>
              <li>To send important service notifications (security alerts, billing updates)</li>
              <li>To improve the Service through aggregated, anonymized usage analytics</li>
              <li>To enforce our Terms and Conditions and prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">4. Data Security</h2>
            <p>We take data security seriously and implement industry-standard protections:</p>
            <ul className="list-disc list-inside space-y-1 text-dark-300 mt-3">
              <li>All OAuth tokens are encrypted at rest using AES-256-GCM</li>
              <li>API keys are stored as SHA-256 hashes — we never store them in plain text</li>
              <li>Passwords are hashed with bcrypt (cost factor 12)</li>
              <li>All data in transit is encrypted using TLS 1.2+</li>
              <li>Database access is restricted and logged</li>
              <li>Webhook signatures are verified before processing any external data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">5. Data Storage and Retention</h2>
            <p>
              Your data is stored on secure servers. Context chunks derived from your integrations are stored
              in our vector database for retrieval purposes. You may disconnect any integration at any time,
              which will stop future data syncing. You may request deletion of all your data by contacting us.
              Upon account deletion, we will remove your data within 30 days unless legally required to retain it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">6. Third-Party Services</h2>
            <p className="mb-3">We integrate with the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li><strong className="text-dark-200">GitHub, Notion, Slack:</strong> For fetching your project context via OAuth. Data access is limited to the scopes you authorize.</li>
              <li><strong className="text-dark-200">Stripe:</strong> For payment processing. Stripe handles all credit card data under their own PCI-DSS compliant infrastructure.</li>
              <li><strong className="text-dark-200">OpenAI:</strong> For generating AI responses. Query context is sent to OpenAI&apos;s API for processing. OpenAI&apos;s data usage policies apply.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">7. Data Sharing</h2>
            <p>
              We do not sell, rent, or trade your personal data to third parties. We only share data with
              third-party services as described above and as strictly necessary to provide the Service. We may
              disclose information if required by law or to protect our legal rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">8. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li>Access your personal data stored by us</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Disconnect any third-party integration at any time</li>
              <li>Export your data in a standard format</li>
              <li>Withdraw consent for data processing (which may limit Service functionality)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">9. Cookies</h2>
            <p>
              We use essential cookies and local storage for authentication (JWT tokens stored in memory).
              We do not use tracking cookies or third-party analytics cookies. No advertising cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for use by individuals under the age of 16. We do not knowingly
              collect data from children. If you believe we have collected data from a minor, please contact us
              immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users of material
              changes via email. The &quot;Last updated&quot; date at the top of this page indicates when the
              policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">12. Contact Us</h2>
            <p>
              For privacy-related inquiries or data requests, contact us at{' '}
              <a href="mailto:privacy@contextos.dev" className="text-brand-light hover:underline">privacy@contextos.dev</a>.
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
