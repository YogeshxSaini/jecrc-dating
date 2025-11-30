'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 50;

  useEffect(() => {
    loadLogs();
  }, [offset, actionFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs(limit, offset, actionFilter || undefined);
      setLogs(data.logs || []);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      BAN_USER: 'bg-red-500',
      UNBAN_USER: 'bg-green-500',
      DELETE_USER: 'bg-red-700',
      APPROVE_PHOTO: 'bg-green-500',
      REJECT_PHOTO: 'bg-red-500',
      UPDATE_SETTINGS: 'bg-blue-500',
      BULK_ACTION: 'bg-purple-500',
    };
    return colors[action] || 'bg-gray-500';
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      BAN_USER: '🚫',
      UNBAN_USER: '✅',
      DELETE_USER: '🗑️',
      APPROVE_PHOTO: '✓',
      REJECT_PHOTO: '✗',
      UPDATE_SETTINGS: '⚙️',
      BULK_ACTION: '📦',
    };
    return icons[action] || '📝';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
        <p className="text-gray-400">Track all administrative actions on the platform</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-center">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Actions</option>
          <option value="BAN_USER">Ban User</option>
          <option value="UNBAN_USER">Unban User</option>
          <option value="DELETE_USER">Delete User</option>
          <option value="APPROVE_PHOTO">Approve Photo</option>
          <option value="REJECT_PHOTO">Reject Photo</option>
          <option value="UPDATE_SETTINGS">Update Settings</option>
          <option value="BULK_ACTION">Bulk Action</option>
        </select>

        <div className="text-gray-400 text-sm">
          {total} total log entries
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-gray-400">No audit logs found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white ${getActionBadge(
                          log.action
                        )}`}
                      >
                        <span>{getActionIcon(log.action)}</span>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{log.adminId.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {log.targetType}: {log.targetId.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {log.details && (
                        <div className="text-xs text-gray-400 truncate">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">{log.ipAddress || 'N/A'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-between items-center">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
