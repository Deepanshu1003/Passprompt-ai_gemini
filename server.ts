import express, { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

import { dbStore } from './src/db.js';
import { parseQuestionFile } from './src/parser.js';
import { streamEvaluation, streamChat } from './src/ai_service.js';

const app = express();
const PORT = 3000;

// Setup upload parser
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

// API routes FIRST
app.post('/api/upload', upload.single('question_bank'), async (req: Request, res: Response) => {
  const planTitle = req.body.plan_title;
  const file = req.file;
  const deviceId = req.headers['x-device-id'] as string | undefined;

  if (!planTitle || !file) {
    res.status(400).json({ detail: 'plan_title and question_bank file are required.' });
    return;
  }

  const originalFilename = file.originalname || 'upload.pdf';
  const tempPath = path.join('uploads', `temp_${Date.now()}_${originalFilename}`);

  try {
    // Rename current multer temp file to preserve suffix/extension for identification
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.copyFile(file.path, tempPath);
    await fs.unlink(file.path); // remove old multer file

    console.log(`[SERVER] Uploaded path: ${tempPath}, original: ${originalFilename}`);
    
    // Parse Questions
    const extracted = await parseQuestionFile(tempPath, originalFilename);

    if (extracted.length === 0) {
      res.status(400).json({
        detail: 'No questions could be extracted from this file. Please check the format: questions should begin with "Question #1" or "1." followed by lettered options (A. B. C. D.).'
      });
      return;
    }

    // Create a new ExamPlan with device isolation
    const plan = await dbStore.createPlan(planTitle, deviceId);

    // Save questions
    const questionsToInsert = extracted.map(q => ({
      exam_plan_id: plan.id,
      question_number: q.question_number,
      text: q.text,
      options: q.options
    }));

    await dbStore.addQuestions(questionsToInsert);

    res.json({
      exam_plan_id: plan.id,
      total_questions: extracted.length
    });

  } catch (err: any) {
    console.error('[SERVER] Upload process fails:', err);
    res.status(422).json({ detail: err.message || 'Validation and extraction failed.' });
  } finally {
    // Delete temp file
    try {
      await fs.unlink(tempPath);
    } catch {}
  }
});

app.get('/api/plans', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const plans = await dbStore.getPlans(deviceId);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve plans' });
  }
});

app.get('/api/plans/:plan_id', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const plan = await dbStore.getPlan(req.params.plan_id, deviceId);
    if (!plan) {
      res.status(404).json({ detail: 'Plan not found' });
      return;
    }
    res.json(plan);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve plan' });
  }
});

app.delete('/api/plans/:plan_id', async (req: Request, res: Response) => {
  try {
    await dbStore.deletePlan(req.params.plan_id);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to delete plan' });
  }
});

app.get('/api/plans/:plan_id/questions', async (req: Request, res: Response) => {
  try {
    const questions = await dbStore.getQuestions(req.params.plan_id);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve questions' });
  }
});

app.get('/api/plans/:plan_id/progress', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const questions = await dbStore.getQuestions(req.params.plan_id);
    const attempts = await dbStore.getAttempts(req.params.plan_id, deviceId);

    const attemptsMap = new Map();
    for (const a of attempts) {
      attemptsMap.set(a.question_id, a);
    }

    const progress = questions.map(q => {
      let status = 'gray';
      const att = attemptsMap.get(q.id);
      if (att) {
        status = att.is_correct ? 'green' : 'red';
      }
      return {
        question_id: q.id,
        question_number: q.question_number,
        status: status,
        selected_answer: att ? att.selected_answer : undefined,
        explanation: att ? att.explanation : undefined
      };
    });

    res.json(progress);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve progress' });
  }
});

app.post('/api/evaluate', async (req: Request, res: Response) => {
  const { question_id, selected_answer } = req.body;
  const deviceId = req.headers['x-device-id'] as string | undefined;
  
  if (!question_id || !selected_answer) {
    res.status(400).json({ detail: 'question_id and selected_answer are required' });
    return;
  }

  try {
    // Find the question first
    const plans = await dbStore.getPlans(deviceId);
    let question = null;
    for (const p of plans) {
      const qs = await dbStore.getQuestions(p.id);
      const found = qs.find(q => q.id === question_id);
      if (found) {
        question = found;
        break;
      }
    }

    if (!question) {
      res.status(404).json({ detail: 'Question not found' });
      return;
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const evaluationGenerator = streamEvaluation(question.text, question.options, selected_answer);
    let fullResponseText = '';

    for await (const chunk of evaluationGenerator) {
      fullResponseText += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    // Determine graded correctness
    const firstLine = fullResponseText.trim().split('\n')[0] || '';
    const isCorrect = !firstLine.toUpperCase().includes('INCORRECT');

    // Save attempt inside database
    await dbStore.saveAttempt({
      question_id: question.id,
      selected_answer: selected_answer,
      is_correct: isCorrect,
      explanation: fullResponseText,
      device_id: deviceId
    });

    res.end();

  } catch (err: any) {
    console.error('[SERVER] Evaluate error:', err);
    res.status(500).json({ detail: err.message || 'Evaluation process failed' });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  const { question_text, ai_explanation, user_message } = req.body;

  if (!question_text || !ai_explanation || !user_message) {
    res.status(400).json({ detail: 'question_text, ai_explanation, and user_message are required' });
    return;
  }

  try {
    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const chatGenerator = streamChat(question_text, ai_explanation, user_message);

    for await (const chunk of chatGenerator) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.end();

  } catch (err: any) {
    console.error('[SERVER] Chat error:', err);
    res.status(500).json({ detail: err.message || 'Chat process failed' });
  }
});

// Vite server setup or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('./dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
