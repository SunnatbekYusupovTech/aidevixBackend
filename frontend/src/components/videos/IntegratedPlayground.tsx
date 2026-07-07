'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoPlay, IoRefresh, IoCodeSlash, IoTerminal, IoEye, IoChevronDown, IoChevronUp, IoExpand } from 'react-icons/io5';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';

interface IntegratedPlaygroundProps {
  videoId: string;
  category?: string;
  initialCode?: string;
}

declare global {
  interface Window {
    loadPyodide: (opts?: { indexURL?: string }) => Promise<unknown>;
  }
}

function getDefaultCodeForCategory(category: string): string {
  if (category === 'html' || category === 'css') {
    return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background: #111726; color: white; padding: 20px; }
  h1 { color: #6366f1; }
</style>
</head>
<body>
  <h1>Hello, Aidevix</h1>
  <p>Write HTML here; run to update the preview.</p>
</body>
</html>`;
  }
  if (category === 'javascript' || category === 'nodejs') {
    return `// Write your JavaScript here
console.log("Hello, Aidevix!");
function greet(name) {
  return "Hi, " + name;
}
console.log(greet("learner"));`;
  }
  return `# Write your Python here
print("Hello, Aidevix!")

def greet(name):
    return f"Hi, {name}!"

print(greet("learner"))`;
}

export default function IntegratedPlayground({ videoId, category = 'html', initialCode }: IntegratedPlaygroundProps) {
  const { t } = useLang();
  const [code, setCode] = useState(initialCode || '');
  const [output, setOutput] = useState<{ type: 'log' | 'error' | 'info'; content: string }[]>([]);
  const [viewTab, setViewTab] = useState<'terminal' | 'preview'>('terminal');
  const [isExpanded, setIsExpanded] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [pyodide, setPyodide] = useState<unknown>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runCodeRef = useRef<() => void>(() => {});

  useEffect(() => {
    if ((category === 'python' || category === 'ai') && !pyodide && !isPyodideLoading) {
      setIsPyodideLoading(true);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.async = true;
      script.onload = async () => {
        const api = (window as unknown as { loadPyodide: Window['loadPyodide'] }).loadPyodide;
        const py = await api();
        setPyodide(py);
        setIsPyodideLoading(false);
      };
      document.body.appendChild(script);
    }
  }, [category, pyodide, isPyodideLoading]);

  useEffect(() => {
    if (!initialCode) {
      setCode(getDefaultCodeForCategory(category));
    }
  }, [category, initialCode]);

  const runCode = useCallback(async () => {
    setOutput([{ type: 'info', content: t('playground.running') }]);

    if (category === 'html' || category === 'css') {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setViewTab('preview');
      setOutput([{ type: 'log', content: t('playground.previewUpdated') }]);
      return;
    }

    if (category === 'python' || category === 'ai') {
      if (!pyodide) {
        setOutput([{ type: 'error', content: t('playground.pyodideNotReady') }]);
        return;
      }
      const py = pyodide as {
        runPython: (c: string) => unknown;
        runPythonAsync: (c: string) => Promise<void>;
      };
      try {
        py.runPython(`
          import sys
          import io
          sys.stdout = io.StringIO()
        `);
        await py.runPythonAsync(code);
        const result = String(py.runPython('sys.stdout.getvalue()'));
        setOutput(
          result
            .split('\n')
            .filter((l: string) => l)
            .map((l: string) => ({ type: 'log' as const, content: l })),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setOutput([{ type: 'error', content: message }]);
      }
      return;
    }

    if (category === 'javascript' || category === 'nodejs') {
      const logs: { type: 'log' | 'error' | 'info'; content: string }[] = [];
      const oldLog = console.log;
      try {
        console.log = (...args: unknown[]) => logs.push({ type: 'log', content: args.map(String).join(' ') });
        const fn = new Function(code);
        fn();
        setOutput(logs.length ? logs : [{ type: 'info', content: t('playground.outputEmpty') }]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setOutput([{ type: 'error', content: message }]);
      } finally {
        console.log = oldLog;
      }
    }
  }, [category, code, pyodide, t]);

  useEffect(() => {
    runCodeRef.current = () => {
      void runCode();
    };
  }, [runCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCodeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const applyDefaultCode = () => {
    setCode(getDefaultCodeForCategory(category));
  };

  const resetCode = () => {
    if (typeof window !== 'undefined' && !window.confirm(t('playground.resetConfirm'))) {
      return;
    }
    applyDefaultCode();
    setOutput([]);
  };

  const language = category === 'html' || category === 'css' ? 'html' : category === 'javascript' || category === 'nodejs' ? 'javascript' : 'python';

  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/5 bg-[#111726] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400" aria-hidden>
            <IoCodeSlash size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">{t('playground.integratedTitle')}</h3>
            <p className="text-[10px] font-medium text-slate-500">{t('playground.integratedSubtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/videos/${videoId}/playground`}
            className="group flex items-center gap-2 rounded-xl bg-indigo-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400 transition-all hover:bg-indigo-500/20"
            aria-label={t('playground.fullScreen')}
          >
            <IoExpand size={14} className="transition-transform group-hover:scale-110" aria-hidden />
            {t('playground.fullScreen')}
          </Link>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('playground.collapsePanel') : t('playground.expandPanel')}
          >
            {isExpanded ? <IoChevronUp /> : <IoChevronDown />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid h-[500px] grid-cols-1 lg:grid-cols-2">
              <div className="flex h-full flex-col border-r border-white/5">
                <div className="flex h-10 items-center border-b border-white/5 bg-[#0A0E1A] px-4" role="toolbar" aria-label={t('playground.editorToolbar')}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">{t('playground.tabEditor')}</span>
                </div>
                <div className="min-h-0 flex-1">
                  <Editor
                    height="100%"
                    defaultLanguage={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      padding: { top: 10 },
                      backgroundColor: '#111726',
                      accessibilitySupport: 'on',
                      automaticLayout: true,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 bg-[#0A0E1A] p-4">
                  <button
                    type="button"
                    onClick={resetCode}
                    className="p-2 text-slate-500 transition-colors hover:text-white"
                    aria-label={t('playground.reset')}
                  >
                    <IoRefresh size={20} />
                  </button>
                  <div className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void runCode();
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600 active:scale-95"
                    >
                      <IoPlay size={18} aria-hidden />
                      {t('playground.runCodeButton')}
                    </button>
                    <Link
                      href={`/videos/${videoId}/playground`}
                      className="flex w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 py-3 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                      aria-label={t('playground.fullScreen')}
                    >
                      <IoExpand size={18} />
                    </Link>
                  </div>
                </div>
                <p className="bg-[#0A0E1A] px-4 pb-2 text-center text-[10px] text-slate-500">{t('playground.runShortcut')}</p>
              </div>

              <div className="flex h-full flex-col bg-[#0A0E1A]">
                <div className="h-10 border-b border-white/5 px-2">
                  <div className="flex" role="tablist" aria-label={t('playground.outputRegion')}>
                    <button
                      type="button"
                      role="tab"
                      id="ig-tab-terminal"
                      aria-selected={viewTab === 'terminal'}
                      onClick={() => setViewTab('terminal')}
                      className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        viewTab === 'terminal' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <IoTerminal className="text-[10px]" aria-hidden />
                        {t('playground.tabTerminal')}
                      </span>
                    </button>
                    {(category === 'html' || category === 'css') && (
                      <button
                        type="button"
                        role="tab"
                        id="ig-tab-preview"
                        aria-selected={viewTab === 'preview'}
                        onClick={() => setViewTab('preview')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                          viewTab === 'preview' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <IoEye className="text-[10px]" aria-hidden />
                          {t('playground.tabPreview')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="relative flex-1 overflow-auto p-4 font-mono text-sm"
                  role="tabpanel"
                  aria-labelledby={viewTab === 'terminal' ? 'ig-tab-terminal' : 'ig-tab-preview'}
                >
                  {viewTab === 'terminal' ? (
                    <div className="space-y-1" role="log" aria-live="polite" aria-relevant="additions">
                      {output.length === 0 && <p className="italic text-slate-600">{t('playground.outputEmpty')}</p>}
                      {output.map((line, i) => (
                        <div
                          key={i}
                          className={
                            line.type === 'error' ? 'text-red-400' : line.type === 'info' ? 'text-indigo-400' : 'text-green-400'
                          }
                        >
                          {line.type === 'log' && <span className="mr-2 text-slate-600">»</span>}
                          {line.content}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <iframe
                      ref={iframeRef}
                      src={previewUrl}
                      className="h-full w-full rounded-lg bg-white"
                      title={t('playground.previewTitle')}
                      sandbox="allow-scripts allow-same-origin"
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
