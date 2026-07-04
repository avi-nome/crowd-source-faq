import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { generateQuiz } from './quiz.controller.js';

const router = Router();

// GET /api/quiz/questions — any logged-in user can request a quiz
router.get('/questions', protect, generateQuiz);

export default router;

