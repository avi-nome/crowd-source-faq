/**
 * Seed SearchLogs with realistic demo data for testing admin analytics.
 * Run: node scripts/seedSearchLogs.js
 *
 * Generates N search log entries with:
 * - Realistic internship-related queries
 * - Varied result counts (including failed queries for failed query analytics)
 * - Timestamps spread over the last `days` parameter
 * - Mixed sources (faq vs community)
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import SearchLog from '../dist/models/SearchLog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yaksha_faq';

// Realistic internship FAQ queries
const QUERIES = [
  // High-frequency queries
  { query: 'offer letter', weight: 10 },
  { query: 'noc request', weight: 9 },
  { query: 'team formation', weight: 8 },
  { query: 'project submission deadline', weight: 8 },
  { query: 'certificate request', weight: 7 },
  { query: 'internship duration', weight: 7 },
  { query: 'stipend payment date', weight: 6 },
  { query: 'relieving letter', weight: 6 },
  { query: 'experience letter', weight: 6 },
  // Medium-frequency queries
  { query: 'how to request noc', weight: 5 },
  { query: 'project guidelines', weight: 5 },
  { query: 'attendance policy', weight: 5 },
  { query: 'remote work policy', weight: 4 },
  { query: 'leave application', weight: 4 },
  { query: 'holiday list', weight: 4 },
  { query: 'performance review', weight: 4 },
  { query: 'appraisal form', weight: 4 },
  { query: 'completion certificate', weight: 4 },
  { query: 'background verification', weight: 3 },
  { query: 'employee ID card', weight: 3 },
  // Failed queries (for failed query analytics)
  { query: 'salary slip', weight: 2 },
  { query: 'provident fund', weight: 2 },
  { query: 'health insurance claim', weight: 1 },
  { query: 'parking pass', weight: 1 },
  { query: 'business card request', weight: 1 },
  { query: 'macbook allocation', weight: 1 },
  { query: 'software license', weight: 1 },
  { query: 'travel reimbursement', weight: 1 },
  { query: 'esop allocation', weight: 1 },
  // Varied community queries
  { query: 'how to crack the interview', weight: 5 },
  { query: 'team allocation process', weight: 4 },
  { query: 'project technology stack', weight: 4 },
  { query: 'manager feedback', weight: 3 },
  { query: 'peer review process', weight: 3 },
  { query: 'code review guidelines', weight: 3 },
  { query: 'git workflow', weight: 3 },
  { query: 'deployment process', weight: 3 },
  { query: 'onboarding checklist', weight: 3 },
  { query: '1-on-1 schedule', weight: 2 },
];

const FAQ_SOURCE = 'faq';
const COMMUNITY_SOURCE = 'community';

function generateEntries(count, days, failRate) {
  const now = Date.now();
  const entries = [];

  // Build weighted query pool
  const pool = [];
  for (const { query, weight } of QUERIES) {
    for (let i = 0; i < weight; i++) pool.push(query);
  }
  if (pool.length === 0) throw new Error('Query pool is empty');

  for (let i = 0; i < count; i++) {
    const query = pool[Math.floor(Math.random() * pool.length)];
    const isFailed = Math.random() < failRate;
    const isCommunity = Math.random() < 0.3;
    const source = isCommunity ? COMMUNITY_SOURCE : FAQ_SOURCE;

    const offset = Math.random() * days * 24 * 60 * 60 * 1000;
    const createdAt = new Date(now - offset);

    entries.push({
      query,
      resultsCount: isFailed ? 0 : Math.floor(Math.random() * 8) + 1,
      topResultId: isFailed ? null : new mongoose.Types.ObjectId(),
      topResultSource: isFailed ? null : source,
      createdAt,
    });
  }

  return entries;
}

async function seed({ count, days, failRate }) {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const clear = process.argv.includes('--clear');
  if (clear) {
    console.log('Clearing existing SearchLog collection...');
    await SearchLog.deleteMany({});
    console.log('Cleared.\n');
  }

  console.log(`Generating ${count} search log entries over ${days} days...`);
  const entries = generateEntries(count, days, failRate);

  console.log('Inserting entries...');
  const CHUNK = 1000;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    await SearchLog.insertMany(chunk, { ordered: false });
    inserted += chunk.length;
    process.stdout.write(`\r  Inserted ${inserted}/${entries.length}...`);
  }
  console.log('\n');

  const total = await SearchLog.countDocuments();
  const failed = await SearchLog.countDocuments({ resultsCount: 0 });

  console.log('✅ Seed complete.');
  console.log(`   Total SearchLog documents: ${total}`);
  console.log(`   Failed queries (resultsCount=0): ${failed}`);
  console.log(`   Successful queries: ${total - failed}`);

  await mongoose.disconnect();
  process.exit(0);
}

// Parse CLI args: --count N --days N --fail-rate 0.0-1.0 --clear
const argv = process.argv.slice(2);
const count = parseInt(argv.find((a, i) => a === '--count' && argv[i + 1]) || '200');
const days = parseInt(argv.find((a, i) => a === '--days' && argv[i + 1]) || '14');
const failRate = parseFloat(argv.find((a, i) => a === '--fail-rate' && argv[i + 1]) || '0.15');

seed({ count, days, failRate }).catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});