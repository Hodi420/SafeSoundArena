import React, { useEffect, useState } from 'react';
import ReportUserForm from '../components/ReportUserForm';
import UserBoardTable from '../components/UserBoardTable';
import SitesBoardTable from '../components/SitesBoardTable';
import { getBoard, reportUser } from '../utils/boardsApi';
import { usePiAuth } from '../hooks/usePiAuth';

import UserPiKycGuard from '../components/UserPiKycGuard';

export default function BoardsPage() {
  const [shame, setShame] = useState<Record<string, unknown>[]>([]);
  const [fame, setFame] = useState<Record<string, unknown>[]>([]);
  const [sites, setSites] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load boards from API
  useEffect(() => {
    async function fetchBoards() {
      try {
        setLoading(true);
        const [shameData, fameData, sitesData] = await Promise.all([
          getBoard('shame'),
          getBoard('fame'),
          getBoard('sites'),
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
  async function handleReport(data: Record<string, unknown>) {
    try {
      setLoading(true);
      await reportUser(data);
      // רענון הנתונים מה-API לאחר דיווח
      const [shameData, fameData] = await Promise.all([
        getBoard('shame'),
        getBoard('fame'),
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
