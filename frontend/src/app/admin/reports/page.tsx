'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDING');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports(filter);
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (reportId: string, status: string) => {
    const resolution = prompt(`Enter resolution notes for this ${status.toLowerCase()} report:`);
    if (!resolution) return;

    try {
      await api.reviewReport(reportId, status, resolution);
      alert('Report reviewed successfully');
      loadReports();
    } catch (error) {
      console.error('Failed to review report:', error);
      alert('Failed to review report');
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    const reason = prompt(`Enter reason for banning ${userName}:`);
    if (!reason) return;

    try {
      await api.banUser(userId, reason);
      alert('User banned successfully');
      loadReports();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">User Reports</h1>
        <p className="text-gray-400">Review and manage user reports</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'].map((status) => (
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

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">No {filter.toLowerCase()} reports</h2>
          <p className="text-gray-400">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        report.status === 'PENDING'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : report.status === 'RESOLVED'
                          ? 'bg-green-500/20 text-green-400'
                          : report.status === 'DISMISSED'
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {report.status}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-white font-semibold mb-1">Reported User</div>
                    <div className="text-gray-300">
                      {report.reported.displayName || 'No name'} ({report.reported.email})
                      {report.reported.isBanned && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">
                          Banned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-white font-semibold mb-1">Reported By</div>
                    <div className="text-gray-300">
                      {report.reporter.displayName || 'No name'} ({report.reporter.email})
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-white font-semibold mb-1">Reason</div>
                    <div className="text-gray-300 bg-gray-900 p-3 rounded-lg">
                      {report.reason}
                    </div>
                  </div>

                  {report.resolution && (
                    <div className="mb-4">
                      <div className="text-white font-semibold mb-1">Resolution</div>
                      <div className="text-gray-300 bg-gray-900 p-3 rounded-lg">
                        {report.resolution}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {report.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(report.id, 'DISMISSED')}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleReview(report.id, 'REVIEWED')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => handleReview(report.id, 'RESOLVED')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Resolve
                  </button>
                  {!report.reported.isBanned && (
                    <button
                      onClick={() => handleBanUser(report.reported.id, report.reported.displayName)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition ml-auto"
                    >
                      Ban User
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
