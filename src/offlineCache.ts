import { ExamPlan, Question, ProgressItem } from './types';

const PLANS_CACHE_KEY = 'promptpass_cached_plans';
const QUESTIONS_CACHE_KEY = (planId: string) => `promptpass_cached_questions_${planId}`;
const PROGRESS_CACHE_KEY = (planId: string) => `promptpass_cached_progress_${planId}`;

/**
 * Saves study plans to localStorage
 */
export function cachePlans(plans: ExamPlan[]): void {
  try {
    localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(plans));
  } catch (err) {
    console.warn('[OFFLINE CACHE] Failed to cache plans list:', err);
  }
}

/**
 * Retrieves study plans from localStorage
 */
export function getCachedPlans(): ExamPlan[] {
  try {
    const data = localStorage.getItem(PLANS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Saves question set of a specific study plan to localStorage
 */
export function cacheQuestions(planId: string, questions: Question[]): void {
  try {
    localStorage.setItem(QUESTIONS_CACHE_KEY(planId), JSON.stringify(questions));
  } catch (err) {
    console.warn(`[OFFLINE CACHE] Failed to cache questions for plan ${planId}:`, err);
  }
}

/**
 * Retrieves questions of a specific study plan from localStorage
 */
export function getCachedQuestions(planId: string): Question[] {
  try {
    const data = localStorage.getItem(QUESTIONS_CACHE_KEY(planId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Saves progress of a specific study plan to localStorage
 */
export function cacheProgress(planId: string, progress: ProgressItem[]): void {
  try {
    localStorage.setItem(PROGRESS_CACHE_KEY(planId), JSON.stringify(progress));
  } catch (err) {
    console.warn(`[OFFLINE CACHE] Failed to cache progress for plan ${planId}:`, err);
  }
}

/**
 * Retrieves progress for a specific study plan from localStorage
 */
export function getCachedProgress(planId: string): ProgressItem[] {
  try {
    const data = localStorage.getItem(PROGRESS_CACHE_KEY(planId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Helper to check online status (or network availability)
 */
export function isUserOnline(): boolean {
  if (typeof window !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true;
}
