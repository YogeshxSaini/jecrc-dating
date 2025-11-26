import Link from 'next/link';

export default function HelpPage() {
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
        <h1 className="text-4xl font-bold mb-8">Help Center 💡</h1>
        
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <FAQItem
                question="How do I verify my account?"
                answer="Use your @jecrc.ac.in email to sign up. You'll receive an OTP code to verify your email address. Check the backend logs for the code during development."
              />
              <FAQItem
                question="How does matching work?"
                answer="When you like someone and they like you back, it's a match! You'll both be notified and can start chatting immediately."
              />
              <FAQItem
                question="Why aren't my photos showing up?"
                answer="All photos must be approved by moderators first to ensure they meet our community guidelines. This usually takes 24-48 hours."
              />
              <FAQItem
                question="Can I undo a swipe?"
                answer="Currently, swipes are final. Be thoughtful about your likes and passes!"
              />
              <FAQItem
                question="How do I report someone?"
                answer="Tap the three dots on their profile and select 'Report'. Our team reviews all reports and takes appropriate action."
              />
              <FAQItem
                question="Can I delete my account?"
                answer="Yes, go to Settings > Account > Delete Account. This action is permanent and cannot be undone."
              />
              <FAQItem
                question="Why was my account banned?"
                answer="Accounts are banned for violating our Terms of Service, usually for harassment, inappropriate content, or spam. Contact support if you believe this was a mistake."
              />
              <FAQItem
                question="How do I change my email?"
                answer="Contact support at support@jecrc.ac.in. You'll need to verify ownership of both the old and new email addresses."
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="mb-6">Our support team is here to help!</p>
            <Link
              href="/contact"
              className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b pb-6 last:border-0">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-gray-700">{answer}</p>
    </div>
  );
}
