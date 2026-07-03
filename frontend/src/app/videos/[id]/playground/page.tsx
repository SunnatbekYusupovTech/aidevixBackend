'use client';

// Video dars “playground”: Monaco + Pyodide + HTML preview. i18n / a11y / xavfsizlik uchun
// foydalanuvchi kodi brauzerda bajariladi (ma’lumot uchun sandbox eslatmasi pastda).

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import dynamic from 'next/dynamic';

// Monaco Editor server-side render bo'lmaydi (window API ishlatadi)
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  IoPlay,
  IoRefresh,
  IoBookmark,
  IoShareSocial,
  IoLockClosed,
  IoDocumentText,
  IoChevronForward,
  IoChevronUp,
  IoSettings,
  IoEye,
  IoTime,
} from 'react-icons/io5';
import { FaTerminal, FaCode, FaBook } from 'react-icons/fa';
import { BsLightningChargeFill } from 'react-icons/bs';
import { useVideos } from '@hooks/useVideos';
import { useUserStats } from '@hooks/useUserStats';
import { useSubscription } from '@hooks/useSubscription';
import { selectIsLoggedIn, selectUser } from '@store/slices/authSlice';
import { selectInstagramSub, selectTelegramSub } from '@store/slices/subscriptionSlice';
import { userApi } from '@/api/userApi';
import { videoApi } from '@/api/videoApi';
import SubscriptionGate from '@/components/subscription/SubscriptionGate';
import { useLang } from '@/context/LangContext';
import SiteLogoMark from '@components/common/SiteLogoMark';

interface OutputLine {
  type: 'log' | 'error' | 'info';
  content: string;
}

const SCROLLBAR_STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const DEFAULT_CODES: Record<string, string> = {
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; padding: 20px; margin: 0; }
    h1 { color: #6366f1; text-align: center; margin-top: 30px; font-size: 2rem; }
    .card { background: #1e293b; padding: 25px; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
    p { line-height: 1.6; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello, Aidevix</h1>
    <p>Edit HTML here and see the result in the preview panel.</p>
    <button type="button" style="background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Click me</button>
  </div>
</body>
</html>`,
  python: `# Write your Python code here
print("Hello, Aidevix!")

def greet(name):
    return f"Hello, {name}! Welcome to the playground."

if __name__ == "__main__":
    result = greet("learner")
    print(result)
    age, score = 25, 95.5
    print(f"Age: {age}, Score: {score}")`,
  javascript: `// Write your JavaScript here
console.log("Hello, Aidevix!");

function greet(name) {
  return "Hi, " + name + "!";
}

console.log(greet("learner"));`
};

export default function VideoPlaygroundPage() {
  const { t } = useLang();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { current: video, player, loading, fetchById } = useVideos();
  const { xp } = useUserStats();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);
  const { instagram, telegram, allVerified } = useSubscription();
  const isSubscribed = !!(isLoggedIn && instagram?.subscribed && telegram?.subscribed);
  const [showModal, setShowModal] = useState<boolean>(false);
  const wasSubscribedRef = useRef(isSubscribed);

  const [activeTab, setActiveTab] = useState<'courses' | 'playground'>('playground');
  const [outputTab, setOutputTab] = useState<'terminal' | 'preview'>('terminal');
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);
  const [xpAdded, setXpAdded] = useState(false);
  const [question, setQuestion] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [isCompact, setIsCompact] = useState(false);
  const watchedSecondsRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const sandboxIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isOutputExpanded, setIsOutputExpanded] = useState(true);

  const category = video?.course?.category || 'html';
  const fileName = category === 'html' ? 'index.html' : category === 'javascript' ? 'script.js' : 'main.py';
  const language = category === 'html' ? 'html' : category === 'javascript' ? 'javascript' : 'python';

  // Set initial code when video loads — use ref so user edits are never overwritten
  const initialCodeSetRef = useRef(false);
  useEffect(() => {
    if (video && !initialCodeSetRef.current) {
      initialCodeSetRef.current = true;
      setCode(DEFAULT_CODES[category] || DEFAULT_CODES.html);
      if (category === 'html') setOutputTab('preview');
    }
  }, [video, category]);

  // Load Pyodide for Python — guard: skip if already in DOM, cancel setState on unmount
  useEffect(() => {
    if ((category === 'python' || category === 'ai') && !pyodide && !isPyodideLoading) {
      if (document.getElementById('pyodide-script')) return;
      let cancelled = false;
      setIsPyodideLoading(true);
      const script = document.createElement('script');
      script.id = 'pyodide-script';
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.async = true;
      script.onload = async () => {
        // @ts-ignore
        const py = await window.loadPyodide();
        if (!cancelled) {
          setPyodide(py);
          setIsPyodideLoading(false);
        }
      };
      document.body.appendChild(script);
      return () => {
        cancelled = true;
        try { document.body.removeChild(script); } catch { /* already removed */ }
      };
    }
  }, [category, pyodide, isPyodideLoading]);
 
  // Live HTML Preview
  useEffect(() => {
    if (category === 'html' && code) {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [code, category]);

  // fetchById is recreated each render — stabilise via ref (same pattern as runCodeRef below)
  const fetchByIdRef = useRef(fetchById);
  useEffect(() => { fetchByIdRef.current = fetchById; }, [fetchById]);

  useEffect(() => {
    setIsMounted(true);
    if (id) fetchByIdRef.current(id);
  }, [id]);

  useEffect(() => {
    const updateCompact = () => setIsCompact(window.innerWidth < 1024);
    updateCompact();
    window.addEventListener('resize', updateCompact);
    return () => window.removeEventListener('resize', updateCompact);
  }, []);

  useEffect(() => {
    if (isCompact) {
      setIsSidebarOpen(false);
      setLayoutMode('vertical');
    }
  }, [isCompact]);

  // Track watch progress every 10s and save to backend
  useEffect(() => {
    const courseId = typeof video?.course === 'object' ? video.course?._id : undefined;
    if (!isLoggedIn || !isSubscribed || !id || !courseId) return;
    progressTimerRef.current = setInterval(() => {
      watchedSecondsRef.current += 10;
      videoApi.saveProgress(courseId, id, watchedSecondsRef.current).catch(() => {});
    }, 10_000);
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [id, isLoggedIn, isSubscribed, video?.course]);

  // Obuna bekor qilinganda avtomatik gate ochish
  useEffect(() => {
    if (wasSubscribedRef.current && !isSubscribed && isLoggedIn) {
      setShowModal(true);
    }
    wasSubscribedRef.current = isSubscribed;
  }, [isSubscribed, isLoggedIn]);

  const handleModalSuccess = () => {
    setShowModal(false);
    window.location.reload();
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const runCode = useCallback(async () => {
    setIsRunning(true);

    if (category === 'html') {
      // Live-preview useEffect already keeps previewUrl up-to-date via its own blob URL
      // Creating a second blob URL here would leak the old one — just switch tab
      setOutputTab('preview');
      setOutput([{ type: 'info', content: t('playground.previewUpdated') }]);
      setIsRunning(false);
      return;
    }

    const userLabel = t('playground.shellUser');
    const logs: OutputLine[] = [
      { type: 'info', content: `┌── ${userLabel}:~/` },
      { type: 'info', content: `└─ $ ${language} ${fileName}` }
    ];

    if (category === 'python' || category === 'ai') {
      if (!pyodide) {
        logs.push({ type: 'error', content: t('playground.pyodideNotReady') });
        setOutput(logs);
        setIsRunning(false);
        return;
      }
      try {
        pyodide.runPython(`
          import sys
          import io
          sys.stdout = io.StringIO()
        `);
        await pyodide.runPythonAsync(code);
        const result = pyodide.runPython('sys.stdout.getvalue()');
        result.split('\n').filter((l: string) => l).forEach((l: string) => {
          logs.push({ type: 'log', content: l });
        });
      } catch (err: any) {
        logs.push({ type: 'error', content: err.message });
      }
    } else {
      // Sandboxed iframe — user JS never runs in page global scope
      const iframe = sandboxIframeRef.current;
      if (iframe) {
        const collected: OutputLine[] = [...logs];
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          clearTimeout(tid);
          window.removeEventListener('message', onMsg);
          setOutput(collected);
          setIsRunning(false);
          setOutputTab('terminal');
        };
        const tid = window.setTimeout(() => {
          collected.push({ type: 'error', content: t('playground.sandboxTimeout') || 'Execution timeout (5s)' });
          settle();
        }, 5000);
        const onMsg = (ev: MessageEvent) => {
          if (ev.source !== iframe.contentWindow) return;
          const d = ev.data as { __aidevix?: number; type?: string; content?: string } | null;
          if (!d?.__aidevix) return;
          if (d.type === 'log') collected.push({ type: 'log', content: String(d.content ?? '') });
          else if (d.type === 'error') collected.push({ type: 'error', content: String(d.content ?? '') });
          else if (d.type === 'done') settle();
        };
        window.addEventListener('message', onMsg);
        // encodeURIComponent safely embeds arbitrary user code as URL-encoded text
        const encoded = encodeURIComponent(code);
        iframe.srcdoc = `<!DOCTYPE html><html><body>` +
          `<script>const __s=(t,c)=>parent.postMessage({__aidevix:1,type:t,content:c},'*');` +
          `window.console={` +
          `log:(...a)=>__s('log',a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')),` +
          `error:(...a)=>__s('error',a.map(String).join(' ')),` +
          `warn:(...a)=>__s('log','[warn] '+a.map(String).join(' ')),` +
          `info:(...a)=>__s('log','[info] '+a.map(String).join(' '))};` +
          `window.onerror=(m)=>{__s('error',String(m));__s('done','');return true};<\/script>` +
          `<script id="uc" type="text/plain">${encoded}<\/script>` +
          `<script>try{eval(decodeURIComponent(document.getElementById('uc').textContent));__s('done','');}` +
          `catch(e){__s('error',e.message);__s('done','');}<\/script>` +
          `</body></html>`;
        return; // state updates handled asynchronously by onMsg/settle
      } else {
        logs.push({ type: 'error', content: 'JS sandbox not available' });
      }
    }

    setOutput(logs);
    setIsRunning(false);
    setOutputTab('terminal');
  }, [category, code, fileName, language, pyodide, t]);

  const runCodeRef = useRef(runCode);
  useEffect(() => {
    runCodeRef.current = runCode;
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

  // Called manually when user marks lesson as done (no onEnded in iframe)
  const handleMarkWatched = async () => {
    if (xpAdded || !isLoggedIn) return;
    try {
      await userApi.addVideoWatchXP(id);
      setXpAdded(true);
      toast.success(t('playground.toastXp'));
    } catch {
      // silent
    }
  };

  const handleQuestionSubmit = () => {
    if (!question.trim()) return;
    toast.success(t('playground.toastQuestion'));
    setQuestion('');
  };

  if (!isMounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0e1a]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const courseTitle = video?.course?.title || t('playground.courseFallback');
  const videoTitle = video?.title || t('playground.videoTitleFallback');
  const durationMinutes = video?.duration
    ? Math.max(1, Math.round((video as { duration: number }).duration / 60))
    : 15;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0d0f1a] font-sans text-zinc-100 selection:bg-indigo-500/30">
      <style dangerouslySetInnerHTML={{ __html: SCROLLBAR_STYLE }} />

      <a
        href="#playground-skip-target"
        className="fixed left-4 top-0 z-[200] -translate-y-full border border-white/20 bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition focus:translate-y-4 focus:outline focus:ring-2 focus:ring-indigo-300"
      >
        {t('playground.skipToEditor')}
      </a>

      {/* ── TOP NAVBAR ── */}
      <header className="z-50 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-white/5 bg-[#10121f]/80 px-2 sm:px-4 lg:px-6 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4 lg:gap-6">
          <Link href="/" className="group flex min-w-0 items-center gap-2">
            <SiteLogoMark
              size={36}
              className="shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105 ring-indigo-500/30"
            />
            <span className="truncate bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-base font-black tracking-tight text-transparent sm:text-lg">
              Aidevix <span className="ml-1 hidden text-xs sm:text-sm font-medium uppercase tracking-widest text-indigo-400 sm:inline">{t('playground.brandLab')}</span>
            </span>
          </Link>
          <div className="hidden h-6 w-px bg-white/10 sm:block" aria-hidden />
          <div className="hidden items-center gap-3 sm:flex" aria-live="off">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('playground.liveSession')}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
          <div className="flex items-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 px-2 sm:px-4 py-1.5 sm:py-2">
            <BsLightningChargeFill className="text-yellow-400" size={14} aria-hidden />
            <span className="text-[11px] sm:text-xs font-black text-indigo-100"><span className="sr-only">XP: </span>{xp} XP</span>
          </div>
          <button
            type="button"
            className="hidden sm:flex w-10 h-10 rounded-2xl bg-white/5 border border-white/10 items-center justify-center hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
            aria-label={t('playground.shareAria')}
            disabled
          >
            <IoShareSocial size={18} />
          </button>
          <button
            type="button"
            className="h-8 w-8 sm:h-10 sm:w-10 cursor-pointer rounded-xl sm:rounded-2xl border-0 bg-gradient-to-br from-indigo-500 to-purple-600 p-px transition-transform hover:scale-105"
            aria-label={t('playground.profileAria')}
          >
             <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-[#10121f]">
                <span className="text-xs font-bold text-white">
                  {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </span>
             </div>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative flex flex-1 flex-col overflow-hidden lg:flex-row" aria-label={t('playground.mainLabel')}>
 
        {/* ── LEFT PANEL: Video + Info ── */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              id="playground-lesson-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isCompact ? '100%' : '45%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="scrollbar-hide flex w-full shrink-0 flex-col overflow-y-auto border-white/5 lg:w-auto lg:border-r"
            >

          {/* Breadcrumb */}
          <div className="flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap px-3 sm:px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <span className="hover:text-white cursor-pointer transition-colors shrink-0">{courseTitle}</span>
            <IoChevronForward size={8} className="shrink-0" />
            <span className="text-white truncate">{videoTitle}</span>
          </div>

          {/* Video Player — Bunny.net iframe */}
          <div className="relative mx-3 sm:mx-5 aspect-video shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-black shadow-xl" role="region" aria-label={t('playground.videoRegion')}>
            {player?.embedUrl ? (
              <iframe
                src={player.embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={t('playground.videoTitle')}
              />
            ) : (
              /* Placeholder */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="absolute inset-0 opacity-15 overflow-hidden text-[9px] leading-4 font-mono text-green-400 p-4 select-none pointer-events-none">
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i} className="whitespace-nowrap">
                      {`${String(i + 1).padStart(2, ' ')}  ${['def salom_ber(ism):', '  return f"Salom, {ism}!"', 'foydalanuvchi = "O\'quvchi"', 'print(salom_ber(foydalanuvchi))', 'yosh = 25; bal = 95.5'][i % 5]}`}
                    </div>
                  ))}
                </div>
                <button type="button" className="relative z-10 w-16 h-16 rounded-full bg-primary/80 hover:bg-primary border border-primary/40 flex items-center justify-center shadow-2xl shadow-primary/30 transition-all hover:scale-110" aria-label={t('playground.videoTitle')}>
                  <IoPlay size={22} className="ml-1" aria-hidden />
                </button>
                <p className="relative z-10 text-xs text-zinc-500 mt-3">{t('playground.videoLoading')}</p>
              </div>
            )}
          </div>

          {/* Lesson Title + Actions */}
          <div className="flex flex-col gap-3 sm:gap-4 px-3 sm:px-6 py-4 sm:py-6 shrink-0 border-b border-white/5 bg-white/[0.01]">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">{videoTitle}</h1>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-lg">
                {video?.description || t('playground.lessonFallback')}
              </p>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {xpAdded && (
                  <motion.span 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold px-3 py-1.5 rounded-full"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden />
                    {t('playground.markedXp')}
                  </motion.span>
                )}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  <IoTime className="text-indigo-400" size={12} aria-hidden />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('playground.durationMin', { n: String(durationMinutes) })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button type="button" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-zinc-400 hover:text-white" aria-label={t('playground.resources')}>
                  <IoBookmark size={16} aria-hidden />
                </button>
                {!xpAdded ? (
                  <button 
                    type="button"
                    onClick={handleMarkWatched}
                    className="flex items-center gap-2 px-3 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all text-[11px] sm:text-xs font-bold text-white shadow-lg shadow-indigo-600/20"
                  >
                    <IoPlay size={14} className="fill-current" aria-hidden />
                    {t('playground.markDone')}
                  </button>
                ) : (
                  <div className="px-3 sm:px-5 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] sm:text-xs font-bold" role="status">
                    ✓ {t('playground.completed')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resources + Next Lesson */}
          <div className="flex flex-col gap-3 px-3 sm:px-5 py-4 shrink-0">
            {/* Resources */}
            <div className="bg-[#13152a] border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{t('playground.resources')}</p>
              <div className="grid grid-cols-1 gap-2">
                {(video?.materials?.length ? video.materials : [
                  { name: 'Dars Slaydlari.pdf', url: '#', size: '2MB' },
                  { name: 'Source Code.zip', url: '#', size: '14KB' },
                ]).map((mat: { name: string; url: string; size?: string }, i: number) => (
                  <a
                    key={i}
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                        <IoDocumentText size={12} className="text-primary" />
                      </div>
                      <span className="text-xs text-zinc-300 truncate max-w-[120px] sm:max-w-[180px]">{mat.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">{mat.size || ''}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Next Lesson */}
            <div className="bg-[#13152a] border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{t('playground.nextLesson')}</p>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center shrink-0" aria-hidden>
                  <IoLockClosed size={12} className="text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{t('playground.nextLessonTitle')}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{t('playground.nextLessonMeta')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/courses/${video?.course?._id || ''}`)}
                className="w-full mt-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-[11px] text-zinc-400 hover:text-white transition-colors font-medium"
              >
                {t('playground.viewAllLessons')}
              </button>
            </div>
          </div>

          {/* Q&A */}
          <div className="mx-3 sm:mx-5 mb-5 bg-[#13152a] border border-white/5 rounded-2xl p-3 sm:p-4 shrink-0">
            <h3 className="text-sm font-bold text-white mb-4">
              {t('playground.qa')}
              <span className="text-zinc-500 font-normal text-xs ml-2">(12)</span>
            </h3>
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" aria-hidden />
              <div className="relative flex-1">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 px-4 py-3 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                  rows={2}
                  placeholder={t('playground.qaPlaceholder')}
                  aria-label={t('playground.qaPlaceholder')}
                />
                <button
                  type="button"
                  onClick={handleQuestionSubmit}
                  className="absolute bottom-3 right-3 rounded-lg bg-primary px-4 py-1 text-xs font-bold text-white transition-colors hover:bg-primary/80"
                >
                  {t('playground.qaSubmit')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        )}
        </AnimatePresence>

        {/* Sidebar Toggle Button */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-50 w-8 h-24 bg-[#1a1c2e] border border-white/10 border-l-0 rounded-r-2xl hidden lg:flex flex-col items-center justify-center hover:bg-indigo-600 transition-all group shadow-2xl"
          title={isSidebarOpen ? t('playground.sidebarHide') : t('playground.sidebarShow')}
          aria-expanded={isSidebarOpen}
          aria-controls="playground-lesson-panel"
        >
          <div className="w-1 h-8 bg-white/10 group-hover:bg-white/40 rounded-full mb-1 transition-colors" />
          <IoChevronForward className={`transition-transform duration-500 text-white/50 group-hover:text-white ${isSidebarOpen ? 'rotate-180' : ''}`} size={14} />
          <div className="w-1 h-8 bg-white/10 group-hover:bg-white/40 rounded-full mt-1 transition-colors" />
        </button>

        {/* ── RIGHT PANEL: Code Editor + Terminal ── */}
        <div
          id="playground-skip-target"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          role="region"
          tabIndex={-1}
          aria-label={t('playground.editorRegion')}
        >

          {/* Editor header */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/5 bg-[#1a1c2e] px-2 sm:px-3" role="toolbar" aria-label={t('playground.editorToolbar')}>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 border-b-0 px-3 py-1 rounded-t-lg -mb-[1px]">
                <FaCode className={category === 'html' ? 'text-orange-500' : category === 'javascript' ? 'text-blue-400' : 'text-yellow-400'} size={12} />
                <span className="text-[11px] text-zinc-300 font-medium">{fileName}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setCode(DEFAULT_CODES[category] || DEFAULT_CODES.html)}
                className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-white"
                aria-label={t('playground.reset')}
              >
                <IoRefresh size={12} aria-hidden />
                {t('playground.reset')}
              </button>
              <div className="mx-1 h-3 w-px bg-white/10" aria-hidden />
              {!isCompact && (
              <button 
                type="button"
                onClick={() => setLayoutMode(layoutMode === 'vertical' ? 'horizontal' : 'vertical')}
                className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
                title={t('playground.layoutTitle')}
                aria-pressed={layoutMode === 'horizontal'}
                aria-label={`${t('playground.layoutTitle')}: ${layoutMode === 'vertical' ? t('playground.layoutHoriz') : t('playground.layoutVert')}`}
              >
                <div className={`relative h-3 w-3 overflow-hidden rounded-[2px] border border-current ${layoutMode === 'horizontal' ? 'flex' : 'flex-col'}`} aria-hidden>
                   <div className="flex-1 border-r border-current bg-current opacity-20" />
                   <div className="flex-1" />
                </div>
                {layoutMode === 'vertical' ? t('playground.layoutHoriz') : t('playground.layoutVert')}
              </button>
              )}
              <button type="button" className="text-zinc-500 transition-colors hover:text-white" aria-label={t('playground.settingsAria')} disabled>
                <IoSettings size={14} />
              </button>
            </div>
          </div>

          <div className={`flex-1 flex ${isCompact ? 'flex-col' : layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'} overflow-hidden`}>
            
            {/* Editor Area */}
            <div className={`${!isCompact && layoutMode === 'horizontal' ? 'w-1/2 border-r' : 'flex-1'} min-h-[180px] bg-[#1e1e1e] overflow-hidden border-white/5`}>
              <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 16 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                accessibilitySupport: 'on',
                automaticLayout: true,
              }}
            />
          </div>

          {/* Terminal / Preview */}
          <div
            className={`${!isCompact && layoutMode === 'horizontal' ? 'w-1/2' : (isOutputExpanded ? 'h-[58%] sm:h-[65%]' : 'h-11')} flex shrink-0 flex-col border-t border-white/5 bg-[#080914] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] transition-all duration-300`}
            role="region"
            aria-label={t('playground.outputRegion')}
          >
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/5 bg-[#10121f] px-2 sm:px-4">
              <div className="flex h-full items-center gap-6" role="tablist" aria-label={t('playground.outputRegion')}>
                <button 
                  type="button"
                  role="tab"
                  id="playground-tab-terminal"
                  aria-selected={outputTab === 'terminal'}
                  onClick={() => setOutputTab('terminal')}
                  className={`relative flex h-full items-center gap-2 border-b-2 px-1 transition-all ${outputTab === 'terminal' ? 'border-primary font-bold text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                  <FaTerminal className="text-[10px]" aria-hidden />
                    <span className="text-[10px] uppercase tracking-wide sm:tracking-widest">{t('playground.tabTerminal')}</span>
                  {outputTab === 'terminal' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" aria-hidden />}
                </button>
                {category === 'html' && (
                  <button 
                    type="button"
                    role="tab"
                    id="playground-tab-preview"
                    aria-selected={outputTab === 'preview'}
                    onClick={() => setOutputTab('preview')}
                    className={`relative flex h-full items-center gap-2 border-b-2 px-1 transition-all ${outputTab === 'preview' ? 'border-primary font-bold text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <IoEye className="text-[10px]" aria-hidden />
                    <span className="text-[10px] uppercase tracking-wide sm:tracking-widest">{t('playground.tabPreview')}</span>
                    {outputTab === 'preview' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" aria-hidden />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOutput([])}
                  className="text-zinc-600 transition-colors hover:text-zinc-300"
                  title={t('playground.clearOutput')}
                  aria-label={t('playground.clearOutput')}
                >
                  <IoRefresh size={12} />
                </button>
                <div className="mx-1 h-3 w-px bg-white/10" aria-hidden />
                <button
                  type="button"
                  onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                  className="text-zinc-600 transition-all hover:scale-110 hover:text-white active:scale-95"
                  title={isOutputExpanded ? t('playground.collapsePanel') : t('playground.expandPanel')}
                  aria-expanded={isOutputExpanded}
                  aria-label={isOutputExpanded ? t('playground.collapsePanel') : t('playground.expandPanel')}
                >
                  <IoChevronUp className={`transition-transform duration-300 ${isOutputExpanded ? 'rotate-180' : ''}`} size={14} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden px-4 py-3 font-mono text-xs" role="tabpanel" id="playground-output-panel" aria-labelledby={outputTab === 'terminal' ? 'playground-tab-terminal' : 'playground-tab-preview'}>
              {outputTab === 'terminal' ? (
                <div
                  ref={terminalRef}
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                  aria-atomic="false"
                  className="custom-scrollbar absolute inset-0 overflow-y-auto px-4 py-3"
                >
                  <AnimatePresence>
                    {output.map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={
                          line.type === 'error'
                            ? 'text-red-400 mb-0.5'
                            : line.type === 'info'
                            ? 'text-zinc-500 mb-0.5'
                            : 'text-green-400 mb-0.5'
                        }
                      >
                        {line.type === 'log' && <span className="text-zinc-600 mr-2">»</span>}
                        {line.content}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isRunning && (
                    <span className="text-xs text-zinc-500 animate-pulse" aria-live="polite">{t('playground.running')}</span>
                  )}
                  {isPyodideLoading && (
                    <span className="text-xs text-indigo-400 animate-pulse" aria-live="polite">{t('playground.pyodideLoading')}</span>
                  )}
                  <div ref={terminalEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col bg-[#0f172a] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  {/* Browser Header Emulator */}
                  <div className="h-8 shrink-0 bg-white/5 border-b border-white/5 flex items-center px-4 justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex-1 max-w-[220px] sm:max-w-[300px] mx-2 sm:mx-4 h-5 bg-black/20 rounded-md flex items-center px-3">
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-indigo-500/20" />
                      </div>
                    </div>
                    <div className="w-10" />
                  </div>
                  
                  {/* Iframe */}
                  <div className="flex-1 bg-white overflow-hidden">
                    <iframe
                      src={previewUrl}
                      className="h-full w-full border-none"
                      title={t('playground.previewTitle')}
                      scrolling="yes"
                      sandbox="allow-scripts allow-same-origin"
                      style={{ minHeight: '100%', display: 'block' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RUN CODE button */}
            <p className="px-2 pb-1 text-center text-[10px] text-zinc-500 sm:px-3">{t('playground.sandboxNote')}</p>
            <div className="shrink-0 px-2 pb-2 sm:px-3 sm:pb-3">
              <button
                type="button"
                onClick={runCode}
                disabled={isRunning}
                aria-busy={isRunning}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-black tracking-widest text-black shadow-lg shadow-green-500/20 transition-all hover:bg-green-400 disabled:opacity-50"
              >
                <IoPlay size={16} aria-hidden />
                {t('playground.runCodeButton')}
              </button>
              <p className="mt-1 text-center text-[10px] text-zinc-500">{t('playground.runShortcut')}</p>
            </div>
          </div>
        </div>
        </div>
      </main>
      {/* Subscription Overlay */}
      {!isSubscribed && (
        <div className="absolute inset-x-0 bottom-0 top-14 z-[100] backdrop-blur-md bg-black/40 flex items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1a1c2e] border border-white/10 p-5 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-md"
          >
            <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6">
              <IoLockClosed size={32} className="text-indigo-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{t('playground.gateTitle')}</h2>
            <p className="text-zinc-400 text-sm sm:text-base mb-6 sm:mb-8">
              {t('playground.gateBody')}
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn btn-primary h-11 w-full rounded-full border-none bg-indigo-500 px-5 text-sm font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 sm:h-14 sm:px-10 sm:text-lg"
            >
              {t('playground.gateCta')}
            </button>
            <Link 
              href={`/videos/${id}`}
              className="mt-4 inline-block text-sm font-medium text-zinc-500 transition-colors hover:text-white"
            >
              ← {t('playground.backToLesson')}
            </Link>
          </motion.div>
        </div>
      )}

      {/* Hidden sandbox iframe for safe JS execution (QF-008) */}
      <iframe
        ref={sandboxIframeRef}
        sandbox="allow-scripts"
        title="js-sandbox"
        aria-hidden="true"
        style={{ display: 'none', width: 0, height: 0, position: 'absolute', border: 'none' }}
      />

      {/* Instagram Verification Modal */}
      <SubscriptionGate
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        videoId={id}
      />
    </div>
  );
}
