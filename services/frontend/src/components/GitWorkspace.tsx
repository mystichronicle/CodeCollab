import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitPanel } from './GitPanel';
import GitFileExplorer from './GitFileExplorer';
import { authAPI } from '../services/api';
import { gitService, GitWorkspace as GitWorkspaceType } from '../services/gitService';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export const GitWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'repos' | 'files'>('repos');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<GitWorkspaceType[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to load user:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const result = await gitService.listWorkspaces();
      if (result.success) {
        setWorkspaces(result.workspaces);
        // Auto-select user's workspace if it exists
        const userWorkspace = result.workspaces.find(w => 
          w.workspace_id === `user-${user?.id}-git-workspace`
        );
        if (userWorkspace) {
          setSelectedWorkspace(userWorkspace.workspace_id);
        }
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400 text-lg">Loading Git Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Use user ID as the workspace identifier
  const workspaceId = `user-${user.id}-git-workspace`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                title="Back to Dashboard"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/50">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 92 92">
                    <path d="M90.156 41.965L50.036 1.848c-2.467-2.467-6.47-2.467-8.937 0l-8.332 8.332 10.562 10.562c2.623-.872 5.63-.292 7.72 1.798 2.102 2.109 2.678 5.134 1.78 7.768l10.185 10.185c2.634-.898 5.659-.322 7.768 1.78 2.93 2.93 2.93 7.678 0 10.607-2.93 2.93-7.678 2.93-10.607 0-2.21-2.21-2.755-5.458-1.64-8.177L48.73 34.899v29.75c.715.346 1.39.808 1.992 1.41 2.93 2.93 2.93 7.678 0 10.607-2.93 2.93-7.678 2.93-10.607 0-2.93-2.93-2.93-7.678 0-10.607.719-.719 1.545-1.293 2.446-1.722V34.28c-.9-.43-1.727-1.004-2.446-1.722-2.223-2.223-2.762-5.486-1.623-8.214L27.83 13.688 1.848 39.67c-2.467 2.467-2.467 6.47 0 8.937l40.12 40.117c2.467 2.467 6.47 2.467 8.937 0l39.95-39.95c2.468-2.467 2.468-6.47.001-8.937" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 bg-clip-text text-transparent">
                  Git Workspace
                </h1>
                <p className="text-xs text-gray-500 font-medium">Manage your repositories</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50 p-1 inline-flex">
          <button
            onClick={() => setActiveTab('repos')}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'repos'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              <span>Repositories</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'files'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>File Browser</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700/50 p-6" style={{ minHeight: '700px' }}>
              {activeTab === 'repos' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Repository Manager</h2>
                  </div>
                  <GitPanel 
                    sessionId={selectedWorkspace || workspaceId} 
                    onCloneSuccess={loadWorkspaces}
                  />
                </div>
              )}
              
              {activeTab === 'files' && (
                <div className="h-full flex flex-col">
                  <h2 className="text-2xl font-bold text-white mb-6">File Browser</h2>
                  {selectedWorkspace ? (
                    <div className="flex-1">
                      <GitFileExplorer sessionId={selectedWorkspace} />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <p className="text-gray-500">Clone a repository to browse files</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700/50 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span>Repositories</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                  {workspaces.length}
                </span>
              </h3>
              
              {workspaces.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">No repositories yet</p>
                  <p className="text-gray-600 text-xs mt-1">Clone a repo to get started</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.workspace_id}
                      onClick={() => setSelectedWorkspace(workspace.workspace_id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedWorkspace === workspace.workspace_id
                          ? 'bg-green-500/20 border-2 border-green-500/50'
                          : 'bg-gray-700/30 border-2 border-gray-600/30 hover:border-gray-500/50 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                            <h4 className="font-semibold text-white text-sm truncate">{workspace.name}</h4>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <span className="truncate">{workspace.branch}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            <span>{workspace.commit_count} commits</span>
                            {workspace.is_dirty && (
                              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                                Modified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 border border-gray-600/50 hover:border-gray-500/50">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Clone Repository</span>
                  </button>
                  <button 
                    onClick={loadWorkspaces}
                    className="w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 border border-gray-600/50 hover:border-gray-500/50"
                  >
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh List</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
