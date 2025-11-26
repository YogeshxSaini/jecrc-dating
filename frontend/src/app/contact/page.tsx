import Link from 'next/link';

export default function ContactPage() {
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
        <h1 className="text-4xl font-bold mb-8">Contact Us 📧</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-2">General Support</h3>
            <p className="text-gray-600 mb-4">Questions about using the app</p>
            <a href="mailto:support@jecrc.ac.in" className="text-purple-600 hover:underline">
              support@jecrc.ac.in
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-4xl mb-4">🚨</div>
            <h3 className="text-xl font-bold mb-2">Report Abuse</h3>
            <p className="text-gray-600 mb-4">Safety concerns or violations</p>
            <a href="mailto:abuse@jecrc.ac.in" className="text-red-600 hover:underline">
              abuse@jecrc.ac.in
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Privacy Concerns</h3>
            <p className="text-gray-600 mb-4">Data and privacy questions</p>
            <a href="mailto:privacy@jecrc.ac.in" className="text-purple-600 hover:underline">
              privacy@jecrc.ac.in
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-xl font-bold mb-2">Business Inquiries</h3>
            <p className="text-gray-600 mb-4">Partnerships and media</p>
            <a href="mailto:business@jecrc.ac.in" className="text-purple-600 hover:underline">
              business@jecrc.ac.in
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="yourname@jecrc.ac.in"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="What's this about?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Tell us more..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Send Message
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-4">
            We typically respond within 24-48 hours during business days.
          </p>
        </div>
      </div>
    </div>
  );
}
