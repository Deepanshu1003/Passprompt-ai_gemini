import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ExamPlan, Question, UserAttempt, InterviewPlan } from './types';

interface DatabaseSchema {
  plans: ExamPlan[];
  questions: Question[];
  attempts: UserAttempt[];
  interviewPlans: InterviewPlan[];
}

const DB_PATH = path.resolve('./src/db.json');

let cache: DatabaseSchema | null = null;

async function loadDb(): Promise<DatabaseSchema> {
  if (cache) return cache;
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    cache = {
      plans: parsed.plans || [],
      questions: parsed.questions || [],
      attempts: parsed.attempts || [],
      interviewPlans: parsed.interviewPlans || []
    };
    return cache!;
  } catch (err) {
    cache = { plans: [], questions: [], attempts: [], interviewPlans: [] };
    await saveDb();
    return cache;
  }
}

async function saveDb(): Promise<void> {
  if (!cache) return;
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  } catch {}
  await fs.writeFile(DB_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

export const dbStore = {
  getPlans: async (deviceId?: string): Promise<ExamPlan[]> => {
    const db = await loadDb();
    if (!deviceId) return [];
    return db.plans.filter(p => p.device_id === deviceId);
  },
  
  getPlan: async (id: string, deviceId?: string): Promise<ExamPlan | null> => {
    const db = await loadDb();
    const plan = db.plans.find(p => p.id === id);
    if (!plan) return null;
    if (!deviceId || plan.device_id !== deviceId) {
      return null;
    }
    return plan;
  },

  createPlan: async (title: string, deviceId?: string): Promise<ExamPlan> => {
    const db = await loadDb();
    const newPlan: ExamPlan = {
      id: crypto.randomUUID(),
      title,
      created_at: new Date().toISOString(),
      device_id: deviceId
    };
    db.plans.push(newPlan);
    await saveDb();
    return newPlan;
  },

  deletePlan: async (id: string): Promise<void> => {
    const db = await loadDb();
    db.plans = db.plans.filter(p => p.id !== id);
    
    // Cascade delete questions
    const planQuestions = db.questions.filter(q => q.exam_plan_id === id);
    const planQuestionIds = planQuestions.map(q => q.id);
    db.questions = db.questions.filter(q => q.exam_plan_id !== id);
    
    // Cascade delete attempts
    db.attempts = db.attempts.filter(a => !planQuestionIds.includes(a.question_id));
    
    await saveDb();
  },

  getQuestions: async (planId: string): Promise<Question[]> => {
    const db = await loadDb();
    return db.questions
      .filter(q => q.exam_plan_id === planId)
      .sort((a, b) => a.question_number - b.question_number);
  },

  addQuestions: async (questions: Omit<Question, 'id'>[]): Promise<Question[]> => {
    const db = await loadDb();
    const inserted: Question[] = [];
    for (const q of questions) {
      const newQ: Question = {
        ...q,
        id: crypto.randomUUID()
      };
      db.questions.push(newQ);
      inserted.push(newQ);
    }
    await saveDb();
    return inserted;
  },

  getAttempts: async (planId: string, deviceId?: string): Promise<UserAttempt[]> => {
    const db = await loadDb();
    const planQuestionsIndex = new Set(
      db.questions.filter(q => q.exam_plan_id === planId).map(q => q.id)
    );
    const planAttempts = db.attempts.filter(a => planQuestionsIndex.has(a.question_id));
    if (!deviceId) return [];
    return planAttempts.filter(a => a.device_id === deviceId);
  },

  saveAttempt: async (attempt: Omit<UserAttempt, 'id' | 'attempted_at'> & { device_id?: string }): Promise<UserAttempt> => {
    const db = await loadDb();
    db.attempts = db.attempts.filter(
      a => !(a.question_id === attempt.question_id && a.device_id === attempt.device_id)
    );
    
    const newAttempt: UserAttempt = {
      ...attempt,
      id: crypto.randomUUID(),
      attempted_at: new Date().toISOString()
    };
    db.attempts.push(newAttempt);
    await saveDb();
    return newAttempt;
  },

  // ==========================================
  // NEW INTERVIEW PREPARATION ENDPOINTS (V2)
  // ==========================================

  getInterviewPlans: async (deviceId: string): Promise<InterviewPlan[]> => {
    const db = await loadDb();
    return db.interviewPlans.filter(p => p.device_id === deviceId);
  },

  getInterviewPlan: async (id: string, deviceId: string): Promise<InterviewPlan | null> => {
    const db = await loadDb();
    const found = db.interviewPlans.find(p => p.id === id);
    if (!found) return null;
    return found.device_id === deviceId ? found : null;
  },

  saveInterviewPlan: async (plan: InterviewPlan): Promise<InterviewPlan> => {
    const db = await loadDb();
    db.interviewPlans = db.interviewPlans.filter(p => p.id !== plan.id);
    db.interviewPlans.push(plan);
    await saveDb();
    return plan;
  },

  deleteInterviewPlan: async (id: string): Promise<void> => {
    const db = await loadDb();
    db.interviewPlans = db.interviewPlans.filter(p => p.id !== id);
    await saveDb();
  }
};
