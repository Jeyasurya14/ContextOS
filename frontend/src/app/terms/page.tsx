// frontend/src/app/terms/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Terms and Conditions — ContextOS',
  description: 'Terms and Conditions for using ContextOS.',
};

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-dark-50 mb-2">Terms and Conditions</h1>
        <p className="text-dark-400 text-sm mb-10">Last updated: March 12, 2026</p>

        <div className="space-y-8 text-dark-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ContextOS (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions.
              If you do not agree to these terms, you may not use the Service. These terms apply to all users,
              including visitors, registered users, and paid subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">2. Description of Service</h2>
            <p>
              ContextOS is an AI-powered developer assistant that connects to third-party services including
              GitHub, Notion, Slack, and VS Code to provide intelligent, context-aware answers about your projects.
              The Service includes a web dashboard, API access, and a VS Code extension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">3. Account Registration</h2>
            <p>
              You must provide accurate and complete information when creating an account. You are responsible
              for maintaining the confidentiality of your account credentials, including API keys. You must
              notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">4. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-dark-300">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service to store or transmit malicious code</li>
              <li>Exceed the rate limits or usage quotas associated with your plan</li>
              <li>Share your account credentials or API keys with unauthorized parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">5. Subscriptions and Billing</h2>
            <p>
              ContextOS offers both free and paid subscription plans. Paid plans are billed on a monthly or
              annual basis. By subscribing to a paid plan, you authorize us to charge your payment method on a
              recurring basis. You may cancel your subscription at any time through the billing portal. Upon
              cancellation, you will retain access to paid features until the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">6. Third-Party Integrations</h2>
            <p>
              The Service connects to third-party platforms (GitHub, Notion, Slack) via OAuth. By connecting
              these services, you grant ContextOS permission to access your data on those platforms as described
              during the OAuth authorization flow. We only access data necessary to provide the Service. You may
              disconnect any integration at any time through the dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">7. Intellectual Property</h2>
            <p>
              You retain full ownership of your data and content. ContextOS does not claim any intellectual
              property rights over your code, documents, or messages processed through the Service. The Service
              itself, including its design, code, and branding, is the intellectual property of ContextOS and
              is protected by applicable copyright and trademark laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">8. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-brand-light hover:underline">Privacy Policy</Link>.
              We encrypt all OAuth tokens using AES-256-GCM and hash all API keys using SHA-256. We do not
              sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">9. Limitation of Liability</h2>
            <p>
              ContextOS is provided &quot;as is&quot; without warranties of any kind, either express or implied.
              We do not guarantee that AI-generated answers are accurate, complete, or error-free. You use the
              Service at your own risk. In no event shall ContextOS be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time if you violate these terms.
              Upon termination, your right to use the Service ceases immediately. We may delete your data
              within 30 days of account termination unless required by law to retain it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify registered users of material changes
              via email. Continued use of the Service after changes take effect constitutes acceptance of the
              revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-50 mb-3">12. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at{' '}
              <a href="mailto:support@contextos.dev" className="text-brand-light hover:underline">support@contextos.dev</a>.
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
