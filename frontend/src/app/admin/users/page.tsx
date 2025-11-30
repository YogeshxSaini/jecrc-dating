'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityData, setActivityData] = useState<any>(null);
  const limit = 20;

  useEffect(() => {
    loadUsers();
  }, [offset, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers(limit, offset, search || undefined);
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: string, displayName: string) => {
    const reason = prompt(`Enter reason for banning ${displayName}:`);
    if (!reason) return;

    try {
      await api.banUser(userId, reason);
      alert('User banned successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user');
    }
  };

  const handleUnban = async (userId: string, displayName: string) => {
    if (!confirm(`Unban ${displayName}?`)) return;

    try {
      await api.unbanUser(userId);
      alert('User unbanned successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Failed to unban user');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadUsers();
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkAction = async (action: 'ban' | 'unban' | 'delete') => {
    if (selectedUsers.size === 0) {
      alert('Please select users first');
      return;
    }

    let reason = '';
    if (action === 'ban') {
      reason = prompt(`Enter reason for banning ${selectedUsers.size} users:`) || '';
      if (!reason) return;
    }

    if (!confirm(`${action.toUpperCase()} ${selectedUsers.size} selected users?`)) {
      return;
    }

    try {
      await api.bulkUserAction(action, Array.from(selectedUsers), reason);
      alert(`Bulk ${action} completed successfully`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error) {
      console.error(`Failed to ${action} users:`, error);
      alert(`Failed to ${action} users`);
    }
  };

  const viewActivity = async (userId: string) => {
    try {
      const data = await api.getUserActivity(userId);
      setActivityData(data);
      setShowActivityModal(true);
    } catch (error) {
      console.error('Failed to load activity:', error);
      alert('Failed to load user activity');
    }
  };

  const exportToCSV = () => {
    const csvData = users.map(u => ({
      Email: u.email,
      Name: u.displayName || 'N/A',
      Role: u.role,
      Status: u.isBanned ? 'Banned' : u.isActive ? 'Active' : 'Inactive',
      Verified: u.verifiedSelfie ? 'Yes' : 'No',
      Joined: new Date(u.createdAt).toLocaleDateString(),
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-gray-400">View and manage all platform users</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Search
          </button>
          <button
            type="button"
            onClick={exportToCSV}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            📥 Export CSV
          </button>
        </form>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between">
          <span className="text-purple-400 font-medium">{selectedUsers.size} users selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('ban')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
            >
              Bulk Ban
            </button>
            <button
              onClick={() => handleBulkAction('unban')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              Bulk Unban
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-gray-400">
          Showing {users.length} of {total} users
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Verified
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{user.displayName || 'No name'}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isBanned ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">
                            Banned
                          </span>
                        ) : user.isActive ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-400">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.verifiedSelfie ? (
                          <span className="text-green-400">✓ Verified</span>
                        ) : (
                          <span className="text-gray-500">Not verified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {user.role !== 'ADMIN' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewActivity(user.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                            >
                              Activity
                            </button>
                            {user.isBanned ? (
                              <button
                                onClick={() => handleUnban(user.id, user.displayName)}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBan(user.id, user.displayName)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                              >
                                Ban
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Activity Modal */}
      {showActivityModal && activityData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowActivityModal(false)}>
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">User Activity</h2>
                <p className="text-gray-400 mt-1">{activityData.user.displayName || activityData.user.email}</p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Messages Sent</div>
                  <div className="text-2xl font-bold text-white">{activityData.activity.messagesSent}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Matches</div>
                  <div className="text-2xl font-bold text-white">{activityData.activity.matches.length}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Likes Given</div>
                  <div className="text-2xl font-bold text-white">{activityData.activity.likesGiven.length}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Likes Received</div>
                  <div className="text-2xl font-bold text-white">{activityData.activity.likesReceived.length}</div>
                </div>
              </div>

              {/* Reports */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Reports Made</div>
                  <div className="text-xl font-bold text-white">{activityData.activity.reportsMade}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Reports Against</div>
                  <div className="text-xl font-bold text-red-400">{activityData.activity.reportsAgainst}</div>
                </div>
              </div>

              {/* Recent Likes Given */}
              {activityData.activity.likesGiven.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Recent Likes Given</h3>
                  <div className="space-y-2">
                    {activityData.activity.likesGiven.slice(0, 5).map((like: any) => (
                      <div key={like.id} className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-white">{like.toUser.displayName || 'User'}</div>
                          <div className="text-gray-400 text-sm">{like.toUser.email}</div>
                        </div>
                        <div className="text-gray-500 text-sm">{new Date(like.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Active */}
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Last Active</div>
                <div className="text-white">
                  {activityData.user.lastActiveAt 
                    ? new Date(activityData.user.lastActiveAt).toLocaleString()
                    : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
