interface SkeletonProps {
  variant?: 'profileCard' | 'chatList' | 'matchCard' | 'text' | 'circle' | 'rectangle';
  className?: string;
}

export default function Skeleton({ variant = 'rectangle', className = '' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  if (variant === 'profileCard') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
        <div className={`${baseClasses} h-96 w-full`} />
        <div className="p-4 space-y-3">
          <div className={`${baseClasses} h-6 w-3/4 rounded`} />
          <div className={`${baseClasses} h-4 w-1/2 rounded`} />
          <div className="flex gap-2">
            <div className={`${baseClasses} h-6 w-16 rounded-full`} />
            <div className={`${baseClasses} h-6 w-20 rounded-full`} />
            <div className={`${baseClasses} h-6 w-16 rounded-full`} />
          </div>
          <div className={`${baseClasses} h-4 w-full rounded`} />
          <div className={`${baseClasses} h-4 w-5/6 rounded`} />
        </div>
      </div>
    );
  }

  if (variant === 'chatList') {
    return (
      <div className={`flex items-center gap-3 p-3 ${className}`}>
        <div className={`${baseClasses} h-12 w-12 rounded-full flex-shrink-0`} />
        <div className="flex-1 space-y-2">
          <div className={`${baseClasses} h-4 w-32 rounded`} />
          <div className={`${baseClasses} h-3 w-48 rounded`} />
        </div>
        <div className={`${baseClasses} h-3 w-12 rounded`} />
      </div>
    );
  }

  if (variant === 'matchCard') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className={`${baseClasses} h-24 w-24 rounded-full mb-2`} />
        <div className={`${baseClasses} h-4 w-20 rounded`} />
      </div>
    );
  }

  if (variant === 'text') {
    return <div className={`${baseClasses} h-4 rounded ${className}`} />;
  }

  if (variant === 'circle') {
    return <div className={`${baseClasses} rounded-full ${className}`} />;
  }

  return <div className={`${baseClasses} rounded ${className}`} />;
}

export function SkeletonProfileCard({ className }: { className?: string }) {
  return <Skeleton variant="profileCard" className={className} />;
}

export function SkeletonChatList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="chatList" />
      ))}
    </div>
  );
}

export function SkeletonMatchCard({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-48 animate-pulse bg-gray-200 dark:bg-gray-700" />
          <div className="p-6 space-y-3">
            <div className="h-6 w-32 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-48 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-full animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-3/4 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-40 animate-pulse bg-gray-200 dark:bg-gray-700 rounded mt-4" />
          </div>
        </div>
      ))}
    </>
  );
}
