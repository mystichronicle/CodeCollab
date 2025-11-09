import React, { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
        
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

export const KeyboardShortcutsHelp: React.FC<{ shortcuts: KeyboardShortcut[]; onClose: () => void }> = ({ 
  shortcuts, 
  onClose 
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const formatKey = (shortcut: KeyboardShortcut) => {
    const parts: string[] = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-gray-700/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Keyboard Shortcuts</h3>
            <p className="text-gray-400 text-sm">Master CodeCollab with these shortcuts</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-xl"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-colors"
            >
              <span className="text-gray-300 font-medium">{shortcut.description}</span>
              <kbd className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 shadow-lg">
                {formatKey(shortcut)}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-400">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};
