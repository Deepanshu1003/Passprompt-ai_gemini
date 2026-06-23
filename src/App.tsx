import React, { useState, useEffect } from 'react';
import PracticeSession from './components/PracticeSession';
import InterviewPrep from './components/InterviewPrep';
import { ExamPlan } from './types';
import { BookOpen, Trash2, ArrowUpRight, FolderHeart, PlusCircle, Sparkles, WifiOff, Briefcase, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
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
      />
    );
  }

  if (screenMode === 'home') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none items-center justify-center p-6 relative overflow-hidden">
        {/* Soft atmospheric background lights */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-4xl w-full flex flex-col items-center gap-10 z-10">
          {/* Logo element header space */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-650 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase flex items-center justify-center gap-1.5">
                PrepMaster
                <span className="text-xs px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono tracking-widest uppercase">V2.0</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-semibold max-w-md mx-auto mt-3 leading-relaxed">
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
              className="group p-8 rounded-3xl bg-slate-800/60 border-2 border-slate-700/80 hover:border-sky-400 text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-sky-500/10 cursor-pointer flex flex-col justify-between min-h-[300px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-sky-500/5 rounded-full blur-[40px] pointer-events-none transition-all group-hover:bg-sky-500/10"></div>
              
              <div className="flex flex-col gap-5">
                <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2xl w-fit group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-sky-400 transition-colors">
                    Exam Certification Suite
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-2.5 font-medium">
                    Upload practice banks or syllabus notes to formulate adaptive classrooms. Supports single/multi-select option routing, feedback logs, and review rooms.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-sky-400 group-hover:text-sky-300 pt-6">
                <span>Configure & Begin Prep Rooms</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* OPTION B: AI INTERVIEW SUITE */}
            <button
              onClick={() => {
                setScreenMode('interview');
              }}
              className="group p-8 rounded-3xl bg-slate-800/60 border-2 border-slate-700/80 hover:border-indigo-400 text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between min-h-[300px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none transition-all group-hover:bg-indigo-500/10"></div>
              
              <div className="flex flex-col gap-5">
                <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl w-fit group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                  <Briefcase className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">
                    AI Interview Prep Suite
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-2.5 font-medium">
                    Consult with an AI executive prepper coach. Map dynamically configured 11-topic Bento roadmaps, manage companion notes, and evaluate with 10-concept flash quizzes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-indigo-400 group-hover:text-indigo-300 pt-6">
                <span>Open Placement Chamber</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>
          </div>

          <div className="text-slate-500 text-[10px] font-mono font-bold tracking-widest uppercase">
            PrepMaster Engine Sync Status: Online
          </div>
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-850">
      
      {/* RESPONSIVE HEADER BAR */}
      <nav className="bg-slate-900 border-b border-slate-800 text-white py-4 px-4 sm:px-8 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
              PrepMaster
            </h1>
            <span className="text-[9px] font-bold text-sky-400 tracking-widest uppercase">
              Mastery Engine
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 hover:border-slate-600 text-slate-200 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            title="Manage device workspace settings"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>Workspace: {deviceName || 'Generic'} ({deviceId})</span>
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
        <div className="bg-slate-850 text-slate-100 border-b border-slate-700/60 p-5 shadow-inner animate-fade-in">
          <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="max-w-lg">
              <h4 className="font-bold text-slate-200 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <span>🔒 Device Isolation & Cross-Device Sync</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                By default, PrepMaster isolates your study workspaces to your current active browser/device. 
                Want to link your mobile phone, tablet, or another browser? Simply enter the same <strong>Workspace ID</strong> below to instantly pair and synchronize all patterns and progress!
              </p>
            </div>
            
            <div className="flex flex-wrap items-end gap-3 shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Workspace ID (Device Key)</span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl">
                  <span className="text-xs font-mono font-bold text-emerald-400">{deviceId}</span>
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
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none focus:border-sky-500 w-36"
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreenMode('home')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-350 active:bg-slate-300 text-slate-700 hover:text-slate-900 text-xs font-black rounded-xl border border-solid border-slate-300/80 transition-all cursor-pointer group"
            >
              <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>Back to Selection Portal</span>
            </button>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Current Suite</span>
            <span className="text-xs font-extrabold text-sky-600 bg-sky-500/10 px-2.5 py-1 rounded-md uppercase tracking-wide">Exam Certifications</span>
          </div>
        </div>

        {/* WORKSPACES SECTION */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FolderHeart className="w-6 h-6 text-sky-500" /> Active study rooms
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Continue your structured certification revision paths.</p>
            </div>
            <span className="bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1 rounded-full uppercase leading-none mt-1">
              {plans.length} workspaces
            </span>
          </div>

          {usingCache && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-805">
              <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-900">
                <p className="font-bold">Offline Review Mode Enabled</p>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">
                  You are viewing your locally cached study rooms. You can fully review existing question patterns, practice with flashcards, and browse correct answer keys. Uploading new documents or utilizing real-time AI tutor interactions requires internet access.
                </p>
              </div>
            </div>
          )}

          {plans.length === 0 ? (
            <div className="bg-white p-10 sm:p-16 rounded-2xl border-2 border-dashed border-slate-200/80 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm sm:text-base leading-relaxed max-w-md antialiased text-slate-600">
                No active exam rooms. Upload a practice document below to spawn your personalized AI classroom space!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setActivePlanId(plan.id)}
                  className="bg-white p-6 rounded-2xl border border-slate-200/60 cursor-pointer shadow-sm hover:shadow-xl hover:border-sky-300 transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-5 group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-800 text-sm sm:text-base leading-snug group-hover:text-sky-600 transition-colors line-clamp-2">
                        {plan.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                        Uploaded {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, plan.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-all border-none cursor-pointer shrink-0"
                      title="Delete study workspace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
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
        <section className="bg-white border border-slate-200/60 p-6 sm:p-10 rounded-3xl shadow-xl flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-sky-500 animate-pulse" /> Initialize study room
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mt-1">
              Add custom exam question papers in PDF or TXT. Our parser extracts syllabus patterns, configures interactive study lists, and builds automated flashcard decks.
            </p>
          </div>

          <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                Exam Workspace Title
              </label>
              <input
                name="plan_title"
                placeholder="e.g. AWS Solutions Architect (SAA-C03)"
                required
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-sky-400 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                Exam Question Source File
              </label>
              <input
                type="file"
                name="question_bank"
                accept=".pdf,.txt,.text"
                required
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-extrabold file:uppercase file:tracking-wider file:bg-sky-100 file:text-sky-800 hover:file:bg-sky-200 cursor-pointer border border-slate-200 bg-slate-50 p-2 rounded-xl"
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
              className={`sm:col-span-2 py-4 rounded-2xl text-white font-black text-sm sm:text-base border-none transition-all cursor-pointer shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2
                ${isUploading ? 'bg-slate-300 text-slate-500 cursor-wait pointer-events-none shadow-none' : 'bg-slate-900 hover:bg-slate-800'}
              `}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
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
      <footer className="text-center py-6 border-t border-slate-200 text-[11px] font-bold text-slate-400 select-none bg-white">
        © 2026 PrepMaster .ai — Premium Certification Study Rooms
      </footer>
    </div>
  );
}
