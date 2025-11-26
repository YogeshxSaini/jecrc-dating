import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">💖</span>
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                JECRC Dating
              </span>
            </Link>
            <Link href="/" className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              ← Back
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing JECRC Dating, you agree to these Terms of Service. If you disagree with any part,
              please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <p className="text-gray-700">
              You must be a current JECRC student with a valid @jecrc.ac.in email address.
              You must be at least 18 years old to use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Conduct</h2>
            <p className="text-gray-700 mb-2">You agree NOT to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Harass, bully, or threaten other users</li>
              <li>Share explicit or inappropriate content</li>
              <li>Impersonate others or create fake profiles</li>
              <li>Spam or solicit other users</li>
              <li>Use the platform for commercial purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Content Moderation</h2>
            <p className="text-gray-700">
              We reserve the right to review, moderate, or remove any content that violates these terms.
              All photos must be approved by moderators before appearing on your profile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Account Termination</h2>
            <p className="text-gray-700">
              We may suspend or terminate accounts that violate these terms without notice.
              You can delete your account at any time from Settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Disclaimer</h2>
            <p className="text-gray-700">
              JECRC Dating is provided "as is" without warranties. We are not responsible for user interactions,
              dates, or relationships formed through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these terms at any time. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">Last updated: November 25, 2025</p>
        </div>
      </div>
    </div>
  );
}
