import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Briefcase, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  X, 
  StickyNote, 
  BookOpen, 
  HelpCircle, 
  Trophy, 
  TrendingUp, 
  RefreshCw, 
  FileText, 
  Layout, 
  MessageSquare, 
  ChevronRight,
  Database,
  Info,
  ChevronLeft,
  GraduationCap
} from 'lucide-react';
import { InterviewPlan, InterviewTopicDetails, InterviewQuizScore, ChatMessage } from '../types';
import { getOrCreateDeviceId, getActiveGeminiModel } from '../offlineCache';

interface InterviewPrepProps {
  onBackToHome: () => void;
}

export default function InterviewPrep({ onBackToHome }: InterviewPrepProps) {
  // Metadata states
  const [deviceId] = useState<string>(getOrCreateDeviceId());
  const [plans, setPlans] = useState<InterviewPlan[]>([]);
  const [activePlan, setActivePlan] = useState<InterviewPlan | null>(null);
  
  // Target active screen page
  const [interviewScreen, setInterviewScreen] = useState<'plan' | 'bento' | 'topic'>('plan');
  
  // Creation form states
  const [targetRole, setTargetRole] = useState('Senior Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Senior');
  const [customPlanText, setCustomPlanText] = useState('');
  
  // UI states
  const [navTab, setNavTab] = useState<'build' | 'plans'>('build');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  
  // Selected visual topic details
  const [selectedTopic, setSelectedTopic] = useState<InterviewTopicDetails | null>(null);
  const [topicNotes, setTopicNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Custom Topic-Quiz state
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]); // 10 questions
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null);
  const [isQuizAnswerSubmitted, setIsQuizAnswerSubmitted] = useState(false);
  const [quizScoreCounter, setQuizScoreCounter] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<InterviewQuizScore[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Load plans on mount
  useEffect(() => {
    fetchInterviewPlans();
  }, [deviceId]);

  // Sync active plan with backend / local saving when topics or scores change
  const fetchInterviewPlans = async () => {
    try {
      const res = await fetch('/api/interview/plans', {
        headers: { 'x-device-id': deviceId }
      });
      if (res.ok) {
        const list = await res.json();
        setPlans(list);
        if (list.length > 0 && !activePlan) {
          // select latest plan by default
          const sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setActivePlan(sorted[0]);
          setChatLog(sorted[0].chat_history || []);
          setScoreHistory(sorted[0].scores || []);
        }
      }
    } catch (err) {
      console.error('Failed to load interview plans:', err);
    }
  };

  const handleCreateNewSyllabus = () => {
    setActivePlan(null);
    setChatLog([]);
    setScoreHistory([]);
    setCustomPlanText('');
    setSelectedTopic(null);
    setQuizQuestions([]);
    setNavTab('build');
    setInterviewScreen('plan');
  };

  const handleSavePlanToDb = async (updatedPlan: InterviewPlan) => {
    try {
      const res = await fetch('/api/interview/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify(updatedPlan)
      });
      if (res.ok) {
        const saved = await res.json();
        // Update local arrays
        setPlans(prev => prev.map(p => p.id === saved.id ? saved : p));
        setActivePlan(saved);
      }
    } catch (err) {
      console.error('Failed to save plan to database:', err);
    }
  };

  // Conversational consultant handle
  const handleConsultChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageInput.trim() || isConsulting) return;

    const userMsg = chatMessageInput.trim();
    setChatMessageInput('');
    setIsConsulting(true);

    const updatedLog: ChatMessage[] = [...chatLog, { role: 'user', content: userMsg }];
    setChatLog(updatedLog);

    try {
      const res = await fetch('/api/interview/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          chat_history: updatedLog.slice(0, -1),
          user_message: userMsg,
          role: targetRole,
          experience_level: experienceLevel
        })
      });

      if (!res.ok) throw new Error('Streaming connection failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';

      setChatLog(prev => [...prev, { role: 'ai', content: '' }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                aiResponseText += data.text;
                setChatLog(prev => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'ai') {
                    last.content = aiResponseText;
                  }
                  return copy;
                });
              }
            } catch {}
          }
        }
      }

      // If activePlan already exists, update chat log inside plan
      if (activePlan) {
        const finalPlan: InterviewPlan = {
          ...activePlan,
          chat_history: [...updatedLog, { role: 'ai' as const, content: aiResponseText }]
        };
        await handleSavePlanToDb(finalPlan);
      }

    } catch (err: any) {
      console.error('Chat consult failed:', err);
      setChatLog(prev => [...prev, { role: 'ai', content: `Sorry, there was an issue contacting the virtual coach: ${err.message || err}` }]);
    } finally {
      setIsConsulting(false);
    }
  };

  // Build / Finalize Topics Bento grid
  const handleFinalizeSyllabusSchedules = async () => {
    setIsGenerating(true);
    setSelectedTopic(null);
    setQuizQuestions([]);

    // Collect any specification guidelines from the chat log
    const chatInstructions = chatLog.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const customInstructionSet = `${customPlanText}\n\nChat coaching directives:\n${chatInstructions}`;

    try {
      const res = await fetch('/api/interview/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          role: targetRole,
          experience_level: experienceLevel,
          custom_notes: customInstructionSet
        })
      });

      if (!res.ok) throw new Error('Topic generation request failed.');

      const topics = await res.json();
      
      const newPlan: InterviewPlan = {
        id: activePlan?.id || crypto.randomUUID(),
        device_id: deviceId,
        role: targetRole,
        experience_level: experienceLevel,
        created_at: new Date().toISOString(),
        finalized: true,
        chat_history: chatLog,
        topics: topics,
        scores: scoreHistory
      };

      await handleSavePlanToDb(newPlan);
      setActivePlan(newPlan);
      // Re-fetch all plans to update sidebar selection
      await fetchInterviewPlans();
      setInterviewScreen('bento');

    } catch (err) {
      console.error('Failed to finalize interview schedule bento:', err);
      alert('Failed to generate customized syllabus. Using robust default topics mapping');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Topic Notes (Notes memory / Structured semantic memory)
  const handleSaveNotesMemory = async () => {
    if (!activePlan || !selectedTopic) return;
    setIsSavingNotes(true);

    const updatedTopics = activePlan.topics.map(t => {
      if (t.id === selectedTopic.id) {
        return { ...t, notes: topicNotes };
      }
      return t;
    });

    const updatedPlan = {
      ...activePlan,
      topics: updatedTopics
    };

    await handleSavePlanToDb(updatedPlan);
    setSelectedTopic(prev => prev ? { ...prev, notes: topicNotes } : null);
    setIsSavingNotes(false);
  };

  // Toggle Topic Completed State
  const handleToggleTopicCompleted = async (topicId: string) => {
    if (!activePlan) return;

    const updatedTopics = activePlan.topics.map(t => {
      if (t.id === topicId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    const updatedPlan = {
      ...activePlan,
      topics: updatedTopics
    };

    await handleSavePlanToDb(updatedPlan);
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic(prev => prev ? { ...prev, completed: !prev.completed } : null);
    }
  };

  // Quiz initiation
  const handleStartTopicQuiz = async (topic: InterviewTopicDetails) => {
    setIsQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setSelectedQuizAnswer(null);
    setIsQuizAnswerSubmitted(false);
    setQuizScoreCounter(0);
    setShowQuizResult(false);

    try {
      const res = await fetch('/api/interview/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          role: activePlan?.role || targetRole,
          topic_name: topic.name
        })
      });

      if (res.ok) {
        const questions = await res.json();
        setQuizQuestions(questions);
      } else {
        throw new Error('Failed to fetch customized quiz questions');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching quiz. Loading localized safety questions.');
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleSelectQuizAnswer = (letter: string) => {
    if (isQuizAnswerSubmitted) return;
    setSelectedQuizAnswer(letter);
  };

  const handleSubmitQuizAnswer = () => {
    if (!selectedQuizAnswer || isQuizAnswerSubmitted) return;
    setIsQuizAnswerSubmitted(true);

    const currentQuestion = quizQuestions[currentQuizIndex];
    if (selectedQuizAnswer === currentQuestion.correct_answer) {
      setQuizScoreCounter(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedQuizAnswer(null);
      setIsQuizAnswerSubmitted(false);
    } else {
      // Quiz complete! Record Episodic memory logs
      setShowQuizResult(true);
      recordQuizScoreToMemory();
    }
  };

  const recordQuizScoreToMemory = async () => {
    if (!activePlan || !selectedTopic) return;

    const newScore: InterviewQuizScore = {
      topic_id: selectedTopic.id,
      score: quizScoreCounter,
      total: quizQuestions.length,
      date: new Date().toISOString()
    };

    const updatedScores = [...(activePlan.scores || []), newScore];
    setScoreHistory(updatedScores);

    const updatedPlan = {
      ...activePlan,
      scores: updatedScores
    };

    await handleSavePlanToDb(updatedPlan);
  };

  const handleSelectPlan = (plan: InterviewPlan) => {
    setActivePlan(plan);
    setChatLog(plan.chat_history || []);
    setScoreHistory(plan.scores || []);
    setSelectedTopic(null);
    setQuizQuestions([]);
    setNavTab('plans');
    setInterviewScreen('bento');
  };

  // PAGE 1: PREPARE AND CONSULT A NEW PLAN OR LOAD AN EXISTING COHERENT PLAN
  const renderPlanScreen = () => {
    return (
      <div className="flex-grow max-w-6xl mx-auto w-full px-4 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: CONFIG & AI CONSULTING COACH */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2.5 py-0.5 rounded uppercase font-black tracking-wide mb-2 inline-block font-mono">1. Career Planner</span>
              <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" /> Syllabus Design Room
              </h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-1">
                Configure your target profession &amp; experience tier. Chat naturally with the AI Prep Coach to include technology segments, then launch your bento schedule roadmap.
              </p>
            </div>

            {/* TARGET SECTOR FORM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target profession</span>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none p-3 rounded-xl text-xs sm:text-sm font-bold text-slate-200"
                  placeholder="e.g. Senior Software Architect"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience levels</span>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none p-3 rounded-xl text-xs sm:text-sm font-bold text-slate-200 cursor-pointer"
                >
                  <option value="Junior">Junior (0-2 YOE)</option>
                  <option value="Mid-Level">Mid-Level (2-5 YOE)</option>
                  <option value="Senior">Senior (5-8 YOE)</option>
                  <option value="Lead/Principal">Principal/Lead (8+ YOE)</option>
                </select>
              </div>
            </div>

            {/* SYLLABUS DISCOVERY */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between items-center">
                <span>Upload / Paste Preparation Syllabus (Optional)</span>
              </span>
              <textarea
                value={customPlanText}
                onChange={(e) => setCustomPlanText(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none p-3 rounded-xl text-xs font-semibold text-slate-300 h-20 resize-none leading-relaxed"
                placeholder="Paste customized guidelines, key system architectures, or previous schedules..."
              />
            </div>

            {/* CHAT CHANNELS */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Coach Consulting conversation</span>
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 h-32 overflow-y-auto flex flex-col gap-3 leading-relaxed text-xs">
                {chatLog.length === 0 ? (
                  <p className="text-slate-500 font-medium italic text-center my-auto">Propose custom technology domains to the Coach to customize details dynamically!</p>
                ) : (
                  chatLog.map((chat, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded-xl max-w-[90%] font-semibold ${
                        chat.role === 'user' 
                          ? 'bg-sky-500/10 text-sky-450 self-end border border-sky-500/20' 
                          : 'bg-slate-900 text-slate-350 self-start border border-slate-800'
                      }`}
                    >
                      <span className="text-[9px] block opacity-40 font-black mb-1">
                        {chat.role === 'user' ? 'STUDENT' : 'COACH ARCHITECT'}
                      </span>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.content}</ReactMarkdown>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleConsultChat} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={chatMessageInput}
                  onChange={(e) => setChatMessageInput(e.target.value)}
                  placeholder="Ask Coach to add specific frameworks, testing methodologies..."
                  className="flex-grow bg-slate-950 border border-slate-800 focus:border-sky-550 focus:outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-200"
                />
                <button
                  type="submit"
                  disabled={isConsulting}
                  className="bg-slate-800 hover:bg-slate-750 text-sky-400 p-2.5 rounded-xl border-none cursor-pointer"
                >
                  {isConsulting ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>

            {/* FINALIZE DISCOVERY ACT */}
            <button
              type="button"
              onClick={handleFinalizeSyllabusSchedules}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-black text-xs sm:text-sm border-none transition-all cursor-pointer flex items-center justify-center gap-2 tracking-wider uppercase
                ${isGenerating 
                  ? 'bg-slate-800 text-slate-500 font-black cursor-wait shadow-none' 
                  : 'bg-sky-400 hover:bg-sky-350 text-slate-950 shadow-md shadow-sky-450/25'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  CONSTRUCTING 11-TOPIC MATRIX...
                </>
              ) : (
                <>
                  <Layout className="w-4.5 h-4.5 shrink-0" />
                  Finalize Plan &amp; Unlock Bento board
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: PREVIOUSLY SAVED SCHEDULERS & CODES */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded tracking-wide mb-1.5 inline-block font-mono">Study Portal Vault</span>
              <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-sky-400" /> Previous Preparation Plans
              </h4>
              <p className="text-xs text-slate-450 leading-relaxed font-semibold mt-1">
                Select an existing archived workspace to review its performance, custom recall notes, or assessment grades.
              </p>
            </div>

            {plans.length === 0 ? (
              <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-850 text-center flex flex-col items-center gap-2">
                <Briefcase className="w-8 h-8 text-slate-600 animate-pulse" />
                <p className="text-xs font-semibold text-slate-500 italic">No previous interview tracks found. Fill of your target specs on the left to initialize!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[225px] overflow-y-auto pr-1">
                {plans.map((p) => {
                  const progress = Math.round((p.topics.filter(t => t.completed).length / 11) * 100);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPlan(p)}
                      className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all text-xs font-bold cursor-pointer group ${
                        activePlan?.id === p.id 
                          ? 'bg-sky-500/10 border-sky-400 text-sky-400' 
                          : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-350 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-slate-100 font-extrabold truncate group-hover:text-sky-300 transition-colors uppercase tracking-tight">{p.role}</div>
                        <div className="text-[10px] opacity-60 font-semibold uppercase mt-0.5">{p.experience_level} Tier • {p.topics.length} topics</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded group-hover:bg-slate-900 group-hover:text-sky-400">{progress}%</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTIVE ANALYTICAL MEMORIES */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl flex flex-col gap-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Database className="w-4 h-4 text-emerald-400" /> Active analytical memory engines
            </h4>
            
            <div className="grid grid-cols-1 gap-2.5 text-[10px] font-bold text-slate-400">
              <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/60">
                <span className="p-0.5 px-1 bg-sky-500/10 text-sky-400 uppercase text-[8px] font-black shrink-0">Short-Term</span>
                <div>
                  <div className="text-slate-200">Conversational log logs</div>
                  <div className="opacity-70 mt-0.5 font-medium">Maintains prompt instructions &amp; custom user requests contextually.</div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/60">
                <span className="p-0.5 px-1 bg-amber-500/10 text-amber-400 uppercase text-[8px] font-black shrink-0">Semantic</span>
                <div>
                  <div className="text-slate-200">Syllabus structural matrices</div>
                  <div className="opacity-70 mt-0.5 font-medium">Binds completion checkmarks, study cards note summaries, and bento links.</div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/60">
                <span className="p-0.5 px-1 bg-emerald-500/10 text-emerald-400 uppercase text-[8px] font-black shrink-0">Episodic</span>
                <div>
                  <div className="text-slate-200">Evaluation assessment scorelogs</div>
                  <div className="opacity-70 mt-0.5 font-medium">Tracks historical test accuracy of generated 10-Question quizzes.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // PAGE 2: THE 11-TOPIC DYNAMIC BENTO BOARD MATRIX
  const renderBentoScreen = () => {
    if (!activePlan) return null;
    const progressPercent = Math.round((activePlan.topics.filter(t => t.completed).length / 11) * 100);

    return (
      <div className="flex-grow max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col gap-8">
        
        {/* SUITE STAT BAR & BACK BUTTON */}
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setInterviewScreen('plan');
              }}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-350 bg-transparent border-none cursor-pointer font-bold mb-3 self-start group"
            >
              <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>← Go to Career Planner &amp; Configuration</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-sky-500/10 border border-sky-550/30 text-sky-450 px-2 py-0.5 rounded uppercase font-black">2. Bento Roadmap</span>
              <span className="text-[10px] bg-slate-800 text-slate-350 font-extrabold px-2 py-0.5 rounded uppercase">{activePlan.experience_level} Tier</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight">{activePlan.role}</h3>
            <p className="text-slate-400 text-xs font-semibold">11 modular syllabus cutouts tailored specifically to your parameters.</p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 shrink-0">
            <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative bg-slate-900 text-xs font-black text-sky-400 font-mono shrink-0">
              {progressPercent}%
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Mastery Status</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                {activePlan.topics.filter(t => t.completed).length} of 11 mastered
              </span>
            </div>
          </div>
        </div>

        {/* MAP OF TOPICS CUTOUTS */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400 leading-none">
            <span>Syllabus cutouts (#01 - #11)</span>
            <span className="text-slate-500 font-bold lowercase">Click a tile to launch targeted testing &amp; study cards</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activePlan.topics.map((topic, i) => {
              const idx = i + 1;
              const isCompleted = topic.completed;

              return (
                <div
                  key={topic.id || idx}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setTopicNotes(topic.notes || '');
                    setQuizQuestions([]);
                    setInterviewScreen('topic');
                  }}
                  className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-2xl transition-all duration-300 flex flex-col justify-between min-h-[150px]
                    ${selectedTopic?.id === topic.id 
                      ? 'bg-sky-950/20 border-sky-400 text-sky-300 ring-2 ring-sky-400/20' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }
                  `}
                >
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-sky-400 transition-colors">
                      #{String(idx).padStart(2, '0')}
                    </span>
                    {isCompleted ? (
                      <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 p-1 px-2 rounded-lg text-[9px] font-black uppercase leading-none">
                        Completed ✓
                      </span>
                    ) : (
                      <span className="bg-slate-950 text-slate-500 border border-slate-800/80 p-1 px-2 rounded-lg text-[9px] font-black uppercase leading-none">
                        Open
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <h4 className="font-black text-sm text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2">
                      {topic.name}
                    </h4>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-semibold line-clamp-2 mt-auto group-hover:text-slate-200 transition-colors">
                    {topic.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CUMULATIVE ASSESSIONS */}
        {scoreHistory.length > 0 && (
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 leading-none">
              <TrendingUp className="w-4 h-4 text-sky-400" /> Historical Performance Logs (Episodic assessment memory)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-350 font-semibold font-sans mt-1">
              {scoreHistory.map((score, sIdx) => {
                const relTopic = activePlan.topics.find(t => t.id === score.topic_id);
                return (
                  <div key={sIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-slate-200 font-bold truncate">{relTopic ? relTopic.name : `Topic #${score.topic_id}`}</div>
                      <div className="text-[10px] opacity-60 font-bold mt-0.5">{new Date(score.date).toLocaleDateString()}</div>
                    </div>
                    <span className="bg-slate-800 text-sky-400 font-mono font-black text-xs p-1.5 px-2 rounded-lg shrink-0">
                      {score.score}/{score.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  };

  // PAGE 3: SPECIFIC TOPIC PREP AND AI POWERED STUDY ROOM
  const renderTopicScreen = () => {
    if (!activePlan || !selectedTopic) return null;

    return (
      <div className="flex-grow max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col gap-6 animate-fade-in animate-duration-200">
        
        {/* HEADER BACK NAVIGATION BUTTON */}
        <div className="flex justify-between items-center border-b border-slate-850 pb-4">
          <button
            onClick={() => {
              setInterviewScreen('bento');
              setQuizQuestions([]);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-black rounded-xl border border-solid border-slate-800/80 cursor-pointer transition-all duration-200 group"
          >
            <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform text-sky-400" />
            <span>← Back to Bento Syllabus Roadmap</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-500">Master State:</span>
            
            <button
              type="button"
              onClick={() => handleToggleTopicCompleted(selectedTopic.id)}
              className={`p-1.5 px-3.5 text-xs font-black rounded-lg border cursor-pointer transition-all flex items-center gap-1.5
                ${selectedTopic.completed 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-455 hover:text-slate-200'
                }
              `}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{selectedTopic.completed ? 'Mastered ✓' : 'Mark Mastered'}</span>
            </button>
          </div>
        </div>

        {/* SCREEN TITLE AND CARD DETAILS BLOCK */}
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
          <div>
            <span className="text-[10px] bg-sky-500/10 border border-sky-505/35 text-sky-455 px-3 py-1 rounded-full uppercase font-mono font-extrabold tracking-wider">
              3. Classroom Study Cutout #{selectedTopic.id}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-3">{selectedTopic.name}</h2>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold leading-relaxed mt-2">{selectedTopic.description}</p>
          </div>

          {/* HIGH FIDELITY STUDY CARDS */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Key Concept Cards &amp; System Designs</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedTopic.cards && selectedTopic.cards.map((card, cIdx) => (
                <div 
                  key={cIdx} 
                  className="bg-slate-950 border border-slate-855 p-4 rounded-xl flex flex-col justify-between gap-3 text-xs"
                >
                  <div>
                    <h5 className="font-extrabold text-slate-100">{card.title}</h5>
                    <p className="opacity-90 mt-2 leading-relaxed font-sans font-semibold text-slate-400">{card.content}</p>
                  </div>

                  {card.code && (
                    <pre className="bg-slate-900 border border-slate-850 p-2.5 rounded font-mono text-[10px] text-sky-450 overflow-x-auto select-all max-h-[85px]" title="Technical architectural model">
                      <code>{card.code}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* STUDY COMPANION NOTES & AREA */}
          <div className="bg-slate-950 border border-slate-855 p-5 rounded-2xl flex flex-col gap-4">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-150 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-sky-400" /> Personal Recall study notes
              </h4>
              <p className="text-xs text-slate-500 leading-normal mt-1 font-semibold">
                Pen down code snippets, STAR methods, or checklist outlines. Updates directly to the active plan's semantic memory database cluster.
              </p>
            </div>

            <textarea
              value={topicNotes}
              onChange={(e) => setTopicNotes(e.target.value)}
              placeholder="Write summary notes, STAR interview answers, or review checks..."
              className="bg-slate-900 p-4 h-24 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 outline-none border border-slate-800 focus:border-sky-500 resize-none leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotesMemory}
                disabled={isSavingNotes}
                className="bg-sky-500 hover:bg-sky-450 text-slate-950 text-xs font-black uppercase px-5 py-2.5 rounded-lg transition-all cursor-pointer border-none shadow-md"
              >
                {isSavingNotes ? 'Recording...' : 'Record Notes Memory'}
              </button>
            </div>
          </div>

          {/* CURATED STUDY LINKS */}
          {selectedTopic.referenceLinks && selectedTopic.referenceLinks.length > 0 && (
            <div className="border-t border-slate-800/80 pt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Recommended groundings</span>
              <div className="flex flex-wrap gap-2">
                {selectedTopic.referenceLinks.map((link, lIdx) => (
                  <a 
                    key={lIdx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-sky-400 p-2.5 rounded-lg font-bold text-sky-400 flex items-center gap-1.5 transition-all text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                    <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* MCQ QUIZ */}
          <div className="border-t border-slate-800/85 pt-5 flex flex-col gap-4">
            <div>
              <h5 className="text-base font-black text-slate-100 flex items-center gap-1.5">
                <HelpCircle className="w-4.5 h-4.5 text-sky-400" /> Topic Practice evaluation (10-questions adaptive quiz)
              </h5>
              <p className="text-xs text-slate-450 font-semibold leading-normal mt-1">
                Pinpoint technical gaps immediately. Run our custom adaptive-assessment engine specifically generated to spot check your study.
              </p>
            </div>

            {quizQuestions.length === 0 ? (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => handleStartTopicQuiz(selectedTopic)}
                  disabled={isQuizLoading}
                  className="bg-sky-500 hover:bg-sky-450 text-slate-950 p-3.5 px-6 rounded-xl font-black text-xs uppercase cursor-pointer border-none shadow-lg tracking-wider"
                >
                  {isQuizLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-955 mr-1" />
                      CONSTRUCTING ASSESSMENT...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 mr-1.5 inline align-middle" />
                      Generate customized 10-Question quiz
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-855 flex flex-col gap-4 leading-relaxed">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                  <span>Correct: {quizScoreCounter}</span>
                </div>

                <div className="h-1 bg-slate-900 rounded overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 105}%` }}
                  ></div>
                </div>

                {showQuizResult ? (
                  <div className="text-center py-6 flex flex-col items-center gap-4 animate-fade-in text-slate-200">
                    <Trophy className="w-8 h-8 text-sky-400 animate-bounce" />
                    <div>
                      <h6 className="font-black text-base">Assessment Finished!</h6>
                      <p className="text-xs text-slate-450 font-semibold leading-normal mt-1">
                        Your performance score log ratio: <strong>{quizScoreCounter} / {quizQuestions.length}</strong> has been logged to your local Episodic History.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartTopicQuiz(selectedTopic)}
                      className="bg-slate-850 hover:bg-slate-800 text-sky-400 font-extrabold text-xs px-4 py-2 rounded-lg transition-all border border-slate-750 cursor-pointer uppercase"
                    >
                      Reset &amp; Retake
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <p className="font-extrabold text-xs sm:text-sm text-slate-200 font-sans leading-normal">
                      {quizQuestions[currentQuizIndex].text}
                    </p>

                    <div className="flex flex-col gap-2.5">
                      {Object.entries(quizQuestions[currentQuizIndex].options || {}).map(([key, value]) => {
                        const isSelected = selectedQuizAnswer === key;
                        const isCorrectAnswer = quizQuestions[currentQuizIndex].correct_answer === key;
                        let optionStyle = 'bg-slate-900 border-slate-805 hover:border-slate-755 text-slate-300';

                        if (isQuizAnswerSubmitted) {
                          if (isCorrectAnswer) {
                            optionStyle = 'bg-emerald-500/10 border-emerald-505 text-emerald-355';
                          } else if (isSelected) {
                            optionStyle = 'bg-rose-500/10 border-rose-505 text-rose-355';
                          } else {
                            optionStyle = 'bg-slate-900/35 border-slate-900 text-slate-500 pointer-events-none';
                          }
                        } else if (isSelected) {
                          optionStyle = 'bg-sky-500/10 border-sky-400 text-sky-300';
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={isQuizAnswerSubmitted}
                            onClick={() => handleSelectQuizAnswer(key)}
                            className={`w-full p-3.5 rounded-xl border font-bold text-xs text-left cursor-pointer transition-all duration-150 flex items-center gap-3 ${optionStyle}`}
                          >
                            <span className={`w-6 h-6 rounded-md font-mono font-black text-xs flex items-center justify-center shrink-0 border
                              ${isSelected ? 'bg-sky-500 text-slate-950 border-sky-450' : 'bg-slate-950 border-slate-850'}
                            `}>
                              {key}
                            </span>
                            <span className="leading-snug">{value as string}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-855 pt-3.5 mt-1">
                      <div className="text-xs font-semibold">
                        {isQuizAnswerSubmitted ? (
                          <span>
                            {selectedQuizAnswer === quizQuestions[currentQuizIndex].correct_answer ? (
                              <span className="text-emerald-400 font-bold">✓ Mastered: Correct choice!</span>
                            ) : (
                              <span className="text-rose-400 font-bold">✗ Incorrect option chosen</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Select option to evaluate</span>
                        )}
                      </div>

                      {!isQuizAnswerSubmitted ? (
                        <button
                          type="button"
                          onClick={handleSubmitQuizAnswer}
                          disabled={!selectedQuizAnswer}
                          className={`p-2.5 px-6 rounded-lg text-xs font-black uppercase tracking-wider border-none transition-all
                            ${selectedQuizAnswer 
                              ? 'bg-sky-455 hover:bg-sky-400 text-slate-955 cursor-pointer' 
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }
                          `}
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleNextQuizQuestion}
                          className="bg-slate-800 hover:bg-slate-750 text-sky-400 p-2 text-xs font-black px-5 rounded-lg border border-slate-705 cursor-pointer transition-all flex items-center gap-1"
                        >
                          <span>{currentQuizIndex < quizQuestions.length - 1 ? 'Next cutout' : 'View Summaries'}</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}
                    </div>

                    {isQuizAnswerSubmitted && (
                      <div className="bg-slate-950 p-3.5 border border-slate-900 rounded-xl mt-1 text-[11px] leading-relaxed">
                        <span className="text-[9px] font-black uppercase tracking-widest text-sky-400 block mb-1">AI Coach insight</span>
                        <div className="text-slate-355 font-sans font-semibold">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {quizQuestions[currentQuizIndex].explanation}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-300">
      
      {/* GLOBAL NAVBAR BAR */}
      <nav className="bg-slate-900 border-b border-slate-800 text-white py-4 px-4 sm:px-8 flex items-center justify-between shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-sky-400" /> PromptPass <span className="text-xs bg-sky-500/10 border border-sky-500/30 text-sky-400 px-2 py-0.5 rounded uppercase font-black tracking-wide leading-none">V2 INTERVIEW</span>
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl transition-all cursor-pointer border-none"
          >
            ← Check Exam Prep
          </button>
        </div>
      </nav>

      {/* THREE INTERACTIVE PROGRESSIVE CHANNELS */}
      {interviewScreen === 'plan' && renderPlanScreen()}
      {interviewScreen === 'bento' && renderBentoScreen()}
      {interviewScreen === 'topic' && renderTopicScreen()}

      {/* REMAINDER OLD JSX INACTIVATED TO ELIMINATE REDUNDANCY */}
      {false && (
      <div className="flex-grow max-w-6xl mx-auto w-full px-4 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: NAVIGATION STATS AND CHAT REFINE CHANNELS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* CONTROL TABS */}
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => { setNavTab('build'); handleCreateNewSyllabus(); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer ${
                navTab === 'build' ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              💼 Hire Optimizer
            </button>
            <button
              onClick={() => setNavTab('plans')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer ${
                navTab === 'plans' ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              🗃️ Prep Vault ({plans.length})
            </button>
          </div>

          {/* ACTIVE PREPARATION SELECTION */}
          {navTab === 'plans' && (
            <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archived Prep Tracks</span>
              {plans.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 italic py-2">No archived roadmaps. Construct a plan using the standard scheduler first!</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPlan(p)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all text-xs font-bold cursor-pointer ${
                        activePlan?.id === p.id 
                          ? 'bg-sky-500/10 border-sky-500 text-sky-400' 
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div>{p.role}</div>
                        <div className="text-[10px] opacity-60 font-semibold uppercase mt-0.5">{p.experience_level} Tier</div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONVERSATIONAL COACH AND FILE LOAD PLANNERS */}
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col gap-6">
            
            {/* INTRO SPECS */}
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" /> 1. Syllabus Consultation
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                Establish your job role specifications. Chat naturally with Gemini or load an existing preparation syllabus below, then build an automated 11-topic cutout study grid!
              </p>
            </div>

            {/* SYLLABUS DISCOVERY FORM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Role</span>
                <input 
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none p-3 rounded-xl text-xs sm:text-sm font-bold text-slate-200"
                  placeholder="e.g. Frontend Engineer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tier Level</span>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none p-3 rounded-xl text-xs sm:text-sm font-bold text-slate-200 cursor-pointer"
                >
                  <option value="Junior">Junior (0-2 YOE)</option>
                  <option value="Mid-Level">Mid-Level (2-5 YOE)</option>
                  <option value="Senior">Senior (5-8 YOE)</option>
                  <option value="Lead/Principal">Principal/Lead (8+ YOE)</option>
                </select>
              </div>
            </div>

            {/* SYLLABUS DIRECTIVE TEXTAREA INPUT */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex justify-between items-center">
                <span>Upload / Paste Preparation Syllabus</span>
                <span className="text-[9px] font-semibold text-sky-400 uppercase">Optional</span>
              </span>
              <textarea
                value={customPlanText}
                onChange={(e) => setCustomPlanText(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none p-3 rounded-xl text-xs font-semibold text-slate-300 h-20 resize-none leading-relaxed"
                placeholder="Paste customized topics list, company JD specifications, or previous study schedules to fully align the 11 topic grid."
              />
            </div>

            {/* INTERACTIVE COACH CONVERSATION LOGS (Contextual Memory) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Coach Consulting Thread</span>
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 h-40 overflow-y-auto flex flex-col gap-3 leading-relaxed text-xs">
                {chatLog.length === 0 ? (
                  <p className="text-slate-500 font-medium italic text-center my-auto">Ask the coach customized prep questions to refine your curriculum study plan, or click synthesize below directly!</p>
                ) : (
                  chatLog.map((chat, idx) => (
                    <div 
                      key={idx}
                      className={`p-2.5 rounded-xl max-w-[90%] font-semibold shadow-inner ${
                        chat.role === 'user' 
                          ? 'bg-sky-500/10 text-sky-300 self-end border border-sky-500/15' 
                          : 'bg-slate-900 text-slate-300 self-start border border-slate-800'
                      }`}
                    >
                      <span className="text-[9px] block opacity-40 font-black mb-1">
                        {chat.role === 'user' ? 'STUDENT' : 'COACH ARCHITECT'}
                      </span>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.content}</ReactMarkdown>
                    </div>
                  ))
                )}
              </div>

              {/* CHAT INPUT SUBMIT */}
              <form onSubmit={handleConsultChat} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={chatMessageInput}
                  onChange={(e) => setChatMessageInput(e.target.value)}
                  placeholder="Ask Coach to add custom technology domains..."
                  className="flex-grow bg-slate-950 border border-slate-800 focus:border-sky-550 focus:outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-200"
                />
                <button
                  type="submit"
                  disabled={isConsulting}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-400 p-2.5 rounded-xl transition-all cursor-pointer border-none"
                >
                  {isConsulting ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>

            {/* SYLLABUS FINALIZE CONVERSION PANEL */}
            <button
              type="button"
              onClick={handleFinalizeSyllabusSchedules}
              disabled={isGenerating}
              className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm border-none transition-all cursor-pointer flex items-center justify-center gap-2 tracking-wider uppercase
                ${isGenerating 
                  ? 'bg-slate-800 text-slate-500 font-black cursor-wait shadow-none' 
                  : 'bg-sky-400 hover:bg-sky-350 text-slate-950 shadow-lg shadow-sky-400/20'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  CONSTRUCTING 11-TOPIC MATRIX...
                </>
              ) : (
                <>
                  <Layout className="w-4.5 h-4.5 shrink-0" />
                  Finalize Plan & Unlock Bento Board
                </>
              )}
            </button>
          </div>

          {/* ACTIVE MULTI-TIER MEMORY STATS SUMMARY PANEL (A PM-crafted addition showing how recorded data persists) */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
            <h4 className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <Database className="w-4 h-4 text-emerald-400" /> Active memory records ("record everything")
            </h4>
            
            <div className="grid grid-cols-1 gap-3 text-[11px] font-bold text-slate-400 leading-normal">
              
              <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-900/60">
                <div className="p-1 px-1.5 rounded bg-sky-500/10 text-sky-400 uppercase text-[9px] tracking-wide font-black">Short-Term</div>
                <div>
                  <div className="text-slate-200">Consultation Session Context</div>
                  <div className="opacity-75 mt-0.5 font-medium leading-relaxed">Tracks custom conversation threads on parameters of ${targetRole}. ({chatLog.length} messages)</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-900/60">
                <div className="p-1 px-1.5 rounded bg-amber-500/10 text-amber-400 uppercase text-[9px] tracking-wide font-black">Semantic</div>
                <div>
                  <div className="text-slate-200">Syllabus Structure Map</div>
                  <div className="opacity-75 mt-0.5 font-medium leading-relaxed">Saves custom completed statuses, study notes memory block, and bento index locations under the {activePlan ? 'active' : 'default'} database profile.</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-900/60">
                <div className="p-1 px-1.5 rounded bg-emerald-500/10 text-emerald-400 uppercase text-[9px] tracking-wide font-black">Episodic</div>
                <div>
                  <div className="text-slate-200">Evaluation Quiz Score logs</div>
                  <div className="opacity-75 mt-0.5 font-medium leading-relaxed">Logs 10-Question quiz accuracies, chronological completion dates, and correct answers. ({scoreHistory.length} quiz records)</div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: THE ELEVEN-BOX TOPIC BENTO BOARD MATRIX */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {activePlan && activePlan.finalized ? (
            <div className="flex flex-col gap-6">
              
              {/* COMPREHENSIVE ROADMAP DESCRIPTION HEADER */}
              <div className="bg-slate-900/50 border border-slate-850 p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] bg-slate-800 border border-slate-750 text-slate-350 px-2.5 py-1 rounded-full font-black tracking-widest uppercase mb-2 inline-block">Active Plan</span>
                  <h3 className="text-lg font-black text-white">{activePlan.role}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{activePlan.experience_level} Experience Tier • Compiled dynamically using Gemini</p>
                </div>
                
                {/* GLOBAL WORKSPACE PROGRESS RADAR */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative bg-slate-950">
                    <span className="text-xs font-black text-sky-400">
                      {Math.round((activePlan.topics.filter(t => t.completed).length / 11) * 100)}%
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-500 mt-1.5">Progress</span>
                </div>
              </div>

              {/* THE 11 DIFFERENT BENTO TOPIC GRID BRIDGING CUTOUTS */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-400" /> Syllabus Matrix (11 dynamic cutouts)
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">Click topics to load custom cards & quizzes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePlan.topics.map((topic, i) => {
                    const idx = i + 1;
                    const isCompleted = topic.completed;
                    
                    return (
                      <div
                        key={topic.id || idx}
                        onClick={() => {
                          setSelectedTopic(topic);
                          setTopicNotes(topic.notes || '');
                          setQuizQuestions([]);
                        }}
                        className={`group relative p-5 rounded-2xl border cursor-pointer hover:shadow-2xl transition-all duration-350 flex flex-col justify-between min-h-[140px]
                          ${selectedTopic?.id === topic.id 
                            ? 'bg-sky-950/20 border-sky-400 text-sky-300 ring-2 ring-sky-400/20' 
                            : 'bg-slate-900 hover:bg-slate-850 border-slate-800'
                          }
                        `}
                      >
                        {/* Number Index Cutout Badge */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className="font-mono text-xs font-semibold text-slate-500 group-hover:text-sky-400 transition-colors">
                            #{String(idx).padStart(2, '0')}
                          </span>
                          
                          {/* Completion Badge Check */}
                          {isCompleted ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-1 px-1.5 rounded-lg text-[9px] tracking-wide font-black uppercase leading-none">
                              Completed ✓
                            </span>
                          ) : (
                            <span className="bg-slate-950 text-slate-500 border border-slate-800/60 p-1 px-1.5 rounded-lg text-[9px] tracking-wide font-black uppercase leading-none">
                              Open
                            </span>
                          )}
                        </div>

                        {/* Text description details */}
                        <div className="mb-2">
                          <h4 className="font-black text-xs sm:text-sm text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2">
                            {topic.name}
                          </h4>
                        </div>

                        <div className="text-[10px] text-slate-400 opacity-80 leading-normal line-clamp-2 font-medium mt-auto group-hover:text-slate-300 transition-colors">
                          {topic.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC TOPIC ACTIVE DETAIL COMPONENT INTERFACE (Unlocks detail cards,Detailed Reference Link, 10-Question Quiz) */}
              <AnimatePresence mode="wait">
                {selectedTopic && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.3 }}
                    className="bg-slate-900 border-2 border-sky-500/20 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative"
                  >
                    
                    {/* Header bar */}
                    <div className="flex justify-between items-start gap-4 border-b border-slate-800 pb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-sky-500/10 text-sky-400 font-extrabold px-2 py-0.5 rounded uppercase font-mono">
                            Focus cutout #{selectedTopic.id}
                          </span>
                          
                          {/* Topic completed toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleTopicCompleted(selectedTopic.id)}
                            className={`p-1 px-2 text-[10px] font-bold rounded-lg border cursor-pointer transition-all flex items-center gap-1
                              ${selectedTopic.completed 
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }
                            `}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{selectedTopic.completed ? 'Topic Completed' : 'Mark Completed'}</span>
                          </button>
                        </div>
                        <h4 className="text-xl font-black text-slate-100 mt-2">{selectedTopic.name}</h4>
                        <p className="text-xs text-slate-450 mt-1 leading-relaxed font-semibold">{selectedTopic.description}</p>
                      </div>

                      <button
                        onClick={() => { setSelectedTopic(null); setQuizQuestions([]); }}
                        className="p-1 px-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-850 cursor-pointer transition-all duration-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DYNAMIC SUBTOPIC DETAIL CARDS */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Key Study cards</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedTopic.cards && selectedTopic.cards.map((card, cIdx) => (
                          <div 
                            key={cIdx}
                            className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between gap-3 text-xs"
                          >
                            <div>
                              <h5 className="font-extrabold text-slate-200">{card.title}</h5>
                              <p className="opacity-80 mt-1.5 leading-relaxed font-semibold text-slate-450 font-sans">{card.content}</p>
                            </div>
                            
                            {card.code && (
                              <pre className="bg-slate-900 border border-slate-850 p-2.5 rounded font-mono text-[10px] text-sky-400 overflow-x-auto select-all max-h-[80px]" title="Diagnostic architecture snippet">
                                <code>{card.code}</code>
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* NOTES MEMORY INTERACTION SECTION (Structured note memory) */}
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <StickyNote className="w-3.5 h-3.5 text-sky-400" /> Topic Study companion notes & summary
                        </span>
                        <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Pen down your active recall formulations, mock review formulas, or diagnostic exceptions. These will be logged inside the preparation plan memory structure permanently.</p>
                      </div>

                      <textarea
                        value={topicNotes}
                        onChange={(e) => setTopicNotes(e.target.value)}
                        placeholder="Write custom explanations, acronym notes, or STAR scenarios in markdown format for review later."
                        className="bg-slate-900/60 p-3 h-24 rounded-lg text-xs font-semibold text-slate-250 outline-none border border-slate-800 focus:border-sky-500 resize-none leading-relaxed"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveNotesMemory}
                          disabled={isSavingNotes}
                          className="bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-extrabold uppercase px-4 py-2 border border-slate-750 hover:border-sky-500/30 rounded-lg transition-all cursor-pointer"
                        >
                          {isSavingNotes ? 'Recording Notes...' : '✓ Record Notes Memory'}
                        </button>
                      </div>
                    </div>

                    {/* DETAILED TUTORIAL AND DEEP REFERENCE LINKS */}
                    {selectedTopic.referenceLinks && selectedTopic.referenceLinks.length > 0 && (
                      <div className="border-t border-slate-850 pt-4 text-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Curated Deeply-grounded Learning Links</span>
                        <div className="flex flex-wrap gap-3">
                          {selectedTopic.referenceLinks.map((link, lIdx) => (
                            <a 
                              key={lIdx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-400 p-2.5 rounded-lg font-bold text-sky-400 flex items-center gap-1.5 transition-all text-xs"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{link.label}</span>
                              <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* THE ADAPTIVE 10-QUESTION DEEP DIVES MCQ CHALLENGE */}
                    <div className="border-t border-slate-850 pt-5 flex flex-col gap-4">
                      <div>
                        <h5 className="text-base font-black text-slate-100 flex items-center gap-1.5">
                          <HelpCircle className="w-4.5 h-4.5 text-sky-400" /> Topic Testing Practice (10-questions adaptive quiz)
                        </h5>
                        <p className="text-xs text-slate-400 font-semibold leading-normal mt-0.5">Test your comprehension immediately. Generate a mock, grade-guided 10-question quiz explicitly matching active parameters of "${selectedTopic.name}"!</p>
                      </div>

                      {quizQuestions.length === 0 ? (
                        <div className="flex justify-start">
                          <button
                            type="button"
                            onClick={() => handleStartTopicQuiz(selectedTopic)}
                            disabled={isQuizLoading}
                            className="bg-sky-500 hover:bg-sky-400 text-slate-950 p-3.5 px-6 rounded-xl font-black text-xs uppercase cursor-pointer border-none shadow-md shadow-sky-500/10 flex items-center gap-2 tracking-wider"
                          >
                            {isQuizLoading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                CONSTRUCTING ADAPTIVE QUIZ QUESTIONS...
                              </>
                            ) : (
                              <>
                                <Trophy className="w-3.5 h-3.5" />
                                Generate 10-Question Quiz
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col gap-4 leading-relaxed">
                          
                          {/* Quiz status bar */}
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                            <span>Points: {quizScoreCounter} correct</span>
                          </div>

                          <div className="h-1 bg-slate-900 rounded overflow-hidden">
                            <div 
                              className="h-full bg-sky-500 transition-all duration-300"
                              style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                            ></div>
                          </div>

                          {showQuizResult ? (
                            <div className="text-center py-6 flex flex-col items-center gap-4 animate-fade-in text-slate-200">
                              <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-400 flex items-center justify-center text-sky-400">
                                <Trophy className="w-6 h-6 animate-pulse" />
                              </div>
                              <div>
                                <h6 className="font-black text-base">Quiz Completed!</h6>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1 max-w-sm">
                                  You cleared the adaptive assessment with an overall score ratio of <strong>{quizScoreCounter} / {quizQuestions.length}</strong>! This has been cataloged inside your episodic performance memory dashboard.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartTopicQuiz(selectedTopic)}
                                className="bg-slate-800 hover:bg-slate-750 text-sky-400 font-black text-xs px-4 py-2 rounded-xl transition-all border border-slate-700 hover:border-sky-500/30 cursor-pointer uppercase"
                              >
                                Test Again
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-4">
                              <p className="font-extrabold text-sm text-slate-200 font-sans leading-normal">
                                {quizQuestions[currentQuizIndex].text}
                              </p>

                              {/* MCQ OPTIONS LIST */}
                              <div className="flex flex-col gap-2.5">
                                {Object.entries(quizQuestions[currentQuizIndex].options || {}).map(([key, value]) => {
                                  const isSelected = selectedQuizAnswer === key;
                                  const isCorrectAnswer = quizQuestions[currentQuizIndex].correct_answer === key;
                                  let optionStyle = 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-350';

                                  if (isQuizAnswerSubmitted) {
                                    if (isCorrectAnswer) {
                                      optionStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-350';
                                    } else if (isSelected) {
                                      optionStyle = 'bg-rose-500/10 border-rose-500 text-rose-350';
                                    } else {
                                      optionStyle = 'bg-slate-900/40 border-slate-900 text-slate-500 pointer-events-none';
                                    }
                                  } else if (isSelected) {
                                    optionStyle = 'bg-sky-500/10 border-sky-400 text-sky-300';
                                  }

                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      disabled={isQuizAnswerSubmitted}
                                      onClick={() => handleSelectQuizAnswer(key)}
                                      className={`w-full p-4 rounded-xl border font-semibold text-xs text-left cursor-pointer transition-all duration-150 flex items-center gap-3 ${optionStyle}`}
                                    >
                                      <span className={`w-6 h-6 rounded-lg font-mono font-extrabold text-[11px] uppercase flex items-center justify-center shrink-0 border
                                        ${isSelected ? 'bg-sky-500 text-slate-950 border-sky-400' : 'bg-slate-950 border-slate-800'}
                                      `}>
                                        {key}
                                      </span>
                                      <span className="leading-snug">{value as string}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* EVALUATION GRADE OR FOOTER ACTION */}
                              <div className="flex items-center justify-between border-t border-slate-850 pt-4 mt-2">
                                <div className="text-xs">
                                  {isQuizAnswerSubmitted ? (
                                    <div className="flex items-center gap-1.5">
                                      {selectedQuizAnswer === quizQuestions[currentQuizIndex].correct_answer ? (
                                        <span className="text-emerald-400 font-extrabold flex items-center gap-1">✓ Grade: Correct</span>
                                      ) : (
                                        <span className="text-rose-400 font-extrabold flex items-center gap-1">✗ Grade: Incorrect</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select an option to evaluate</span>
                                  )}
                                </div>

                                {!isQuizAnswerSubmitted ? (
                                  <button
                                    type="button"
                                    onClick={handleSubmitQuizAnswer}
                                    disabled={!selectedQuizAnswer}
                                    className={`p-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider border-none transition-all
                                      ${selectedQuizAnswer 
                                        ? 'bg-sky-400 hover:bg-sky-350 text-slate-950 cursor-pointer' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      }
                                    `}
                                  >
                                    Submit Grade
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleNextQuizQuestion}
                                    className="bg-slate-800 hover:bg-slate-700 text-sky-400 p-2.5 px-6 rounded-xl font-black text-xs uppercase cursor-pointer border border-slate-700 hover:border-sky-500/30 transition-all flex items-center gap-1"
                                  >
                                    <span>{currentQuizIndex < quizQuestions.length - 1 ? 'Next Scenario' : 'View Summary'}</span>
                                    <ChevronRight className="w-4 h-4 shrink-0" />
                                  </button>
                                )}
                              </div>

                              {/* AI EXPLANATION REVEAL (Contextual memory review) */}
                              {isQuizAnswerSubmitted && (
                                <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl mt-2 leading-relaxed text-xs">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-sky-400 block mb-1">AI Tutor Insight</span>
                                  <div className="text-slate-300 font-medium font-sans">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {quizQuestions[currentQuizIndex].explanation}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )}
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

              {/* RETURNING SCORE HISTORIES EPIC LOG (Episodic Memory dashboard) */}
              {scoreHistory.length > 0 && (
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 leading-none">
                    <TrendingUp className="w-4 h-4 text-sky-400" /> Historical Performance Logs (Episodic Memory)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-350 font-semibold font-sans mt-1">
                    {scoreHistory.map((score, sIdx) => {
                      const relTopic = activePlan.topics.find(t => t.id === score.topic_id);
                      return (
                        <div key={sIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <div className="text-slate-200 font-bold truncate">{relTopic ? relTopic.name : `Topic #${score.topic_id}`}</div>
                            <div className="text-[10px] opacity-60 font-bold mt-0.5">{new Date(score.date).toLocaleDateString()}</div>
                          </div>
                          <span className="bg-slate-800 text-sky-400 font-mono font-black text-xs p-1.5 px-2 rounded-lg shrink-0">
                            {score.score}/{score.total}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            
            /* PLACEHOLDER UNTIL SYLLABUS BUILD COMPLETE */
            <div className="bg-slate-900 p-12 sm:p-20 text-center rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-4 my-auto min-h-[400px]">
              <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center animate-pulse text-slate-400">
                <Layout className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-100">Unlock your interview bento grid</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mt-1.5">
                  Input your targeted role and specifications in Step 1. Consult the AI interview coach optionally and generate your customizable 11-topic syllabus schedule!
                </p>
              </div>
            </div>

          )}

        </div>

      </div>
      )}

      {/* FOOTER */}
      <footer className="text-center py-6 border-t border-slate-900 text-[11px] font-bold text-slate-500 bg-slate-950">
        © 2026 PromptPass .ai — Active Interview Preparation System
      </footer>
    </div>
  );
}
