import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { generateThemesFromReviews, upsertThemes } from '../src/services/themeService';
import { listRecentReviews } from '../src/services/reviewsRepo';
import { assignWeekReviews } from '../src/services/assignmentService';
import { generatePulse } from '../src/services/pulseService';
import { sendPulseEmail } from '../src/services/emailService';
import { initSchema } from '../src/db';

async function runFullPipeline() {
  try {
    console.log('--- Initializing DB Pipeline ---');
    initSchema();

    console.log('\n--- 1. Generating Themes ---');
    const reviews = listRecentReviews(12, 20);
    console.log(`Loaded ${reviews.length} recent reviews.`);
    if (reviews.length === 0) {
      console.log('No reviews found in DB. Make sure you ran phase-1 scraper first.');
      return;
    }
    const themes = await generateThemesFromReviews(reviews);
    const ids = upsertThemes(themes);
    console.log(`Generated ${themes.length} themes.`);

    // Pick the week of the most recent review
    const weekStart = reviews[0].week_start;
    console.log(`\n--- 2. Assigning Themes for week ${weekStart} ---`);
    const assignStats = await assignWeekReviews(weekStart);
    console.log(`Assigned themes:`, assignStats);

    console.log(`\n--- 3. Generating Weekly Pulse ---`);
    const pulse = await generatePulse(weekStart);
    console.log(`Pulse generated for week ${pulse.week_start}`);

    console.log(`\n--- 4. Sending Weekly Pulse Email ---`);
    const to = 'aravinthrajramalingam@gmail.com';
    await sendPulseEmail(to, pulse);
    console.log(`✅ Weekly pulse email successfully sent to ${to}`);
    
  } catch (err: any) {
    console.error('\n❌ Pipeline failed:');
    console.error(err);
  }
}

runFullPipeline();
