import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

export default function UserDashboard() {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const {
    data: profile,
    isLoading: profileLoading,
    error,
  } = useUserProfile(userId || '');

  if (loading || profileLoading) {
    return <div className="p-6 text-lg">Loading your dashboard...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500">Error loading profile: {error.message}</div>;
  }
  if (!profile) {
    return <div className="p-6 text-yellow-500">No profile data available.</div>;
  }

  return (
    <div className="max-w-lg mx-auto bg-gray-900 rounded-lg shadow-lg p-6 mt-6 text-white">
      <div className="flex items-center gap-4 mb-4">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full border-2 border-blue-400" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center text-2xl">👤</div>
        )}
        <div>
          <div className="text-2xl font-bold">{profile.username}</div>
          <div className="text-sm text-gray-400">ID: {profile.id}</div>
        </div>
      </div>
      <div className="mb-2"><span className="font-semibold">Reputation:</span> <span className="text-green-400">{profile.reputation}</span></div>
      <div className="mb-2"><span className="font-semibold">Coins:</span> <span className="text-yellow-400">{profile.coins}</span></div>
      <div className="mb-2"><span className="font-semibold">Joined:</span> <span className="text-gray-300">{new Date(profile.joinedAt).toLocaleDateString()}</span></div>
      {profile.email && (
        <div className="mb-2"><span className="font-semibold">Email:</span> <span className="text-gray-200">{profile.email}</span></div>
      )}
    </div>
  );
}
