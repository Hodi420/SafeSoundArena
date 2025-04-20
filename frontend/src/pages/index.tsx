import UserPiKycGuard from '../components/UserPiKycGuard';

import MainBanner from '../components/MainBanner';

export default function SafeSoundArenaHome() {
  return (
    <UserPiKycGuard>
      <div className="min-h-screen bg-[#181A27] flex flex-col items-center justify-start py-12">
        <MainBanner />
        {/* כאן אפשר להוסיף תוכן נוסף מתחת לבאנר */}
      </div>
    </UserPiKycGuard>
  );
}
