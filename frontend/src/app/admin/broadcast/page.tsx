'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'ANNOUNCEMENT' | 'MAINTENANCE' | 'UPDATE'>('ANNOUNCEMENT');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !message) {
      alert('Please fill in all fields');
      return;
    }

    if (!confirm(`Send this ${type} to all active users?`)) {
      return;
    }

    try {
      setSending(true);
      await api.broadcastNotification(title, message, type);
      alert('Broadcast sent successfully!');
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error('Failed to send broadcast:', error);
      alert('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Platform Announcements</h1>
        <p className="text-gray-400">Send notifications to all users</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-2xl">
        <form onSubmit={handleSend} className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notification Type
            </label>
            <div className="flex gap-2">
              {(['ANNOUNCEMENT', 'MAINTENANCE', 'UPDATE'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    type === t
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message..."
              rows={6}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">Preview</div>
              <div className="space-y-2">
                <div className="font-semibold text-white">{title || 'Title will appear here'}</div>
                <div className="text-gray-300 text-sm">{message || 'Message will appear here'}</div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={sending || !title || !message}
            className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : '📢 Send Broadcast to All Users'}
          </button>
        </form>

        {/* Warning */}
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-yellow-500 text-xl">⚠️</span>
            <div>
              <div className="text-yellow-500 font-semibold mb-1">Warning</div>
              <div className="text-yellow-400 text-sm">
                This will send a notification to ALL active users on the platform. This action cannot be undone.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Broadcasts (could be added with backend support) */}
      <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-2xl">
        <h2 className="text-lg font-bold text-white mb-4">Quick Templates</h2>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setType('MAINTENANCE');
              setTitle('Scheduled Maintenance');
              setMessage('The platform will be under maintenance from 2 AM to 4 AM tonight. Sorry for any inconvenience.');
            }}
            className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <div className="text-white font-medium mb-1">Maintenance Notice</div>
            <div className="text-gray-400 text-sm">Quick template for maintenance announcements</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setType('UPDATE');
              setTitle('New Features Available!');
              setMessage('Check out our latest updates including improved matching algorithm and new profile features.');
            }}
            className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <div className="text-white font-medium mb-1">Feature Update</div>
            <div className="text-gray-400 text-sm">Announce new features or improvements</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setType('ANNOUNCEMENT');
              setTitle('Important Announcement');
              setMessage('Please update your profile information to improve your matching experience.');
            }}
            className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <div className="text-white font-medium mb-1">General Announcement</div>
            <div className="text-gray-400 text-sm">Generic announcement template</div>
          </button>
        </div>
      </div>
    </div>
  );
}
