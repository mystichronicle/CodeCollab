import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { sessionsAPI, Session } from '../services/api';

interface Participant {
  id: string;
  username: string;
  color: string;
  cursor?: { line: number; column: number };
}

const languageMap: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust',
  vlang: 'v',
  zig: 'zig',
  elixir: 'elixir',
  java: 'java',
  cpp: 'cpp',
};

const languageColors: Record<string, string> = {
  python: 'from-blue-500 to-blue-600',
  javascript: 'from-yellow-500 to-yellow-600',
  typescript: 'from-blue-400 to-blue-500',
  go: 'from-cyan-500 to-cyan-600',
  rust: 'from-orange-500 to-orange-600',
  vlang: 'from-purple-500 to-purple-600',
  zig: 'from-amber-500 to-amber-600',
  elixir: 'from-purple-400 to-purple-500',
};

export const SessionEditor: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<Session | null>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const cursorDecorationsRef = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session && sessionId) {
      connectWebSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [session, sessionId]);

  // Update cursor decorations when participants change
  useEffect(() => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const decorations: any[] = [];
    
    participants.forEach((participant) => {
      if (participant.cursor && participant.id !== 'self') {
        // Create a cursor decoration with user's name and color
        decorations.push({
          range: {
            startLineNumber: participant.cursor.line,
            startColumn: participant.cursor.column,
            endLineNumber: participant.cursor.line,
            endColumn: participant.cursor.column,
          },
          options: {
            className: `remote-cursor`,
            glyphMarginClassName: 'remote-cursor-glyph',
            hoverMessage: { value: `${participant.username} is here` },
            stickiness: 1,
            zIndex: 1000,
          },
        });
      }
    });
    
    // Apply decorations
    const oldDecorations = Array.from(cursorDecorationsRef.current.values()).flat();
    const newDecorationIds = editor.deltaDecorations(oldDecorations, decorations);
    
    // Update decoration refs
    cursorDecorationsRef.current.clear();
    newDecorationIds.forEach((decorationId: string, index: number) => {
      const participant = participants.filter(p => p.cursor && p.id !== 'self')[index];
      if (participant) {
        cursorDecorationsRef.current.set(participant.id, [decorationId]);
      }
    });
  }, [participants]);

  const loadSession = async () => {
    try {
      const data = await sessionsAPI.get(sessionId!);
      setSession(data);
      setCode(data.code || getDefaultCode(data.language));
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.response?.data?.detail || 'Failed to load session');
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    // Connect to collaboration service using native WebSocket
    const token = localStorage.getItem('access_token');
    const wsUrl = `ws://localhost:8002/ws/${sessionId}`;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Connected to collaboration service');
      // Send join message
      socket.send(JSON.stringify({
        type: 'join-session',
        sessionId: sessionId,
        token: token,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'code-update':
            if (message.userId !== 'self') {
              setCode(message.code);
            }
            break;
          case 'participants-update':
            setParticipants(message.participants);
            break;
          case 'cursor-update':
            setParticipants(prev =>
              prev.map(p => (p.id === message.userId ? { ...p, cursor: message.cursor } : p))
            );
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('Disconnected from collaboration service');
      // Optionally reconnect after a delay
      setTimeout(() => {
        if (session && sessionId) {
          connectWebSocket();
        }
      }, 3000);
    };

    socketRef.current = socket;
  };

  const getDefaultCode = (language: string): string => {
    const defaults: Record<string, string> = {
      python: '# Python code\ndef hello():\n    print("Hello, World!")\n\nhello()\n',
      javascript: '// JavaScript code\nfunction hello() {\n  console.log("Hello, World!");\n}\n\nhello();\n',
      typescript: '// TypeScript code\nfunction hello(): void {\n  console.log("Hello, World!");\n}\n\nhello();\n',
      go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}\n',
      rust: 'fn main() {\n    println!("Hello, World!");\n}\n',
      cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
      c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
      java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
      vlang: 'fn main() {\n\tprintln("Hello, World!")\n}\n',
      zig: 'const std = @import("std");\n\npub fn main() !void {\n    std.debug.print("Hello, World!\\n", .{});\n}\n',
      elixir: 'defmodule Hello do\n  def world do\n    IO.puts("Hello, World!")\n  end\nend\n\nHello.world()\n',
    };
    return defaults[language] || '// Start coding...\n';
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      
      // Emit code change to other participants
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'code-change',
          sessionId: sessionId,
          code: value,
        }));
      }

      // Auto-save after 2 seconds of no typing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveCode(value);
      }, 2000);
    }
  };

  const saveCode = async (codeToSave: string) => {
    if (!sessionId) return;
    
    setIsSaving(true);
    try {
      await sessionsAPI.update(sessionId, { code: codeToSave });
      console.log('Code saved');
    } catch (err) {
      console.error('Failed to save code:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunCode = async () => {
    if (!session) return;
    
    setIsRunning(true);
    setShowOutput(true);
    setOutput('Running code...\n');

    try {
      const response = await fetch('http://localhost:8004/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: session.language,
          code: code,
          timeout: 10,
        }),
      });

      const result = await response.json();
      
      if (result.exit_code === 0) {
        // Success - show stdout, and stderr only if present (as warnings)
        let output = '';
        if (result.stdout) {
          output += `Output:\n${result.stdout}`;
        }
        if (result.stderr) {
          output += output ? '\n\n' : '';
          output += `Warnings:\n${result.stderr}`;
        }
        output += `\n\nExecution time: ${result.execution_time.toFixed(2)}ms`;
        setOutput(output || 'No output');
      } else {
        // Error - show error message
        setOutput(`Error:\n${result.stderr || result.stdout || 'Unknown error'}\n\nExit code: ${result.exit_code}\nExecution time: ${result.execution_time.toFixed(2)}ms`);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      setOutput(`Error: ${err.message || 'Failed to execute code'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    
    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'cursor-move',
          sessionId: sessionId,
          cursor: {
            line: e.position.lineNumber,
            column: e.position.column,
          },
        }));
      }
    });
  };

  const handleLeaveSession = () => {
    if (confirm('Are you sure you want to leave this session?')) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      navigate('/dashboard');
    }
  };

  const handleExport = async () => {
    if (!session || !sessionId) return;
    
    try {
      const blob = await sessionsAPI.export(sessionId);
      
      // Determine file extension
      const extensions: Record<string, string> = {
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        go: 'go',
        rust: 'rs',
        cpp: 'cpp',
        c: 'c',
        java: 'java',
        vlang: 'v',
        zig: 'zig',
        elixir: 'ex'
      };
      
      const ext = extensions[session.language] || 'txt';
      const filename = `${session.name.replace(/\s+/g, '_')}.${ext}`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setOutput(`Code exported successfully as ${filename}`);
      setShowOutput(true);
    } catch (error) {
      console.error('Failed to export session:', error);
      setOutput('Failed to export code. Please try again.');
      setShowOutput(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400 text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The session you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveSession}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${languageColors[session.language] || 'from-gray-600 to-gray-700'} flex items-center justify-center`}>
                <span className="text-2xl">
                  {session.language === 'python' ? '🐍' : 
                   session.language === 'javascript' ? '📜' :
                   session.language === 'typescript' ? '🔷' :
                   session.language === 'go' ? '🐹' :
                   session.language === 'rust' ? '🦀' :
                   session.language === 'vlang' ? '⚡' :
                   session.language === 'zig' ? '⚡' :
                   session.language === 'elixir' ? '💧' : '📝'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{session.name}</h1>
                <p className="text-sm text-gray-400">{session.language}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Share Code */}
            <div className="bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600/50">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Share Code:</span>
                <code className="text-green-400 font-mono text-lg font-bold tracking-wider">
                  {session.share_code || 'N/A'}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.share_code || '');
                    alert('Share code copied to clipboard!');
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Copy share code"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Participants */}
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {participants.slice(0, 5).map((participant) => (
                  <div
                    key={participant.id}
                    className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: participant.color }}
                    title={participant.username}
                  >
                    {participant.username.charAt(0).toUpperCase()}
                  </div>
                ))}
                {participants.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                    +{participants.length - 5}
                  </div>
                )}
              </div>
              <span className="text-gray-400 text-sm">{participants.length} online</span>
            </div>

            {/* Save Status */}
            {isSaving && (
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-blue-400"></div>
                <span className="text-sm">Saving...</span>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
              title="Download code"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
            </button>

            {/* Run Button */}
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                isRunning
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  <span>Running</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  <span>Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Editor and Output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className={`${showOutput ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
          <Editor
            height="100%"
            language={languageMap[session.language] || session.language}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
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

        {/* Output Panel */}
        {showOutput && (
          <div className="w-1/3 border-l border-gray-700 bg-gray-900 flex flex-col">
            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">Output</h3>
              <button
                onClick={() => setShowOutput(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{output}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
