'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';

interface Photo {
  id: string;
  url: string;
  isProfilePic: boolean;
  order: number;
}

interface PhotoUploadProps {
  photos: Photo[];
  onPhotosChange: () => void;
}

export default function PhotoUpload({ photos, onPhotosChange }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        
        try {
          await api.uploadPhoto(imageData, photos.length === 0);
          alert('Photo uploaded successfully!');
          onPhotosChange();
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error: any) {
          console.error('Upload failed:', error);
          alert(error.response?.data?.error || 'Failed to upload photo');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Failed to read file');
      setUploading(false);
    }
  };

  const handleSetProfilePic = async (photoId: string) => {
    try {
      await api.updatePhoto(photoId, { isProfilePic: true });
      alert('Profile picture updated!');
      onPhotosChange();
    } catch (error) {
      console.error('Failed to set profile pic:', error);
      alert('Failed to update profile picture');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await api.deletePhoto(photoId);
      alert('Photo deleted successfully!');
      onPhotosChange();
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Failed to delete photo');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Photos ({photos.length}/6)</h3>
        {photos.length < 6 && (
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <span className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition inline-block">
              {uploading ? 'Uploading...' : '+ Add Photo'}
            </span>
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 group"
          >
            <img
              src={photo.url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            
            {photo.isProfilePic && (
              <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                Profile
              </div>
            )}

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              {!photo.isProfilePic && (
                <button
                  onClick={() => handleSetProfilePic(photo.id)}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition"
                >
                  Set as Profile
                </button>
              )}
              <button
                onClick={() => handleDeletePhoto(photo.id)}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: 6 - photos.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500"
          >
            <span className="text-4xl">+</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400">
        • Maximum 6 photos allowed<br />
        • First photo will be your profile picture<br />
        • Supported formats: JPG, PNG, GIF<br />
        • Maximum size: 5MB per photo
      </p>
    </div>
  );
}
