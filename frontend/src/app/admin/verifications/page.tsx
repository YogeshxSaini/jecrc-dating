'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDING');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadVerifications();
  }, [filter]);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const data = await api.getPhotoVerifications(filter);
      setVerifications(data.verifications || []);
    } catch (error) {
      console.error('Failed to load verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = prompt('Enter rejection reason (optional):') || '';
    }

    try {
      await api.reviewPhotoVerification(id, status, reason);
      alert(`Verification ${status.toLowerCase()} successfully`);
      loadVerifications();
    } catch (error) {
      console.error('Failed to review verification:', error);
      alert('Failed to review verification');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Photo Verifications</h1>
        <p className="text-gray-400">Review and approve user verification photos</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Verifications Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : verifications.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-2">No {filter.toLowerCase()} verifications</h2>
          <p className="text-gray-400">All caught up!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {verifications.map((verification) => (
            <div key={verification.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              {/* Image */}
              <div
                className="relative h-80 bg-gray-900 cursor-pointer group"
                onClick={() => setSelectedImage(verification.photoUrl)}
              >
                {verification.photoUrl ? (
                  <img
                    src={verification.photoUrl}
                    alt="Verification"
                    className="w-full h-full object-cover group-hover:opacity-90 transition"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-6xl">
                    📷
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition">
                  <span className="text-white text-lg font-medium">Click to enlarge</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="mb-3">
                  <div className="text-white font-semibold">{verification.user.displayName || 'User'}</div>
                  <div className="text-gray-400 text-sm">{verification.user.email}</div>
                </div>

                <div className="mb-3">
                  <div className="text-gray-400 text-xs mb-1">Submitted</div>
                  <div className="text-white text-sm">
                    {new Date(verification.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="mb-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      verification.status === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : verification.status === 'APPROVED'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {verification.status}
                  </span>
                </div>

                {verification.status === 'REJECTED' && verification.reason && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                    Reason: {verification.reason}
                  </div>
                )}

                {verification.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(verification.id, 'REJECTED')}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(verification.id, 'APPROVED')}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="Verification enlarged"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
