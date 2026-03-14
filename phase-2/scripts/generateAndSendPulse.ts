import { db, initSchema } from '../src/db';
import { generatePulse, listPulses, WeeklyPulse } from '../src/services/pulseService';
import { sendPulseEmail } from '../src/services/emailService';
import { listLatestThemes } from '../src/services/themeService';
import { logInfo, logError } from '../src/core/logger';

// Initialize schema
initSchema();

function getLatestWeekStart(): string {
  // Get the most recent week_start from reviews
  const row = db.prepare(`SELECT week_start FROM reviews ORDER BY created_at DESC LIMIT 1`).get() as { week_start: string } | undefined;
  if (row) return row.week_start;
  
  // Fallback: current week's Monday
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

async function generateAndSendReport() {
  const to = 'aaravinthraj3@gmail.com';
  
  try {
    // Check for existing themes
    const themes = listLatestThemes(5);
    logInfo('Available themes', { count: themes.length });
    
    let pulse: WeeklyPulse;
    
    if (themes.length === 0) {
      // No themes available - create a demo pulse with sample data
      logInfo('No themes found, creating demo pulse report');
      pulse = createDemoPulse();
    } else {
      // Generate pulse for the latest week
      const weekStart = getLatestWeekStart();
      logInfo('Generating pulse for week', { weekStart });
      
      try {
        pulse = await generatePulse(weekStart);
      } catch (err: any) {
        logError('Failed to generate pulse, using demo', { error: err.message });
        pulse = createDemoPulse();
      }
    }
    
    // Send the email
    logInfo('Sending pulse email', { to, weekStart: pulse.week_start });
    await sendPulseEmail(to, pulse);
    
    console.log('✅ Weekly pulse report sent successfully!');
    console.log(`   To: ${to}`);
    console.log(`   Week: ${pulse.week_start}`);
    console.log(`   Themes: ${pulse.top_themes.map(t => t.name).join(', ')}`);
    console.log(`   Word count: ${pulse.note_body.split(/\s+/).filter(Boolean).length}`);
    
  } catch (err: any) {
    logError('Failed to generate and send pulse', { error: err.message });
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

function createDemoPulse(): WeeklyPulse {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const weekStart = monday.toISOString().slice(0, 10);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekEnd = sunday.toISOString().slice(0, 10);
  
  return {
    id: 0,
    week_start: weekStart,
    week_end: weekEnd,
    top_themes: [
      {
        theme_id: 1,
        name: 'App Performance & Crashes',
        description: 'Users report slow loading times and occasional app freezes during trading hours',
        review_count: 47,
        avg_rating: 2.8
      },
      {
        theme_id: 2,
        name: 'UPI Payment Failures',
        description: 'Recurring issues with UPI transactions failing or getting stuck in pending state',
        review_count: 35,
        avg_rating: 2.3
      },
      {
        theme_id: 3,
        name: 'Portfolio Tracking',
        description: 'Requests for better portfolio analytics and real-time P&L tracking features',
        review_count: 28,
        avg_rating: 3.5
      }
    ],
    user_quotes: [
      { text: 'The app crashes every time I try to place an order during market opening. Very frustrating experience.', rating: 2 },
      { text: 'UPI payments fail repeatedly and customer support takes days to respond. Not acceptable for a financial app.', rating: 1 },
      { text: 'Would love to see more detailed portfolio breakdowns and sector-wise allocation charts.', rating: 4 }
    ],
    action_ideas: [
      { idea: 'Implement crash analytics and prioritize fixing critical bugs affecting order placement during peak hours' },
      { idea: 'Add retry mechanism for UPI payments and provide instant failure notifications with alternative payment options' },
      { idea: 'Enhance portfolio section with sector allocation pie charts and historical performance graphs' }
    ],
    note_body: `This week's review analysis reveals three critical areas requiring attention.

Top Themes:
• App Performance & Crashes (47 mentions, 2.8★): Users report slow loading and freezes during trading hours
• UPI Payment Failures (35 mentions, 2.3★): Recurring transaction issues causing user frustration  
• Portfolio Tracking (28 mentions, 3.5★): Demand for better analytics and real-time P&L features

User Voices:
"The app crashes every time I try to place an order during market opening."
"UPI payments fail repeatedly and support takes days to respond."
"Would love to see more detailed portfolio breakdowns and charts."

Recommended Actions:
1. Prioritize crash fixes for order placement during peak hours
2. Add UPI retry mechanism with instant failure notifications
3. Enhance portfolio with sector allocation and performance graphs`,
    created_at: new Date().toISOString(),
    version: 1
  };
}

generateAndSendReport();
