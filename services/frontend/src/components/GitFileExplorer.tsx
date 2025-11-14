import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { gitService, FileTreeItem, GitStatus } from '../services/gitService';

interface GitFileExplorerProps {
  sessionId: string;
}

interface FileWithStatus extends FileTreeItem {
  gitStatus?: 'M' | 'A' | 'D' | '??' | 'R';
  children?: FileWithStatus[];
}

const GitFileExplorer: React.FC<GitFileExplorerProps> = ({ sessionId }) => {
  const [fileTree, setFileTree] = useState<FileWithStatus[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'editor'>('tree');

  useEffect(() => {
    loadFileTree();
    loadGitStatus();
  }, [sessionId]);

  const loadFileTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tree = await gitService.getFileTree(sessionId);
      setFileTree(tree.tree as FileWithStatus[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load file tree');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGitStatus = async () => {
    try {
      const status = await gitService.getStatus(sessionId);
      setGitStatus(status);
      
      // Update file tree with git status
      if (fileTree.length > 0) {
        updateFileTreeWithStatus(fileTree, status);
      }
    } catch (err: any) {
      console.error('Failed to load git status:', err);
    }
  };

  const updateFileTreeWithStatus = (tree: FileWithStatus[], status: GitStatus) => {
    const modifiedSet = new Set(status.modified);
    const untrackedSet = new Set(status.untracked);
    const stagedSet = new Set(status.staged);

    const updateNode = (node: FileWithStatus, path: string = '') => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      
      if (node.type === 'file') {
        if (stagedSet.has(fullPath)) {
          node.gitStatus = 'A';
        } else if (modifiedSet.has(fullPath)) {
          node.gitStatus = 'M';
        } else if (untrackedSet.has(fullPath)) {
          node.gitStatus = '??';
        }
      }
      
      if (node.children) {
        node.children.forEach(child => updateNode(child, fullPath));
      }
    };

    tree.forEach(node => updateNode(node));
    setFileTree([...tree]);
  };

  const handleFileClick = async (filePath: string) => {
    setSelectedFile(filePath);
    setViewMode('editor');
    
    try {
      const content = await gitService.readFile(sessionId, { file_path: filePath });
      setFileContent(content.content);
      setOriginalContent(content.content);
    } catch (err: any) {
      setError(err.message || 'Failed to read file');
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await gitService.writeFile(sessionId, {
        file_path: selectedFile,
        content: fileContent,
      });
      setOriginalContent(fileContent);
      setSuccessMessage('File saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadGitStatus(); // Refresh git status after save
    } catch (err: any) {
      setError(err.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
    }
  };

  const getLanguageFromFilePath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'java': 'java',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sh': 'shell',
      'bash': 'shell',
      'txt': 'plaintext',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const toggleDirectory = (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
    }
    setExpandedDirs(newExpanded);
  };

  const getStatusBadge = (status?: 'M' | 'A' | 'D' | '??' | 'R') => {
    if (!status) return null;

    const badges = {
      'M': { label: 'M', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', tooltip: 'Modified' },
      'A': { label: 'A', color: 'bg-green-500/20 text-green-400 border-green-500/40', tooltip: 'Added' },
      'D': { label: 'D', color: 'bg-red-500/20 text-red-400 border-red-500/40', tooltip: 'Deleted' },
      '??': { label: '??', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', tooltip: 'Untracked' },
      'R': { label: 'R', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', tooltip: 'Renamed' },
    };

    const badge = badges[status];
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold border ${badge.color}`}
        title={badge.tooltip}
      >
        {badge.label}
      </span>
    );
  };

  const renderFileTree = (nodes: FileWithStatus[], path: string = '', level: number = 0): React.ReactNode => {
    return nodes.map((node, index) => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      const isExpanded = expandedDirs.has(fullPath);
      const isSelected = selectedFile === fullPath;

      if (node.type === 'directory') {
        return (
          <div key={`${fullPath}-${index}`} className="animate-fadeIn">
            <div
              onClick={() => toggleDirectory(fullPath)}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-all group"
              style={{ paddingLeft: `${level * 20 + 12}px` }}
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-gray-300 font-medium group-hover:text-white transition-colors">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div className="ml-2">
                {renderFileTree(node.children, fullPath, level + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={`${fullPath}-${index}`}
          onClick={() => handleFileClick(fullPath)}
          className={`flex items-center justify-between px-3 py-2 hover:bg-gray-800/70 rounded-lg cursor-pointer transition-all group ${
            isSelected ? 'bg-purple-500/20 border-l-2 border-purple-500' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 32}px` }}
        >
          <div className="flex items-center space-x-2 flex-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-400 group-hover:text-gray-200'} transition-colors`}>
              {node.name}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {node.gitStatus && getStatusBadge(node.gitStatus)}
            {node.size && (
              <span className="text-xs text-gray-600">{formatBytes(node.size)}</span>
            )}
          </div>
        </div>
      );
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const refresh = async () => {
    await Promise.all([loadFileTree(), loadGitStatus()]);
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden" style={{ height: '650px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">File Explorer</h3>
            {gitStatus && (
              <p className="text-xs text-gray-400">
                Branch: <span className="text-blue-400 font-semibold">{gitStatus.branch}</span>
                {gitStatus.is_dirty && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                    Uncommitted changes
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'tree' ? 'editor' : 'tree')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
            title={viewMode === 'tree' ? 'Show editor view' : 'Show tree view'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {viewMode === 'tree' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              )}
            </svg>
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all disabled:opacity-50"
            title="Refresh"
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {viewMode === 'tree' ? (
          <div className="h-full overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-lg font-semibold">No repository cloned</p>
                <p className="text-sm">Clone a repository to view files</p>
              </div>
            ) : (
              <div className="space-y-1">
                {renderFileTree(fileTree)}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {selectedFile ? (
              <>
                {/* Editor Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-900/50">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <span className="text-white font-semibold">{selectedFile}</span>
                      {fileContent !== originalContent && (
                        <span className="ml-2 text-xs text-yellow-400">● Modified</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveFile}
                      disabled={isSaving || fileContent === originalContent}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          <span>Save</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('tree');
                        setSelectedFile(null);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1" style={{ minHeight: 0 }}>
                  <Editor
                    height="100%"
                    language={getLanguageFromFilePath(selectedFile)}
                    value={fileContent}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      fontSize: 14,
                      minimap: { enabled: true },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      tabSize: 2,
                      insertSpaces: true,
                      formatOnPaste: true,
                      formatOnType: true,
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-semibold">No file selected</p>
                <p className="text-sm">Click a file to edit its contents</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      {gitStatus && (
        <div className="border-t border-gray-700/50 bg-gray-900/50 backdrop-blur px-4 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">Modified:</span>
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-semibold">
                  {gitStatus.modified.length}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">Untracked:</span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-semibold">
                  {gitStatus.untracked.length}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">Staged:</span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded font-semibold">
                  {gitStatus.staged.length}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400">Connected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitFileExplorer;
