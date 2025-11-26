import Link from 'next/link';

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p className="text-gray-700">
              We collect information you provide directly, including your JECRC email, profile information,
              photos, and messages. We also collect usage data to improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-2">Your information is used to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Provide and improve our dating services</li>
              <li>Match you with compatible users</li>
              <li>Ensure safety and prevent abuse</li>
              <li>Send notifications about matches and messages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Data Security</h2>
            <p className="text-gray-700">
              We implement industry-standard security measures to protect your data. All passwords are hashed,
              and sensitive data is encrypted. However, no system is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Sharing Your Information</h2>
            <p className="text-gray-700">
              We never sell your data. Your profile is only visible to other verified JECRC students.
              We may share data with law enforcement if legally required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
            <p className="text-gray-700 mb-2">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Access your personal data</li>
              <li>Request deletion of your account</li>
              <li>Export your data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
            <p className="text-gray-700">
              For privacy concerns, contact us at: <a href="mailto:privacy@jecrc.ac.in" className="text-purple-600 hover:underline">privacy@jecrc.ac.in</a>
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">Last updated: November 25, 2025</p>
        </div>
      </div>
    </div>
  );
}
