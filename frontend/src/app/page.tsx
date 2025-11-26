'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💖</span>
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                JECRC Dating
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className={`text-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Find Your{' '}
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Campus Connection
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with fellow JECRC students in a safe, verified environment. 
            Your next great relationship could be just a swipe away! 💕
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition transform hover:-translate-y-1"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="bg-white text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-purple-300 transition"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border border-gray-200 hover:shadow-lg transition">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-3xl font-bold text-gray-900">100%</div>
            <div className="text-gray-600 mt-2">Verified JECRC Students</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border border-gray-200 hover:shadow-lg transition">
            <div className="text-4xl mb-2">🔒</div>
            <div className="text-3xl font-bold text-gray-900">Safe</div>
            <div className="text-gray-600 mt-2">Moderated & Secure</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border border-gray-200 hover:shadow-lg transition">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-3xl font-bold text-gray-900">Real-time</div>
            <div className="text-gray-600 mt-2">Instant Messaging</div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-32">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Why Students Love Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon="🎓"
              title="Campus Exclusive"
              description="Only @jecrc.ac.in email addresses allowed. Connect with verified students only."
            />
            <FeatureCard
              icon="🔐"
              title="Privacy First"
              description="Your data is encrypted and secure. Control who sees your profile."
            />
            <FeatureCard
              icon="❤️"
              title="Smart Matching"
              description="Our algorithm finds compatible matches based on your interests and preferences."
            />
            <FeatureCard
              icon="📸"
              title="Photo Verification"
              description="All profile photos are moderated to ensure authenticity and safety."
            />
            <FeatureCard
              icon="💌"
              title="Instant Chat"
              description="Real-time messaging with typing indicators and read receipts."
            />
            <FeatureCard
              icon="🛡️"
              title="Report & Block"
              description="Feel uncomfortable? Report users and our admin team takes action immediately."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Find Your Match?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of JECRC students already connecting on campus
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition transform hover:-translate-y-1"
          >
            Create Your Profile Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-32 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">💖</span>
                <span className="text-xl font-bold">JECRC Dating</span>
              </div>
              <p className="text-gray-400">
                Connecting JECRC students in a safe and fun environment.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/guidelines" className="hover:text-white">Community Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link href="/safety" className="hover:text-white">Safety Center</Link></li>
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 JECRC Dating. All rights reserved. Made with 💖 for JECRC students.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition hover:-translate-y-1">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
