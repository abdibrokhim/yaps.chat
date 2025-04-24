'use client'

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, DownloadCloud, Terminal } from "lucide-react";
import { logger } from "@/lib/logger";
import useClickOutside from "@/hooks/use-click-outside";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  message: string;
  data?: any;
  timestamp: string;
  level: LogLevel;
  component: string;
}

export const LogViewer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useClickOutside(scrollRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  useEffect(() => {
    // Get logs every second
    const interval = setInterval(() => {
      if (isOpen) {
        setLogs(logger.getLogs());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    // Scroll to bottom when logs change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  // Filter logs based on level
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  // Download logs as JSON
  const handleDownloadLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleLogViewer = () => {
    setIsOpen(!isOpen);
  };

  // Render only the button if closed
  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 right-20 cursor-pointer z-50 dark:bg-zinc-950 bg-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
        onClick={toggleLogViewer}
      >
        <Terminal className="h-5 w-5" />
      </Button>
    );
  }

  // Get log level color
  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug': return 'text-zinc-500';
      case 'info': return 'text-green-500';
      case 'warn': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rounded-lg bg-white dark:bg-zinc-900 w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div className="sticky top-0 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <h2 className="font-semibold text-zinc-900 dark:text-white">Debug Logs</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {filteredLogs.length} entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select 
              className="p-1 outline-none text-xs rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
            >
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleDownloadLogs}
              title="Download logs"
              className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
            >
              <DownloadCloud className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              title="Close"
              className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2 font-mono text-xs">
            {filteredLogs.map((log, index) => (
              <div key={index} className="border border-zinc-200 dark:border-zinc-800 rounded p-2">
                <div className="flex gap-2 mb-1">
                  <span className={`font-bold ${getLogLevelColor(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    [{log.component}]
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="pl-2 border-l-2 border-zinc-200 dark:border-zinc-700">
                  <div className="text-zinc-900 dark:text-white">{log.message}</div>
                  {log.data && (
                    <pre className="mt-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded text-[10px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                      {typeof log.data === 'object' 
                        ? JSON.stringify(log.data, null, 2) 
                        : String(log.data)
                      }
                    </pre>
                  )}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}; 