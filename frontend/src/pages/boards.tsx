import React, { useEffect, useState } from 'react';
import ReportUserForm from '../components/ReportUserForm';
import UserBoardTable from '../components/UserBoardTable';
import SitesBoardTable from '../components/SitesBoardTable';
import { getBoard, reportUser } from '../utils/boardsApi';
import { usePiAuth } from '../hooks/usePiAuth';

import UserPiKycGuard from '../components/UserPiKycGuard';

interface BoardUser {
  username: string;
  type: string;
  community_score: number;
  badges?: string[];
  ai_summary: string;
}

interface BoardSite {
  site: string;
  type: string;
  community_score: number;
  ai_summary: string;
}

interface UserReport {
  username: string;
  type: string;
  description: string;
  evidence: string[];
}

export default function BoardsPage() {
  const [shame, setShame] = useState<BoardUser[]>([]);
  const [fame, setFame] = useState<BoardUser[]>([]);
  const [sites, setSites] = useState<BoardSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load boards from API
  useEffect(() => {
    async function fetchBoards() {
      try {
        setLoading(true);
        const [shameData, fameData, sitesData] = await Promise.all([
          getBoard<BoardUser[]>('shame'),
          getBoard<BoardUser[]>('fame'),
          getBoard<BoardSite[]>('sites'),
        ]);
        setShame(shameData);
        setFame(fameData);
        setSites(sitesData);
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'שגיאת טעינה');
      } finally {
        setLoading(false);
      }
    }
    fetchBoards();
  }, []);

  // Submit report to API
  async function handleReport(data: UserReport) {
    try {
      setLoading(true);
      await reportUser(data);
      // רענון הנתונים מה-API לאחר דיווח
      const [shameData, fameData] = await Promise.all([
        getBoard<BoardUser[]>('shame'),
        getBoard<BoardUser[]>('fame'),
      ]);
      setShame(shameData);
      setFame(fameData);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאת דיווח');
    } finally {
      setLoading(false);
    }
  }

  return (
    <UserPiKycGuard>
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">לוחות קהילה – בושה, מובילים ואתרים</h1>
        {error && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{error}</div>}
        <ReportUserForm onSubmit={handleReport} />
        {loading ? (
          <div className="text-center py-8">טוען נתונים...</div>
        ) : (
          <>
            <UserBoardTable users={shame} title="לוח בושה (סקאם/רמאות)" />
            <UserBoardTable users={fame} title="לוח מובילים (מנהיגים/תורמים)" />
            <SitesBoardTable sites={sites} />
          </>
        )}
      </div>
    </UserPiKycGuard>
  );
}
