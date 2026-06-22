export interface ExamPlan {
  id: string;
  title: string;
  created_at: string;
}

export interface Question {
  id: string;
  exam_plan_id: string;
  question_number: number;
  text: string;
  options: Record<string, string>;
}

export interface ProgressItem {
  question_id: string;
  question_number: number;
  status: 'green' | 'red' | 'gray';
  selected_answer?: string;
  explanation?: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}
