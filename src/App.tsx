import React, { useState, useEffect } from 'react';
import PracticeSession from './components/PracticeSession';
import InterviewPrep from './components/InterviewPrep';
import { ExamPlan } from './types';
import { BookOpen, Trash2, ArrowUpRight, FolderHeart, PlusCircle, Sparkles, WifiOff, Briefcase, GraduationCap, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { 
  cachePlans, 
  getCachedPlans, 
  getOrCreateDeviceId, 
  getDeviceName, 
  setDeviceName, 
  setDeviceId,
  getActiveGeminiModel,
  setActiveGeminiModel
} from './offlineCache';

// The PrepMaster Logo: Fusion of Brain (Mind/AI) and Book (Knowledge) with cyber-futuristic styling
export const AppLogo = () => (
  <div className="flex items-center">
    <div className="relative flex items-center group">
      {/* Background radial highlight glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-sky-500/30 via-indigo-500/20 to-emerald-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      <svg
        width="42"
        height="42"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 relative transition-transform duration-700 ease-out group-hover:scale-105"
      >
        <defs>
          <linearGradient id="logoOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" /> {/* Sky 400 */}
            <stop offset="50%" stopColor="#6366f1" /> {/* Indigo 500 */}
            <stop offset="100%" stopColor="#10b981" /> {/* Emerald 500 */}
          </linearGradient>
          <linearGradient id="bookWhiteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient halo background circle */}
        <circle cx="24" cy="24" r="20" fill="url(#auraGlow)" />

        {/* Outer Orbital Frame - Hexagonal Shield representing passing certifications */}
        <path
          d="M24 4L41.32 14V34L24 44L6.68 34V14L24 4Z"
          stroke="url(#logoOuterGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500 group-hover:stroke-indigo-400"
        />

        {/* Floating orbital particles / learning checkpoints */}
        <circle cx="24" cy="4" r="2" fill="#38bdf8" className="animate-pulse" />
        <circle cx="41.32" cy="14" r="1.5" fill="#6366f1" />
        <circle cx="41.32" cy="34" r="1.5" fill="#10b981" />
        <circle cx="24" cy="44" r="2" fill="#38bdf8" className="animate-pulse" />
        <circle cx="6.68" cy="34" r="1.5" fill="#10b981" />
        <circle cx="6.68" cy="14" r="1.5" fill="#6366f1" />

        {/* Symmetrical Book Pages forming the base platform of structured knowledge */}
        {/* Left page block */}
        <path
          d="M24 31.5C19.5 31.5 13.5 28 11.5 27V15.5C13.5 16.5 19.5 20 24 20"
          stroke="url(#bookWhiteGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right page block */}
        <path
          d="M24 31.5C28.5 31.5 34.5 28 36.5 27V15.5C34.5 16.5 28.5 20 24 20"
          stroke="url(#bookWhiteGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Glowing Book Spine */}
        <path d="M24 19.5V33.5" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

        {/* Intricate Brain Hemisphere Network / AI logic node grid hovering above */}
        {/* Synaptic connector paths */}
        <path
          d="M24 9.5L16.5 13M24 9.5L31.5 13M16.5 13L24 16.5M31.5 13L24 16.5M16.5 13V15.5M31.5 13V15.5"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        
        {/* Individual Intelligence nodes */}
        {/* Apex Core Node */}
        <circle cx="24" cy="9.5" r="3" fill="#ffffff" stroke="#6366f1" strokeWidth="1.5" />
        <circle cx="24" cy="9.5" r="1" fill="#38bdf8" />
        
        {/* Left Hemisphere logic node */}
        <circle cx="16.5" cy="13" r="2" fill="#38bdf8" />
        
        {/* Right Hemisphere reasoning node */}
        <circle cx="31.5" cy="13" r="2" fill="#10b981" />
      </svg>

      {/* Cyberpunk styled little .ai badge representing state of the art models */}
      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-[10px] font-black font-mono tracking-wider text-sky-400 select-none uppercase leading-none group-hover:bg-sky-500/20 transition-all">
        .AI
      </span>
    </div>
  </div>
);

export default function App() {
  const [screenMode, setScreenMode] = useState<'home' | 'exam' | 'interview'>('home');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<ExamPlan[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  // Global theme state persisted across rooms and modules
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('prepmaster_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return true; // Default to sleek tech dark mode
  });

  useEffect(() => {
    localStorage.setItem('prepmaster_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Device-based Session Workspace State
  const [deviceId, setDeviceIdState] = useState<string>('');
  const [deviceName, setDeviceNameState] = useState<string>('');
  const [showDeviceSettings, setShowDeviceSettings] = useState<boolean>(false);

  const fetchPlans = async () => {
    try {
      const currentId = getOrCreateDeviceId();
      const res = await fetch('/api/plans', {
        headers: {
          'x-device-id': currentId
        }
      });
      if (res.ok) {
        const list = await res.json();
        setPlans(list);
        cachePlans(list);
        setUsingCache(false);
      } else {
        throw new Error('Server returned error response');
      }
    } catch (err) {
      console.warn('Failed to load study plans, loading from offline cache:', err);
      const cached = getCachedPlans();
      setPlans(cached);
      setUsingCache(true);
    }
  };

  useEffect(() => {
    setDeviceIdState(getOrCreateDeviceId());
    setDeviceNameState(getDeviceName());
    fetchPlans();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);

    const formElement = e.currentTarget;

    if (usingCache) {
      setUploadError('Uploading or creating new study rooms is not supported while working offline.');
      return;
    }

    const formData = new FormData(formElement);
    const planTitle = formData.get('plan_title') as string;
    const fileInput = (formElement.elements.namedItem('question_bank') as HTMLInputElement)?.files?.[0];

    if (!planTitle || !fileInput) {
      setUploadError('Please specify a title and select a files source.');
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-device-id': getOrCreateDeviceId(),
          'x-gemini-model': getActiveGeminiModel()
        },
        body: formData,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned invalid response structure: ${response.status} ${response.statusText}`);
      }

      if (response.ok && data.exam_plan_id) {
        await fetchPlans();
        setActivePlanId(data.exam_plan_id);
        // Reset form safely
        formElement.reset();
      } else {
        setUploadError(data.detail || 'The question bank processing failed. Please check the file contents.');
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Network error communicating with file extraction service.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (usingCache) {
      alert('Deleting study rooms is not supported while working offline.');
      return;
    }

    if (!window.confirm('This will permanently delete this certification study workspace. Proceed?')) {
      return;
    }

    try {
      const res = await fetch(`/api/plans/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-device-id': getOrCreateDeviceId()
        }
      });
      if (res.ok) {
        fetchPlans();
        if (activePlanId === id) {
          setActivePlanId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete study plan:', err);
    }
  };

  if (screenMode === 'interview') {
    return (
      <InterviewPrep
        onBackToHome={() => setScreenMode('home')}
        isDark={isDark}
        setIsDark={setIsDark}
      />
    );
  }

  if (screenMode === 'home') {
    return (
      <div className={`min-h-screen flex flex-col font-sans select-none items-center justify-center p-6 relative overflow-hidden transition-all duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        {/* Soft atmospheric background lights */}
        <div className={`absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-500 ${isDark ? 'bg-sky-500/10' : 'bg-sky-500/5'}`}></div>
        <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-500 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`}></div>
        
        {/* TOP FLOATING TOGGLE ROW */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shadow-md ${isDark ? 'border-slate-850 bg-slate-900 text-amber-400 hover:bg-slate-800' : 'border-slate-200 bg-white text-indigo-600 hover:bg-slate-100'}`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="max-w-4xl w-full flex flex-col items-center gap-10 z-10">
          {/* Logo element header space */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-650 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-5xl font-black tracking-widest uppercase flex items-center justify-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                PrepMaster
                <span className={`text-xs px-2 py-1 rounded font-mono tracking-widest uppercase ${isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-sky-100 border-sky-200 text-sky-700'}`}>V2.0</span>
              </h1>
              <p className={`text-xs md:text-sm font-semibold max-w-md mx-auto mt-3 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Adaptive preparation environments tailored for enterprise certification exams and professional placements.
              </p>
            </div>
          </div>

          {/* DUAL OPTION SELECTION CONTAINER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* OPTION A: EXAM CERTIFICATION SUITE */}
            <button
              onClick={() => {
                setScreenMode('exam');
                fetchPlans(); // Refresh lists.
              }}
              className={`group p-8 rounded-3xl text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[300px] relative overflow-hidden border-2 ${isDark ? 'bg-slate-900/65 border-slate-850 hover:border-sky-400 hover:shadow-sky-500/5' : 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-sky-500/10'}`}
            >
              <div className={`absolute top-0 right-0 w-[120px] h-[120px] rounded-full blur-[40px] pointer-events-none transition-all ${isDark ? 'bg-sky-500/5 group-hover:bg-sky-500/10' : 'bg-sky-500/2 group-hover:bg-sky-500/5'}`}></div>
              
              <div className="flex flex-col gap-5">
                <div className={`p-4 rounded-2xl w-fit transition-all duration-300 ${isDark ? 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white' : 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white'}`}>
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`text-xl md:text-2xl font-black group-hover:text-sky-500 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Exam Certification Suite
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed mt-2.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Upload practice banks or syllabus notes to formulate adaptive classrooms. Supports single/multi-select option routing, feedback logs, and review rooms.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-sky-500 group-hover:text-sky-400 pt-6">
                <span>Configure & Begin Prep Rooms</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* OPTION B: AI INTERVIEW SUITE */}
            <button
              onClick={() => {
                setScreenMode('interview');
              }}
              className={`group p-8 rounded-3xl text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[300px] relative overflow-hidden border-2 ${isDark ? 'bg-slate-900/65 border-slate-850 hover:border-indigo-400 hover:shadow-indigo-500/5' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-indigo-500/10'}`}
            >
              <div className={`absolute top-0 right-0 w-[120px] h-[120px] rounded-full blur-[40px] pointer-events-none transition-all ${isDark ? 'bg-indigo-500/5 group-hover:bg-indigo-500/10' : 'bg-indigo-500/2 group-hover:bg-indigo-500/5'}`}></div>
              
              <div className="flex flex-col gap-5">
                <div className={`p-4 rounded-2xl w-fit transition-all duration-300 ${isDark ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                  <Briefcase className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`text-xl md:text-2xl font-black group-hover:text-indigo-500 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    AI Interview Prep Suite
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed mt-2.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Consult with an AI executive prepper coach. Map dynamically configured Bento roadmaps, manage companion notes, and evaluate with adaptive flash quizzes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-indigo-500 group-hover:text-indigo-400 pt-6">
                <span>Open Placement Chamber</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* No Sync Status */}
        </div>
      </div>
    );
  }

  if (activePlanId) {
    return (
      <PracticeSession
        planId={activePlanId}
        plans={plans}
        onSwitch={(id) => setActivePlanId(id)}
        onBack={() => setActivePlanId(null)}
        isDark={isDark}
        setIsDark={setIsDark}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* RESPONSIVE HEADER BAR */}
      <nav className={`border-b py-4 px-4 sm:px-8 flex items-center justify-between shadow-lg transition-colors ${isDark ? 'bg-slate-900 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className={`text-lg sm:text-xl font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>
              PrepMaster
            </h1>
            <span className="text-[9px] font-bold text-sky-400 tracking-widest uppercase">
              Mastery Engine
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200 hover:text-white' : 'bg-slate-100 hover:bg-slate-150 border-slate-200 text-slate-700'}`}
            title="Manage device workspace settings"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="hidden md:inline">Workspace: {deviceName || 'Generic'} ({deviceId})</span>
            <span className="inline md:hidden">Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-400' : 'border-slate-250 bg-slate-100 hover:bg-slate-200 text-indigo-600'}`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <div className="text-right hidden sm:block">
            <span className="inline-block bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
              AI Tutor Companion
            </span>
          </div>
        </div>
      </nav>

      {/* DEVICE WORKSPACE MANAGER DRAWER / BAR */}
      {showDeviceSettings && (
        <div className={`border-b p-5 shadow-inner animate-fade-in transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
          <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="max-w-lg">
              <h4 className={`font-bold text-xs sm:text-sm mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-250' : 'text-slate-850'}`}>
                <span>🔒 Device Isolation & Cross-Device Sync</span>
              </h4>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
                By default, PrepMaster isolates your study workspaces to your current active browser/device. 
                Want to link your mobile phone, tablet, or another browser? Simply enter the same <strong>Workspace ID</strong> below to instantly pair and synchronize all patterns and progress!
              </p>
            </div>
            
            <div className="flex flex-wrap items-end gap-3 shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Workspace ID (Device Key)</span>
                <div className={`flex items-center gap-2 border px-3 py-2 rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-xs font-mono font-bold text-emerald-500">{deviceId}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      const newId = prompt("Enter a new Workspace ID to switch workspaces or pair this browser with another device:", deviceId);
                      if (newId && newId.trim()) {
                        const trimmed = newId.trim().toUpperCase();
                        setDeviceId(trimmed);
                        setDeviceIdState(trimmed);
                        setTimeout(() => {
                          fetchPlans();
                        }, 50);
                      }
                    }}
                    className="text-[10px] bg-sky-600 hover:bg-sky-500 text-white font-bold px-2 py-1 rounded-lg transition-all border-none cursor-pointer"
                  >
                    Sync / Swap
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Device Custom Label</span>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDeviceNameState(val);
                    setDeviceName(val);
                  }}
                  className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-sky-500 w-36 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-805'}`}
                  placeholder="e.g. My Laptop"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD HERO CONTAINER */}
      <div className="flex-grow max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col gap-10">
        
        {/* SUITE SUB-HEADER & BACK TRIGGER */}
        <div className={`flex items-center justify-between border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreenMode('home')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border border-solid transition-all cursor-pointer group ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 border-slate-300/80'}`}
            >
              <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>Back to Selection Portal</span>
            </button>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Current Suite</span>
            <span className="text-xs font-extrabold text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-md uppercase tracking-wide">Exam Certifications</span>
          </div>
        </div>

        {/* WORKSPACES SECTION */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <FolderHeart className="w-6 h-6 text-sky-500" /> Active study rooms
              </h2>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Continue your structured certification revision paths.</p>
            </div>
            <span className={`font-bold text-xs px-3 py-1 rounded-full uppercase leading-none mt-1 ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
              {plans.length} workspaces
            </span>
          </div>

          {usingCache && (
            <div className={`rounded-2xl p-4 flex items-start gap-3 border ${isDark ? 'bg-amber-950/20 border-amber-950/40 text-amber-300' : 'bg-amber-50 border-amber-200/80 text-amber-905'}`}>
              <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Offline Review Mode Enabled</p>
                <p className={`font-medium mt-0.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-655'}`}>
                  You are viewing your locally cached study rooms. You can fully review existing question patterns, practice with flashcards, and browse correct answer keys. Uploading new documents or utilizing real-time AI tutor interactions requires internet access.
                </p>
              </div>
            </div>
          )}

          {plans.length === 0 ? (
            <div className={`p-10 sm:p-16 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-slate-900/20 border-slate-800 text-slate-400' : 'bg-white border-slate-200/80 text-slate-500'}`}>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className={`font-semibold text-sm sm:text-base leading-relaxed max-w-md antialiased ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                No active exam rooms. Upload a practice document below to spawn your personalized AI classroom space!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setActivePlanId(plan.id)}
                  className={`p-6 rounded-2xl border cursor-pointer shadow-sm hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-5 group ${isDark ? 'bg-slate-900 border-slate-850 hover:border-sky-500' : 'bg-white border-slate-200/60 hover:border-sky-300'}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className={`font-black text-sm sm:text-base leading-snug group-hover:text-sky-500 transition-colors line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {plan.title}
                      </h3>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Uploaded {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, plan.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-all border-none cursor-pointer shrink-0"
                      title="Delete study workspace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`flex items-center justify-between border-t pt-4 mt-auto ${isDark ? 'border-slate-850' : 'border-slate-100'}`}>
                    <span className="text-xs font-bold text-sky-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open Room <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STUDY PLAN FILE INITIALIZER FORM */}
        <section className={`border p-6 sm:p-10 rounded-3xl shadow-xl flex flex-col gap-6 transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/40' : 'bg-white border-slate-200/60 text-slate-850 shadow-slate-200/50'}`}>
          <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <PlusCircle className="w-6 h-6 text-sky-500 animate-pulse" /> Initialize study room
            </h2>
            <p className={`text-xs sm:text-sm font-medium leading-relaxed mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Add custom exam question papers in PDF or TXT. Our parser extracts syllabus patterns, configures interactive study lists, and builds automated flashcard decks.
            </p>
          </div>

          <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={`text-[11px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Exam Workspace Title
              </label>
              <input
                name="plan_title"
                placeholder="e.g. AWS Solutions Architect (SAA-C03)"
                required
                className={`w-full p-3.5 rounded-xl border outline-none font-semibold text-xs sm:text-sm transition-all shadow-inner ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:bg-white'}`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`text-[11px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Exam Question Source File
              </label>
              <input
                type="file"
                name="question_bank"
                accept=".pdf,.txt,.text"
                required
                className={`w-full text-xs file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-extrabold file:uppercase file:tracking-wider file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/25 cursor-pointer border p-2 rounded-xl ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
              />
            </div>

            {uploadError && (
              <div className="sm:col-span-2 p-4 bg-rose-50 border border-solid border-rose-100 rounded-xl text-rose-500 text-xs font-bold leading-normal flex items-start gap-2">
                <Trash2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className={`sm:col-span-2 py-4 rounded-2xl text-white font-black text-sm sm:text-base border-none transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2
                ${isUploading ? 'bg-slate-800 text-slate-500 cursor-wait pointer-events-none shadow-none' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-950/20'}
              `}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-slate-450 border-t-transparent rounded-full animate-spin"></span>
                  STRUCTURING REVISION PATTERNS...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" /> BOOT STUDY DESK
                </span>
              )}
            </button>
          </form>
        </section>
      </div>

      {/* FOOTER */}
      <footer className={`text-center py-6 border-t text-[11px] font-bold select-none transition-colors ${isDark ? 'bg-slate-900 border-slate-850 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
        © 2026 PrepMaster .ai — Premium Certification Study Rooms
      </footer>
    </div>
  );
}
