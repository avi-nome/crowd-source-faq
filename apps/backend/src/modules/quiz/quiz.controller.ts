import { Request, Response } from 'express';
import { Types } from 'mongoose';
import FAQ from '../faq/faq.model.js';
import { adminLog } from '../../utils/http/logger.js';

export interface QuizQuestion {
  faqId: string;
  question: string;
  options: string[];   // 4 options, shuffled
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Trim long answers to a snappy quiz option (avoids paragraph-length choices)
function toOptionText(answer: string): string {
  const clean = answer.replace(/\s+/g, ' ').trim();
  return clean.length > 120 ? clean.slice(0, 117) + '...' : clean;
}

/** GET /api/quiz/questions?batchId=&category=&limit=10
 *  Builds an MCQ set from approved FAQs. Distractors are pulled from
 *  other approved FAQs in the same category where possible, falling
 *  back to any approved FAQ if the category is too small. */
export async function generateQuiz(req: Request, res: Response): Promise<void> {
  try {
    const batchId = typeof req.query.batchId === 'string' && Types.ObjectId.isValid(req.query.batchId)
      ? new Types.ObjectId(req.query.batchId)
      : null;
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30);

    const baseFilter: Record<string, unknown> = { status: 'approved' };
    if (batchId) baseFilter.batchId = batchId;
    if (category) baseFilter.category = category;

    const pool = await FAQ.find(baseFilter)
      .select('question answer category')
      .limit(200)
      .lean();

    if (pool.length < 4) {
      res.status(422).json({ message: 'Not enough approved FAQs in this scope to build a quiz (need at least 4).' });
      return;
    }

    const picked = shuffle(pool).slice(0, limit);

    const questions: QuizQuestion[] = picked.map((faq) => {
      const sameCategory = pool.filter((f) => f.category === faq.category && String(f._id) !== String(faq._id));
      const distractorSource = sameCategory.length >= 3 ? sameCategory : pool.filter((f) => String(f._id) !== String(faq._id));
      const distractors = shuffle(distractorSource).slice(0, 3).map((f) => toOptionText(f.answer));

      const correctText = toOptionText(faq.answer);
      const options = shuffle([correctText, ...distractors]);
      const correctIndex = options.indexOf(correctText);

      return {
        faqId: String(faq._id),
        question: faq.question,
        options,
        correctIndex,
      };
    });

    res.json({ questions, total: questions.length });
  } catch (err) {
    adminLog.error(`[quiz] generateQuiz failed: ${(err as Error).message}`);
    res.status(500).json({ message: 'Failed to generate quiz.' });
  }
}
