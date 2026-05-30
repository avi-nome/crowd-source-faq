import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
import {
  semanticSearch,
  getTrending,
  getSuggest,
} from '../controllers/searchController.js';
import {
  submitUnresolved,
  getUnresolvedSearches,
  resolveUnresolved,
  getUnresolvedStats,
} from '../controllers/unresolvedSearchController.js';

const router = Router();

// ── Public search ──────────────────────────────────────────────────────────
router.get('/trending', getTrending);
router.get('/suggest',  getSuggest);

// ── Semantic search ─────────────────────────────────────────────────────────
router.post('/', protect, semanticSearch);

// ── Unresolved feedback ─────────────────────────────────────────────────────
// POST: capture "not resolved" search feedback (auth optional — uses token if present)
router.post('/unresolved', submitUnresolved);

// ── Admin: unresolved search management ────────────────────────────────────
router.get('/unresolved-list',         adminOnly, getUnresolvedSearches);
router.patch('/unresolved/:id/resolve', adminOnly, resolveUnresolved);
router.get('/unresolved-stats',        adminOnly, getUnresolvedStats);

export default router;