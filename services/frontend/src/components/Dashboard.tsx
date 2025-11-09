import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI, authAPI, Session } from '../services/api';
import { DashboardSkeleton } from './LoadingSkeleton';
import { ErrorAlert, SuccessAlert } from './ErrorAlert';
import { SessionStats } from './SessionStats';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from './KeyboardShortcuts';
import { EmptyState, NoResultsState } from './EmptyState';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

const languageColors: Record<string, { bg: string; badge: string; icon: string }> = {
  python: { bg: 'from-blue-500/10 to-blue-600/5', badge: 'from-blue-500 to-blue-600', icon: '🐍' },
  javascript: { bg: 'from-yellow-500/10 to-yellow-600/5', badge: 'from-yellow-500 to-yellow-600', icon: '📜' },
  typescript: { bg: 'from-blue-400/10 to-blue-500/5', badge: 'from-blue-400 to-blue-500', icon: '🔷' },
  go: { bg: 'from-cyan-500/10 to-cyan-600/5', badge: 'from-cyan-500 to-cyan-600', icon: '🐹' },
  rust: { bg: 'from-orange-500/10 to-orange-600/5', badge: 'from-orange-500 to-orange-600', icon: '🦀' },
  vlang: { bg: 'from-purple-500/10 to-purple-600/5', badge: 'from-purple-500 to-purple-600', icon: '⚡' },
  zig: { bg: 'from-amber-500/10 to-amber-600/5', badge: 'from-amber-500 to-amber-600', icon: '⚡' },
  elixir: { bg: 'from-purple-400/10 to-purple-500/5', badge: 'from-purple-400 to-purple-500', icon: '💧' },
  java: { bg: 'from-red-500/10 to-red-600/5', badge: 'from-red-500 to-red-600', icon: '☕' },
  cpp: { bg: 'from-blue-600/10 to-blue-700/5', badge: 'from-blue-600 to-blue-700', icon: '⚙️' },
  c: { bg: 'from-gray-500/10 to-gray-600/5', badge: 'from-gray-500 to-gray-600', icon: '🔧' },
};

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionLanguage, setNewSessionLanguage] = useState('python');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: 'n',
      description: 'Create new session',
      action: () => setShowCreateModal(true),
      ctrlKey: true,
    },
    {
      key: 'j',
      description: 'Join session by code',
      action: () => setShowJoinModal(true),
      ctrlKey: true,
    },
    {
      key: 'k',
      description: 'Focus search',
      action: () => document.getElementById('session-search')?.focus(),
      ctrlKey: true,
    },
    {
      key: '/',
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcutsHelp(true),
    },
  ];

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, filterLanguage]);

  const loadUserData = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      // Load sessions after user is loaded
      await loadSessions();
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const lang = filterLanguage === 'all' ? undefined : filterLanguage;
      const data = await sessionsAPI.list(lang);
      setSessions(data);
      console.log('Loaded sessions from API:', data);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    try {
      const newSession = await sessionsAPI.create({
        name: newSessionName.trim(),
        language: newSessionLanguage,
        description: newSessionDescription.trim() || undefined,
      });
      
      setSessions([newSession, ...sessions]);
      setShowCreateModal(false);
      setNewSessionName('');
      setNewSessionDescription('');
      setNewSessionLanguage('python');
      setSuccessMessage(`Session "${newSession.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      navigate(`/session/${newSession.id}`);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError('Failed to create session: ' + (err.response?.data?.detail || err.message));
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a share code');
      return;
    }
    
    try {
      setJoinError('');
      const session = await sessionsAPI.joinByCode(joinCode.trim().toUpperCase());
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/session/${session.id}`);
    } catch (err: any) {
      console.error('Failed to join session:', err);
      setJoinError(err.response?.data?.detail || 'Invalid share code. Please check and try again.');
    }
  };

  // Filter sessions based on search and language
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || session.language === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header Skeleton */}
        <header className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-700/50 rounded-xl animate-pulse"></div>
                <div>
                  <div className="h-6 w-32 bg-gray-700/50 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-24 bg-gray-700/50 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-10 w-32 bg-gray-700/50 rounded-xl animate-pulse"></div>
                <div className="h-10 w-20 bg-gray-700/50 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Action Buttons Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 w-48 bg-gray-700/50 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-700/50 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-12 w-36 bg-gray-700/50 rounded-xl animate-pulse"></div>
              <div className="h-12 w-36 bg-gray-700/50 rounded-xl animate-pulse"></div>
            </div>
          </div>
          
          {/* Search Bar Skeleton */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 h-14 bg-gray-700/50 rounded-xl animate-pulse"></div>
            <div className="w-48 h-14 bg-gray-700/50 rounded-xl animate-pulse"></div>
          </div>
          
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Error and Success Notifications */}
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
      {successMessage && <SuccessAlert message={successMessage} onClose={() => setSuccessMessage('')} />}
      
      {/* Modern Header */}
      <header className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center transform hover:scale-110 transition-transform duration-200 shadow-lg shadow-blue-500/50">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  CodeCollab
                </h1>
                <p className="text-xs text-gray-500 font-medium">Real-time Collaboration</p>
              </div>
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 px-4 py-2.5 bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-400">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 shadow-lg hover:shadow-red-500/50"
              >
                <span className="hidden sm:inline">Logout</span>
                <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Statistics */}
        {sessions.length > 0 && <SessionStats sessions={sessions} />}

        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Your Sessions
            </h2>
            <p className="text-gray-400">Create or join collaborative coding sessions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="group px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-teal-600 rounded-xl hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transform"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
                Join by Code
              </span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="group px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transform"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                New Session
              </span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input
              id="session-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions by name... (Ctrl+K)"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="pl-4 pr-10 py-3.5 bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none cursor-pointer min-w-[200px] font-medium"
              >
                <option value="all">All Languages</option>
                <option value="python">🐍 Python</option>
                <option value="javascript">📜 JavaScript</option>
                <option value="typescript">🔷 TypeScript</option>
                <option value="go">🐹 Go</option>
                <option value="rust">🦀 Rust</option>
                <option value="cpp">⚙️ C++</option>
                <option value="c">🔧 C</option>
                <option value="java">☕ Java</option>
                <option value="vlang">⚡ V Lang</option>
                <option value="zig">⚡ Zig</option>
                <option value="elixir">💧 Elixir</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="px-4 py-3.5 bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl text-gray-400 hover:text-white hover:border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              title="Keyboard shortcuts (/)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => {
            const langColor = languageColors[session.language] || languageColors.python;
            return (
              <div
                key={session.id}
                onClick={() => handleJoinSession(session.id)}
                className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1"
              >
                {/* Language Badge */}
                <div className="absolute -top-3 -right-3">
                  <div className={`px-4 py-2 bg-gradient-to-r ${langColor.badge} rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-200`}>
                    <span className="text-white font-bold text-sm uppercase tracking-wider flex items-center">
                      <span className="mr-1.5">{langColor.icon}</span>
                      {session.language}
                    </span>
                  </div>
                </div>

                {/* Session Content */}
                <div className="mt-4">
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {session.name}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      {/* Participants */}
                      <div className="flex items-center text-gray-400 group-hover:text-gray-300 transition-colors">
                        <div className="flex -space-x-2 mr-2">
                          {[...Array(Math.min(session.participants.length, 3))].map((_, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-full border-2 border-gray-800 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
                              title={session.participants[i] || ''}
                            >
                              {(session.participants[i] || 'U').charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {session.participants.length > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                              +{session.participants.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="font-medium">{session.participants.length}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center text-gray-400">
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-xs">{new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Join Button Overlay */}
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 font-medium">Click to join</span>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${langColor.bg} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}></div>
              </div>
            );
          })}
        </div>

        {/* No Results State */}
        {filteredSessions.length === 0 && sessions.length > 0 && (
          <NoResultsState
            searchQuery={searchQuery}
            filterLanguage={filterLanguage}
            onClear={() => {
              setSearchQuery('');
              setFilterLanguage('all');
            }}
          />
        )}

        {/* Empty State */}
        {sessions.length === 0 && (
          <EmptyState
            icon={
              <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
              </svg>
            }
            title="No sessions yet"
            description="Create your first coding session to start collaborating with others in real-time"
            action={{
              label: 'Create Your First Session',
              onClick: () => setShowCreateModal(true),
            }}
          />
        )}
      </main>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-gray-700/50 animate-slideUp relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Create Session</h3>
                <p className="text-gray-400 text-sm">Start a new collaboration workspace</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-xl"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Session Name Input */}
              <div>
                <label htmlFor="sessionName" className="block text-sm font-semibold text-gray-300 mb-3">
                  Session Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="sessionName"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="e.g., Python API Development"
                    className="w-full px-5 py-4 bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-base"
                    autoFocus
                  />
                  {newSessionName && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="sessionDescription" className="block text-sm font-semibold text-gray-300 mb-3">
                  Description <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  id="sessionDescription"
                  value={newSessionDescription}
                  onChange={(e) => setNewSessionDescription(e.target.value)}
                  placeholder="e.g., Building REST APIs with FastAPI"
                  rows={3}
                  className="w-full px-5 py-4 bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-base resize-none"
                />
              </div>

              {/* Language Selector */}
              <div>
                <label htmlFor="language" className="block text-sm font-semibold text-gray-300 mb-3">
                  Programming Language
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'python', label: 'Python', icon: '🐍', color: 'from-blue-500 to-blue-600' },
                    { value: 'javascript', label: 'JavaScript', icon: '📜', color: 'from-yellow-500 to-yellow-600' },
                    { value: 'typescript', label: 'TypeScript', icon: '🔷', color: 'from-blue-400 to-blue-500' },
                    { value: 'go', label: 'Go', icon: '🐹', color: 'from-cyan-500 to-cyan-600' },
                    { value: 'rust', label: 'Rust', icon: '🦀', color: 'from-orange-500 to-orange-600' },
                    { value: 'cpp', label: 'C++', icon: '⚙️', color: 'from-blue-600 to-blue-700' },
                    { value: 'c', label: 'C', icon: '🔧', color: 'from-gray-500 to-gray-600' },
                    { value: 'java', label: 'Java', icon: '☕', color: 'from-red-500 to-red-600' },
                    { value: 'vlang', label: 'V Lang', icon: '⚡', color: 'from-purple-500 to-purple-600' },
                    { value: 'zig', label: 'Zig', icon: '⚡', color: 'from-amber-500 to-amber-600' },
                    { value: 'elixir', label: 'Elixir', icon: '💧', color: 'from-purple-400 to-purple-500' },
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setNewSessionLanguage(lang.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        newSessionLanguage === lang.value
                          ? `border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20`
                          : 'border-gray-700/50 bg-gray-900/30 hover:border-gray-600/50 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`text-2xl ${newSessionLanguage === lang.value ? 'scale-110' : ''} transition-transform`}>
                          {lang.icon}
                        </div>
                        <span className={`font-semibold ${newSessionLanguage === lang.value ? 'text-white' : 'text-gray-400'}`}>
                          {lang.label}
                        </span>
                      </div>
                      {newSessionLanguage === lang.value && (
                        <div className="mt-2 flex justify-end">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-4 text-base font-semibold text-gray-300 bg-gray-800/50 backdrop-blur rounded-xl hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all border border-gray-700/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim()}
                  className="flex-1 px-6 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:shadow-none hover:scale-105 transform disabled:transform-none"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-gray-700/50 animate-slideUp relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Join Session</h3>
                <p className="text-gray-400 text-sm">Enter the 8-character share code</p>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setJoinError('');
                }}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-xl"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Share Code Input */}
              <div>
                <label htmlFor="joinCode" className="block text-sm font-semibold text-gray-300 mb-3">
                  Share Code <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setJoinError('');
                    }}
                    placeholder="e.g., A3B7K9M2"
                    maxLength={8}
                    className="w-full pl-14 pr-5 py-4 bg-gray-900/50 backdrop-blur border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all text-lg font-mono tracking-wider uppercase"
                    autoFocus
                  />
                  {joinCode.length === 8 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Share codes are 8 characters (letters and numbers)
                </p>
                {joinError && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {joinError}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setJoinError('');
                  }}
                  className="flex-1 px-6 py-4 text-base font-semibold text-gray-300 bg-gray-800/50 backdrop-blur rounded-xl hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all border border-gray-700/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinByCode}
                  disabled={joinCode.length !== 8}
                  className="flex-1 px-6 py-4 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-teal-600 rounded-xl hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30 hover:shadow-green-500/50 disabled:shadow-none hover:scale-105 transform disabled:transform-none"
                >
                  Join Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Keyboard Shortcuts Help */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          shortcuts={shortcuts}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
    </div>
  );
};
