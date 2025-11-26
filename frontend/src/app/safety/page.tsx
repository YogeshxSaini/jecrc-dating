import Link from 'next/link';

export default function SafetyPage() {
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
            <Link href="/settings" className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              ← Back
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Safety Center 🛡️</h1>
        
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-red-600">🚨 Stay Safe</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Never share personal information (phone, address, financial) early on</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Meet in public places for first dates</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Tell a friend where you're going and when you'll be back</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Trust your instincts - if something feels wrong, it probably is</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Report suspicious behavior immediately</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">⚠️ Red Flags</h2>
            <p className="text-gray-700 mb-4">Watch out for these warning signs:</p>
            <ul className="space-y-2 text-gray-700">
              <li>• Asks for money or financial help</li>
              <li>• Refuses to video chat or meet in person</li>
              <li>• Profile seems too good to be true</li>
              <li>• Pressures you to move off the platform quickly</li>
              <li>• Makes you uncomfortable with inappropriate messages</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-green-600">✅ Good Practices</h2>
            <ul className="space-y-3 text-gray-700">
              <li>• Video chat before meeting in person</li>
              <li>• Use your own transportation for dates</li>
              <li>• Keep conversations on the platform initially</li>
              <li>• Check their JECRC email is legitimate</li>
              <li>• Set boundaries and respect others' boundaries</li>
            </ul>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-red-700">🚫 Report Abuse</h2>
            <p className="text-gray-700 mb-4">
              If someone makes you feel unsafe or violates our terms, report them immediately.
              Our team reviews all reports and takes appropriate action.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Report an Issue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
