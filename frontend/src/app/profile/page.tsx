'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import PhotoUpload from '@/components/PhotoUpload';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    gender: '',
    lookingFor: '',
    department: '',
    year: '',
    interests: [] as string[],
  });
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    try {
      const data = await api.getMyProfile();
      setProfile(data.profile);
      setEditForm({
        bio: data.profile?.bio || '',
        gender: data.profile?.gender || '',
        lookingFor: data.profile?.lookingFor || '',
        department: data.profile?.department || '',
        year: data.profile?.year?.toString() || '',
        interests: data.profile?.interests || [],
      });
      loadPhotos();
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const photosData = await api.getPhotos();
      setPhotos(photosData);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        bio: editForm.bio,
        gender: editForm.gender || undefined,
        lookingFor: editForm.lookingFor || undefined,
        department: editForm.department,
        year: editForm.year ? parseInt(editForm.year) : undefined,
        interests: editForm.interests,
      });
      await loadProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addInterest = () => {
    if (newInterest && !editForm.interests.includes(newInterest)) {
      setEditForm({
        ...editForm,
        interests: [...editForm.interests, newInterest],
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter((i) => i !== interest),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">💖</span>
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                JECRC Dating
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-4xl overflow-hidden">
              {photos.find(p => p.isProfilePic) ? (
                <img 
                  src={photos.find(p => p.isProfilePic)?.url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.displayName?.[0] || '👤'}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user?.displayName}</h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-6 mt-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder="Tell others about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-Binary</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Looking For</label>
                  <select
                    value={editForm.lookingFor}
                    onChange={(e) => setEditForm({ ...editForm, lookingFor: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-Binary</option>
                    <option value="OTHER">Everyone</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., CSE, ECE, ME"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="Add an interest"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editForm.interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {interest}
                      <button
                        onClick={() => removeInterest(interest)}
                        className="hover:text-purple-900"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <InfoCard label="Bio" value={profile?.bio || 'Not set'} />
                <InfoCard label="Gender" value={profile?.gender || 'Not set'} />
                <InfoCard label="Looking For" value={profile?.lookingFor || 'Not set'} />
                <InfoCard label="Department" value={profile?.department || 'Not set'} />
                <InfoCard label="Year" value={profile?.year ? `Year ${profile.year}` : 'Not set'} />
                <InfoCard label="Interests" value={profile?.interests?.join(', ') || 'Not set'} />
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
                >
                  Edit Profile
                </button>
              </div>
            </>
          )}
        </div>

        {/* Photos Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <PhotoUpload photos={photos} onPhotosChange={loadPhotos} />
        </div>

        {!isEditing && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Complete Your Profile</h3>
            <p className="text-blue-800 text-sm">
              Adding more details to your profile helps others get to know you better and increases your chances of making meaningful connections!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}
