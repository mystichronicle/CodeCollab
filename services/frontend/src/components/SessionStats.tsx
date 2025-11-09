import React from 'react';
import { Session } from '../services/api';

interface SessionStatsProps {
  sessions: Session[];
}

export const SessionStats: React.FC<SessionStatsProps> = ({ sessions }) => {
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.is_active).length;
  const totalParticipants = sessions.reduce((sum, s) => sum + s.participants.length, 0);
  
  const languageStats = sessions.reduce((acc, session) => {
    acc[session.language] = (acc[session.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topLanguage = Object.entries(languageStats).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-400 font-medium">Total Sessions</p>
            <p className="text-3xl font-bold text-white mt-1">{totalSessions}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-400 font-medium">Active Now</p>
            <p className="text-3xl font-bold text-white mt-1">{activeSessions}</p>
          </div>
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-400 font-medium">Participants</p>
            <p className="text-3xl font-bold text-white mt-1">{totalParticipants}</p>
          </div>
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-400 font-medium">Top Language</p>
            <p className="text-2xl font-bold text-white mt-1 capitalize">{topLanguage?.[0] || 'N/A'}</p>
          </div>
          <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
