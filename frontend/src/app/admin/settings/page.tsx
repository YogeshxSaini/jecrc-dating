'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SystemSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSystemSettings();
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setSaving(true);
      await api.updateSystemSettings(settings);
      alert('Settings updated successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: string, key: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [category]: {
        ...(settings[category] || {}),
        [key]: value,
      },
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-gray-400">Configure platform features and behavior</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Matching Settings */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>💘</span> Matching Settings
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Max Daily Likes</label>
                <input
                  type="number"
                  value={settings?.matching?.maxDailyLikes || 50}
                  onChange={(e) =>
                    updateSetting('matching', 'maxDailyLikes', parseInt(e.target.value))
                  }
                  min="1"
                  max="1000"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Max Discover Profiles</label>
                <input
                  type="number"
                  value={settings?.matching?.maxDiscoverProfiles || 100}
                  onChange={(e) =>
                    updateSetting('matching', 'maxDiscoverProfiles', parseInt(e.target.value))
                  }
                  min="10"
                  max="500"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Min Photos Required</label>
                <input
                  type="number"
                  value={settings?.matching?.minPhotos || 1}
                  onChange={(e) => updateSetting('matching', 'minPhotos', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Max Photos Allowed</label>
                <input
                  type="number"
                  value={settings?.matching?.maxPhotos || 6}
                  onChange={(e) => updateSetting('matching', 'maxPhotos', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.matching?.requireEmailVerification ?? true}
                  onChange={(e) =>
                    updateSetting('matching', 'requireEmailVerification', e.target.checked)
                  }
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-white">Require Email Verification</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.matching?.requirePhotoVerification ?? false}
                  onChange={(e) =>
                    updateSetting('matching', 'requirePhotoVerification', e.target.checked)
                  }
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-white">Require Photo Verification to Match</span>
              </label>
            </div>
          </div>
        </div>

        {/* Moderation Settings */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🛡️</span> Moderation Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Auto-Flag Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={settings?.moderation?.autoFlagKeywords?.join(', ') || ''}
                onChange={(e) =>
                  updateSetting(
                    'moderation',
                    'autoFlagKeywords',
                    e.target.value.split(',').map((k) => k.trim())
                  )
                }
                placeholder="spam, scam, fake, inappropriate"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Min Reports for Auto-Ban
              </label>
              <input
                type="number"
                value={settings?.moderation?.minReportsForAutoban || 5}
                onChange={(e) =>
                  updateSetting('moderation', 'minReportsForAutoban', parseInt(e.target.value))
                }
                min="1"
                max="50"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.moderation?.requirePhotoApproval ?? false}
                onChange={(e) =>
                  updateSetting('moderation', 'requirePhotoApproval', e.target.checked)
                }
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-white">Require Manual Photo Approval</span>
            </label>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🎛️</span> Feature Toggles
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
              <span className="text-white font-medium">Chat Messaging</span>
              <input
                type="checkbox"
                checked={settings?.features?.chatEnabled ?? true}
                onChange={(e) => updateSetting('features', 'chatEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
              <span className="text-white font-medium">Video Calls</span>
              <input
                type="checkbox"
                checked={settings?.features?.videoCallEnabled ?? false}
                onChange={(e) => updateSetting('features', 'videoCallEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
              <span className="text-white font-medium">Voice Calls</span>
              <input
                type="checkbox"
                checked={settings?.features?.voiceCallEnabled ?? false}
                onChange={(e) => updateSetting('features', 'voiceCallEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
              <span className="text-white font-medium">GIF Support</span>
              <input
                type="checkbox"
                checked={settings?.features?.gifEnabled ?? true}
                onChange={(e) => updateSetting('features', 'gifEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
              <span className="text-white font-medium">Sticker Support</span>
              <input
                type="checkbox"
                checked={settings?.features?.stickerEnabled ?? true}
                onChange={(e) => updateSetting('features', 'stickerEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Save Button (Bottom) */}
      {hasChanges && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
