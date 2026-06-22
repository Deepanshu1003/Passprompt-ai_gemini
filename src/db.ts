import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ExamPlan {
  id: string;
  title: string;
  created_at: string;
  device_id?: string;
}

export interface Question {
  id: string;
  exam_plan_id: string;
  question_number: number;
  text: string;
  options: Record<string, string>;
}

export interface UserAttempt {
  id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  explanation: string;
  attempted_at: string;
  device_id?: string;
}

interface DatabaseSchema {
  plans: ExamPlan[];
  questions: Question[];
  attempts: UserAttempt[];
}

const DB_PATH = path.resolve('./src/db.json');

let cache: DatabaseSchema | null = null;

async function loadDb(): Promise<DatabaseSchema> {
  if (cache) return cache;
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    cache = JSON.parse(data);
    return cache!;
  } catch (err) {
    cache = { plans: [], questions: [], attempts: [] };
    await saveDb();
    return cache;
  }
}

async function saveDb(): Promise<void> {
  if (!cache) return;
  // Ensure the directory exists
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
    // Unique check by question_id and device_id
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
  }
};
