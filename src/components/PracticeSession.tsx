import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExamPlan, Question, ProgressItem, ChatMessage } from '../types';

import { AppLogo } from '../App';

const MarkdownComponents = {
  h1: ({ ...props }: any) => (
    <h1 style={{ fontSize: '1.4rem', color: '#0f172a', marginTop: '24px', marginBottom: '12px' }} {...props} />
  ),
  h2: ({ ...props }: any) => (
    <h2
      style={{
        fontSize: '1.2rem',
        color: '#0f172a',
        marginTop: '18px',
        marginBottom: '10px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '6px',
      }}
      {...props}
    />
  ),
  h3: ({ ...props }: any) => (
    <h3 style={{ fontSize: '1.05rem', color: '#0f172a', marginTop: '14px', marginBottom: '6px' }} {...props} />
  ),
  p: ({ ...props }: any) => (
    <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: '1.75', marginBottom: '12px' }} {...props} />
  ),
  strong: ({ ...props }: any) => (
    <strong style={{ color: '#0ea5e9', fontWeight: '700' }} {...props} />
  ),
  ul: ({ ...props }: any) => (
    <ul style={{ paddingLeft: '20px', color: '#334155', marginBottom: '12px', lineHeight: '1.75' }} {...props} />
  ),
  code: ({ children, className, ...props }: any) => {
    const isInline = !className || !className.startsWith('language-');
    return isInline ? (
      <code
        style={{
          background: '#f1f5f9',
          padding: '2px 6px',
          borderRadius: '5px',
          color: '#db2777',
          fontSize: '0.9em',
          fontFamily: 'monospace',
        }}
        {...props}
      >
        {children}
      </code>
    ) : (
      <pre
        style={{
          background: '#0f172a',
          color: '#e2e8f0',
          padding: '18px',
          borderRadius: '10px',
          overflowX: 'auto',
          marginBottom: '18px',
        }}
      >
        <code style={{ fontFamily: 'monospace', fontSize: '0.92em' }} {...props}>
          {children}
        </code>
      </pre>
    );
  }
};

const LS_KEY = (planId: string) => `promptpass_state_${planId}`;

interface SavedState {
  answers?: Record<string, string>;
  explanations?: Record<string, string>;
  chats?: Record<string, ChatMessage[]>;
}

function loadFromStorage(planId: string): SavedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY(planId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(planId: string, data: SavedState) {
  try {
    localStorage.setItem(LS_KEY(planId), JSON.stringify(data));
  } catch {}
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { green: '#10b981', red: '#ef4444', gray: '#cbd5e1' };
  const titles: Record<string, string> = { green: 'Correct', red: 'Incorrect', gray: 'Not attempted' };
  return (
    <span
      title={titles[status] || 'Unknown'}
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: colors[status] || colors.gray,
        flexShrink: 0,
      }}
    />
  );
}

interface ReviewModalProps {
  questions: Question[];
  progress: ProgressItem[];
  filter: 'green' | 'red';
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function ReviewModal({ questions, progress, filter, onClose, onNavigate }: ReviewModalProps) {
  const filtered = progress.filter((p) => p.status === filter);
  const label = filter === 'green' ? 'Correct' : 'Incorrect';
  const accent = filter === 'green' ? '#10b981' : '#ef4444';
  const bgAccent = filter === 'green' ? '#f0fdf4' : '#fef2f2';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '18px',
          width: '480px',
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, color: accent, fontSize: '1.15rem' }}>
            {label} Questions ({filtered.length})
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: '#64748b',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            No {label.toLowerCase()} questions yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((item) => {
              const q = questions.find((ques) => ques.id === item.question_id);
              if (!q) return null;
              return (
                <button
                  key={item.question_id}
                  onClick={() => {
                    const idx = questions.findIndex((ques) => ques.id === item.question_id);
                    onNavigate(idx);
                    onClose();
                  }}
                  style={{
                    backgroundColor: bgAccent,
                    border: `1px solid ${accent}30`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'translateX(4px)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateX(0px)')}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: accent,
                      textTransform: 'uppercase',
                    }}
                  >
                    Q {q.question_number}
                  </span>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '0.92rem',
                      color: '#0f172a',
                      lineHeight: '1.45',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {q.text}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface PracticeSessionProps {
  planId: string;
  plans: ExamPlan[];
  onSwitch: (id: string) => void;
  onBack: () => void;
}

export default function PracticeSession({ planId, plans, onSwitch, onBack }: PracticeSessionProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Per-question persistent state (keyed by question ID)
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [questionExplanations, setQuestionExplanations] = useState<Record<string, string>>({});
  const [questionChats, setQuestionChats] = useState<Record<string, ChatMessage[]>>({});

  // Derived view state for the currently visible question
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Review modal
  const [reviewFilter, setReviewFilter] = useState<'green' | 'red' | null>(null);

  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/progress`);
      setProgress(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [planId]);

  // Load questions + progress on plan change
  useEffect(() => {
    setCurrentIndex(0);
    setChatInput('');

    // Restore state from LocalStorage
    const saved = loadFromStorage(planId);
    if (saved) {
      setQuestionAnswers(saved.answers || {});
      setQuestionExplanations(saved.explanations || {});
      setQuestionChats(saved.chats || {});
    } else {
      setQuestionAnswers({});
      setQuestionExplanations({});
      setQuestionChats({});
    }

    fetch(`/api/plans/${planId}/questions`)
      .then((r) => r.json())
      .then((qs) => {
        setQuestions(qs);
      });
    fetchProgress();
  }, [planId, fetchProgress]);

  // Save changes to localStorage on any state modification
  useEffect(() => {
    if (!planId) return;
    saveToStorage(planId, {
      answers: questionAnswers,
      explanations: questionExplanations,
      chats: questionChats,
    });
  }, [planId, questionAnswers, questionExplanations, questionChats]);

  // Sync current selection when navigating
  useEffect(() => {
    const q = questions[currentIndex];
    if (!q) return;
    setSelectedAnswer(questionAnswers[q.id] || '');
    setExplanation(questionExplanations[q.id] || '');
    setChatLog(questionChats[q.id] || []);
    setChatInput('');
  }, [currentIndex, questions, questionAnswers, questionExplanations, questionChats]);

  // Parse stream chunks line-by-line helper
  const processStream = async (response: Response, stateUpdater: (text: string) => void) => {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const rawJson = line.substring(6).trim();
            if (rawJson) {
              const data = JSON.parse(rawJson);
              if (data && data.text) {
                stateUpdater(data.text);
              }
            }
          } catch {}
        }
      }
    }
  };

  const handleCheckAnswer = async () => {
    if (!selectedAnswer) return alert('Please choose an answer first!');
    const q = questions[currentIndex];
    if (!q) return;

    // Optimistically clear explanation & chats
    setExplanation('');
    setQuestionExplanations((prev) => ({ ...prev, [q.id]: '' }));
    setChatLog([]);
    setQuestionChats((prev) => ({ ...prev, [q.id]: [] }));
    setIsStreaming(true);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: q.id, selected_answer: selectedAnswer }),
      });

      await processStream(response, (text) => {
        setExplanation((prev) => {
          const next = prev + text;
          setQuestionExplanations((e) => ({ ...e, [q.id]: next }));
          return next;
        });
      });

      fetchProgress();
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAskFollowUp = async () => {
    const query = chatInput.trim();
    if (!query) return;
    const q = questions[currentIndex];
    if (!q) return;

    const newEntry: ChatMessage[] = [
      { role: 'user', content: query },
      { role: 'ai', content: '' },
    ];
    const updatedLog = [...chatLog, ...newEntry];

    setChatLog(updatedLog);
    setQuestionChats((prev) => ({ ...prev, [q.id]: updatedLog }));
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: q.text,
          ai_explanation: explanation,
          user_message: query,
        }),
      });

      await processStream(response, (text) => {
        setChatLog((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last) {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + text,
            };
          }
          setQuestionChats((c) => ({ ...c, [q.id]: updated }));
          return updated;
        });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSelectAnswer = (key: string) => {
    const q = questions[currentIndex];
    if (!q) return;
    setSelectedAnswer(key);
    setQuestionAnswers((prev) => ({ ...prev, [q.id]: key }));
  };

  const navigate = useCallback(
    (delta: number) => {
      setCurrentIndex((i) => Math.max(0, Math.min(questions.length - 1, i + delta)));
    },
    [questions.length]
  );

  // Keyboard navigation hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);

      const optionKeys: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F' };
      if (optionKeys[e.key] && questions[currentIndex]) {
        const opts = questions[currentIndex].options;
        if (opts[optionKeys[e.key]]) {
          handleSelectAnswer(optionKeys[e.key]);
        }
      }

      if (e.key === 'Enter' && !isStreaming && !isChatting) {
        handleCheckAnswer();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, currentIndex, questions, isStreaming, isChatting, selectedAnswer]);

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAskFollowUp();
    }
  };

  if (!questions.length) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#64748b',
        }}
      >
        Loading workspace…
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const total = questions.length;
  const attempted = progress.filter((p) => p.status !== 'gray').length;
  const correct = progress.filter((p) => p.status === 'green').length;
  const wrong = progress.filter((p) => p.status === 'red').length;
  const progressPct = total > 0 ? Math.round((attempted / total) * 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        fontFamily: '"Inter", system-ui, sans-serif',
        backgroundColor: '#f4f4f5',
        overflow: 'hidden',
      }}
    >
      {/* SIDEBAR VIEW PANEL */}
      <div
        style={{
          width: '300px',
          background: '#0f172a',
          color: '#fff',
          padding: '28px 22px',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
          <AppLogo />
          <h1 style={{ margin: '0 0 0 10px', fontSize: '1.4rem', fontWeight: 800 }}>PromptPass</h1>
        </div>

        <button
          onClick={onBack}
          style={{
            padding: '11px',
            background: '#1e293b',
            color: '#94a3b8',
            borderRadius: '10px',
            border: 'none',
            marginBottom: '16px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'color 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          ← Dashboard
        </button>

        <select
          value={planId}
          onChange={(e) => onSwitch(e.target.value)}
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: '10px',
            background: '#1e293b',
            color: '#fff',
            marginBottom: '28px',
            border: '1px solid #334155',
          }}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        {/* PROGRESS METRICS */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#94a3b8',
              marginBottom: '6px',
            }}
          >
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div style={{ background: '#1e293b', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0ea5e9, #10b981)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* STATS BUTTONS FOR MODAL AUDITS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
          <div
            style={{
              background: '#1e293b',
              padding: '14px',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{total}</div>
            Total
          </div>
          <div
            style={{
              background: '#1e293b',
              padding: '14px',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{attempted}</div>
            Done
          </div>

          <button
            onClick={() => setReviewFilter('green')}
            style={{
              background: '#052e16',
              padding: '14px',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#6eee87',
              border: '1px solid #10b98130',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = '#10b981')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#10b98130')}
            title="Click to review correct answers"
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{correct}</div>
            Correct →
          </button>

          <button
            onClick={() => setReviewFilter('red')}
            style={{
              background: '#2d0a0a',
              padding: '14px',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#fca5a5',
              border: '1px solid #ef444430',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#ef444430')}
            title="Click to review incorrect answers"
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{wrong}</div>
            Wrong →
          </button>
        </div>

        {/* KEYBOARD SHORTCUTS LEGEND */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '0.76rem',
            color: '#64748b',
            lineHeight: '1.7',
          }}
        >
          <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>⌨ Shortcuts</div>
          <div>← → Navigate questions</div>
          <div>1–4 Select option A–D</div>
          <div>Enter Submit answer</div>
          <div>⌘↵ Send chat message</div>
        </div>
      </div>

      {/* CORE PROBLEM SCREEN */}
      <div
        style={{
          flex: 1,
          padding: '40px 50px',
          overflowY: 'auto',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%' }}>
          {/* TOP NAV CONTROLS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <span
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '4px 14px',
                borderRadius: '20px',
                fontWeight: 800,
                fontSize: '0.85rem',
              }}
            >
              Q {currentQuestion.question_number} / {total}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate(-1)}
                disabled={currentIndex === 0}
                style={{
                  padding: '8px 16px',
                  background: currentIndex === 0 ? '#f1f5f9' : '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  color: currentIndex === 0 ? '#94a3b8' : '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => navigate(1)}
                disabled={currentIndex === total - 1}
                style={{
                  padding: '8px 16px',
                  background: currentIndex === total - 1 ? '#f1f5f9' : '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: currentIndex === total - 1 ? 'not-allowed' : 'pointer',
                  color: currentIndex === total - 1 ? '#94a3b8' : '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                Next →
              </button>
            </div>
          </div>

          <p style={{ fontSize: '1.2rem', color: '#0f172a', lineHeight: '1.7', marginBottom: '28px' }}>
            {currentQuestion.text}
          </p>

          {/* RADIO GRID LIST OPTIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(currentQuestion.options).map(([key, val]) => {
              const isSelected = selectedAnswer === key;
              return (
                <label
                  key={key}
                  style={{
                    padding: '16px 20px',
                    border: `2px solid ${isSelected ? '#38bdf8' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? '#f0f9ff' : '#fff',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={key}
                    checked={isSelected}
                    onChange={() => handleSelectAnswer(key)}
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  <span style={{ color: '#0f172a', fontSize: '1rem', lineHeight: '1.55' }}>
                    <strong style={{ color: '#0ea5e9', marginRight: '6px' }}>{key}.</strong>
                    {val}
                  </span>
                </label>
              );
            })}
          </div>

          <button
            onClick={handleCheckAnswer}
            disabled={isStreaming || !selectedAnswer}
            style={{
              width: '100%',
              padding: '17px',
              background: isStreaming || !selectedAnswer ? '#94a3b8' : '#0f172a',
              color: '#fff',
              borderRadius: '12px',
              marginTop: '24px',
              fontWeight: 800,
              fontSize: '1rem',
              border: 'none',
              cursor: isStreaming || !selectedAnswer ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {isStreaming ? '⚙ AI Evaluating...' : 'Submit & Evaluate  (Enter)'}
          </button>

          {/* AI EXPLANATIONS */}
          {explanation && (
            <div
              style={{
                marginTop: '44px',
                padding: '36px',
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem' }}>AI Tutor Explanation</h3>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '28px', marginBottom: '28px' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {explanation}
                </ReactMarkdown>
              </div>

              {/* INTERACTIVE FOLLOW-UP TUTOR CHAT */}
              <h4 style={{ color: '#0f172a', marginBottom: '16px', fontSize: '0.95rem' }}>
                Ask a follow-up question:
              </h4>
              {chatLog.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: '14px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? '#f1f5f9' : '#eef2ff',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '6px',
                      color: msg.role === 'user' ? '#64748b' : '#4f46e5',
                    }}
                  >
                    {msg.role === 'user' ? 'You' : 'PromptPass AI'}
                  </strong>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {msg.content || '…'}
                  </ReactMarkdown>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask about this question… (⌘ Enter to send)"
                  rows={2}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    resize: 'vertical',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAskFollowUp}
                  disabled={isChatting || !chatInput.trim()}
                  style={{
                    padding: '10px 20px',
                    background: isChatting || !chatInput.trim() ? '#94a3b8' : '#0ea5e9',
                    color: '#fff',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: isChatting || !chatInput.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    alignSelf: 'flex-end',
                  }}
                >
                  {isChatting ? '…' : 'Ask'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUESTION GRID MATRIX (right rail navigator) */}
      <div
        style={{
          width: '280px',
          background: '#f8fafc',
          borderLeft: '1px solid #e2e8f0',
          padding: '28px 18px',
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '18px', fontSize: '0.95rem', color: '#0f172a' }}>
          Question Directory
        </h3>
        {Array.from({ length: Math.ceil(progress.length / 50) }).map((_, batchIdx) => (
          <details key={batchIdx} style={{ marginBottom: '12px' }} open={batchIdx === 0}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>
              Q {batchIdx * 50 + 1} – {Math.min((batchIdx + 1) * 50, progress.length)}
            </summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {progress.slice(batchIdx * 50, (batchIdx + 1) * 50).map((item, idx) => {
                const globalIdx = batchIdx * 50 + idx;
                const isActive = currentIndex === globalIdx;
                const statusColors = {
                  green: { bg: '#f0fdf4', border: '#10b981', text: '#065f46' },
                  red: { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d' },
                  gray: { bg: '#fff', border: '#cbd5e1', text: '#0f172a' },
                };
                const sc = isActive
                  ? { bg: '#0f172a', border: '#0f172a', text: '#fff' }
                  : statusColors[item.status] || statusColors.gray;

                return (
                  <button
                    key={item.question_id}
                    onClick={() => setCurrentIndex(globalIdx)}
                    title={`Q ${item.question_number} — ${
                      item.status === 'green' ? 'Correct' : item.status === 'red' ? 'Incorrect' : 'Not attempted'
                    }`}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '7px',
                      border: `1.5px solid ${sc.border}`,
                      background: sc.bg,
                      color: sc.text,
                      cursor: 'pointer',
                      fontWeight: isActive ? '800' : '600',
                      fontSize: '0.8rem',
                      transition: 'transform 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.12)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {item.question_number}
                  </button>
                );
              })}
            </div>
          </details>
        ))}
      </div>

      {/* FILTER AUDIT POPUPS / MODALS */}
      {reviewFilter && (
        <ReviewModal
          questions={questions}
          progress={progress}
          filter={reviewFilter}
          onClose={() => setReviewFilter(null)}
          onNavigate={(idx) => setCurrentIndex(idx)}
        />
      )}
    </div>
  );
}
