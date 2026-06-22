import React, { useState, useEffect } from 'react';
import PracticeSession from './components/PracticeSession';
import { ExamPlan } from './types';

// The PromptPass Logo: Fusion of Brain (Mind/AI) and Book (Knowledge)
export const AppLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
      <span
        style={{
          fontSize: '1.6rem',
          fontWeight: 900,
          color: '#38bdf8',
          marginLeft: '-2px',
          letterSpacing: '-1.5px',
          fontFamily: 'system-ui',
        }}
      >
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

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        setPlans(await res.json());
      }
    } catch (err) {
      console.error('Failed to load study plans:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);

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
    if (!window.confirm('This will permanently delete this certification study workspace. Proceed?')) {
      return;
    }

    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
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
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '"Inter", -apple-system, sans-serif' }}>
      
      {/* HEADER CONTROL BAR */}
      <nav
        style={{
          background: '#0f172a',
          padding: '1rem 4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <AppLogo />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                margin: '0 0 0 15px',
                fontSize: '1.8rem',
                color: '#fff',
                fontWeight: 800,
                letterSpacing: '-0.8px',
              }}
            >
              PromptPass
            </h1>
            <span
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#e2e8f0',
                border: '1px solid rgba(226,232,240,0.25)',
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              v1
            </span>
          </div>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>
          AI-Powered Certification Mastery Desk
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '60px auto', padding: '0 20px' }}>
        
        {/* GRIDS WORKSPACES SECTION */}
        <section style={{ marginBottom: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.6rem', color: '#1e293b', margin: 0 }}>My Study Workspaces</h2>
            <span
              style={{
                background: '#e2e8f0',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                color: '#475569',
                fontWeight: 600,
              }}
            >
              {plans.length} Sessions Active
            </span>
          </div>

          {plans.length === 0 ? (
            <div
              style={{
                background: '#fff',
                padding: '60px',
                borderRadius: '24px',
                textAlign: 'center',
                border: '2px dashed #cbd5e1',
                color: '#64748b',
              }}
            >
              <p style={{ fontSize: '1.1rem' }}>
                No active study workspaces yet. Upload a certification questions PDF bank to initiate.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '25px',
              }}
            >
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setActivePlanId(plan.id)}
                  style={{
                    background: '#fff',
                    padding: '28px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#38bdf8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <h3
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '1.2rem',
                          color: '#0f172a',
                          lineHeight: '1.4',
                        }}
                      >
                        {plan.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                        Created {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, plan.id)}
                      style={{
                        background: '#fef2f2',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: '0.2s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#fee2e2')}
                      onMouseOut={(e) => (e.currentTarget.style.background = '#fef2f2')}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#0ea5e9',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  >
                    Open Session →
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STUDY PLAN FILE INITIALIZER FORM */}
        <section
          style={{
            background: '#fff',
            padding: '45px',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '10px' }}>Initialize New Workspace</h2>
          <p style={{ color: '#64748b', marginBottom: '35px', fontSize: '1.05rem' }}>
            Upload a PDF document containing certification syllabus questions to instantiate an independent, AI-powered certification learning room.
          </p>

          <form onSubmit={handleUpload} style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1.5', minWidth: '300px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '8px',
                }}
              >
                WORKSPACE NAME
              </label>
              <input
                name="plan_title"
                placeholder="e.g., AWS Security Specialist (SCS-C02) or PMP Syllabus"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #f1f5f9',
                  background: '#f8fafc',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: '0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#38bdf8')}
                onBlur={(e) => (e.target.style.borderColor = '#f1f5f9')}
              />
            </div>

            <div style={{ flex: '1', minWidth: '300px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '8px',
                }}
              >
                PDF / TXT SOURCE FILE
              </label>
              <input
                type="file"
                name="question_bank"
                accept=".pdf,.txt,.text"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px dashed #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
              />
            </div>

            {uploadError && (
              <div
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '0.9rem',
                }}
              >
                {uploadError}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '18px',
                background: isUploading ? '#94a3b8' : '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                cursor: isUploading ? 'wait' : 'pointer',
                fontWeight: 800,
                fontSize: '1.1rem',
                transition: '0.2s',
                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)',
              }}
              onMouseOver={(e) => {
                if (!isUploading) e.currentTarget.style.background = '#1e293b';
              }}
              onMouseOut={(e) => {
                if (!isUploading) e.currentTarget.style.background = '#0f172a';
              }}
            >
              {isUploading ? '⌛ EXTRACTING CERTIFICATION PATTERNS...' : 'GENERATE WORKSPACE'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
