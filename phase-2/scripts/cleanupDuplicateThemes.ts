import { db, initSchema } from '../src/db';
import { logInfo, logError } from '../src/core/logger';

// Initialize schema
initSchema();

function cleanupDuplicateThemes() {
  try {
    logInfo('Starting theme cleanup...');
    
    // Find duplicate theme names
    const duplicates = db.prepare(`
      SELECT name, COUNT(*) as count
      FROM themes
      GROUP BY name
      HAVING count > 1
    `).all() as { name: string; count: number }[];
    
    logInfo(`Found ${duplicates.length} duplicate theme names`, duplicates);
    
    // For each duplicate, keep only the most recent one
    for (const dup of duplicates) {
      // Get all themes with this name, ordered by created_at DESC
      const themes = db.prepare(`
        SELECT id, name, created_at
        FROM themes
        WHERE name = ?
        ORDER BY created_at DESC
      `).all(dup.name) as { id: number; name: string; created_at: string }[];
      
      // Keep the first one (most recent), delete the rest
      const keepId = themes[0].id;
      const deleteIds = themes.slice(1).map(t => t.id);
      
      logInfo(`Keeping theme id ${keepId}, deleting ids: ${deleteIds.join(', ')}`);
      
      // Delete review_themes associations first (foreign key constraint)
      for (const id of deleteIds) {
        db.prepare('DELETE FROM review_themes WHERE theme_id = ?').run(id);
      }
      
      // Delete duplicate themes
      for (const id of deleteIds) {
        db.prepare('DELETE FROM themes WHERE id = ?').run(id);
      }
    }
    
    // Show remaining themes
    const remaining = db.prepare('SELECT id, name, created_at FROM themes ORDER BY created_at DESC').all();
    logInfo('Remaining themes after cleanup:', remaining);
    
    logInfo('Theme cleanup completed successfully!');
  } catch (err) {
    logError('Error cleaning up themes', err);
  }
}

cleanupDuplicateThemes();
