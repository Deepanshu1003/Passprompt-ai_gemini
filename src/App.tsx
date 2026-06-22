import React, { useState, useEffect } from 'react';
import PracticeSession from './components/PracticeSession';
import { ExamPlan } from './types';
import { BookOpen, Trash2, ArrowUpRight, FolderHeart, PlusCircle, Sparkles, WifiOff } from 'lucide-react';
import { 
  cachePlans, 
  getCachedPlans, 
  getOrCreateDeviceId, 
  getDeviceName, 
  setDeviceName, 
  setDeviceId 
} from './offlineCache';

// The PromptPass Logo: Fusion of Brain (Mind/AI) and Book (Knowledge)
export const AppLogo = () => (
  <div className="flex items-center">
    <div className="relative flex items-center">
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        {/* Brain Hemisphere Silhouette */}
        <path d="M12 5a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0v-3a5 5 0 0 0-5-5Z" />
        {/* Book Spine Center line */}
        <path d="M12 7v11" stroke="#fff" strokeWidth="1.5" />
        {/* Brain pages inside lines */}
        <path d="M9 10h6M9 13h6M9 16h6" stroke="#fff" strokeWidth="1" opacity="0.7" />
        {/* AI Apex Neural Node */}
        <circle cx="12" cy="4" r="1.2" fill="#38bdf8" stroke="none" />
      </svg>
      <span className="text-xl font-black text-sky-400 -ml-0.5 tracking-tighter font-sans select-none">
        .ai
      </span>
    </div>
  </div>
);

export default function App() {
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

    if (usingCache) {
      setUploadError('Uploading or creating new study rooms is not supported while working offline.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const planTitle = formData.get('plan_title') as string;
    const fileInput = (e.currentTarget.elements.namedItem('question_bank') as HTMLInputElement)?.files?.[0];

    if (!planTitle || !fileInput) {
      setUploadError('Please specify a title and select a files source.');
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-device-id': getOrCreateDeviceId()
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
        // Reset form
        e.currentTarget.reset();
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
              PromptPass
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
                By default, PromptPass isolates your study workspaces to your current active browser/device. 
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
        © 2026 PromptPass .ai — Premium Certification Study Rooms
      </footer>
    </div>
  );
}
