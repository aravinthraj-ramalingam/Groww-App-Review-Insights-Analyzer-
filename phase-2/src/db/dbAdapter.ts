import { db, isPostgres, getPool } from './index';
import { Pool } from 'pg';

/**
 * Database Adapter - Provides a unified interface for SQLite and PostgreSQL
 */

export interface QueryResult {
  rows: any[];
  rowCount?: number;
}

export class DbAdapter {
  private usePostgres: boolean;
  private pool: Pool | null = null;

  constructor() {
    this.usePostgres = isPostgres();
    if (this.usePostgres) {
      this.pool = getPool();
    }
  }

  /**
   * Execute a query with parameters
   * SQLite uses ? placeholders, PostgreSQL uses $1, $2, etc.
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (this.usePostgres) {
      // Convert ? placeholders to $1, $2, etc. for PostgreSQL
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }
      
      const result = await this.pool!.query(pgSql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } else {
      // SQLite path
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      return {
        rows: rows as any[],
        rowCount: rows.length
      };
    }
  }

  /**
   * Execute a query and return first row
   */
  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Execute an INSERT/UPDATE/DELETE query
   */
  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    if (this.usePostgres) {
      // Convert ? placeholders to $1, $2, etc. for PostgreSQL
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }
      
      const result = await this.pool!.query(pgSql, params);
      
      // For INSERT, try to get the last inserted ID
      let lastID: number | undefined;
      if (sql.toLowerCase().includes('insert into')) {
        const idResult = await this.pool!.query('SELECT lastval()');
        lastID = parseInt(idResult.rows[0]?.lastval);
      }
      
      return {
        lastID,
        changes: result.rowCount || 0
      };
    } else {
      // SQLite path
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return {
        lastID: Number(info.lastInsertRowid),
        changes: info.changes
      };
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(callback: (adapter: DbAdapter) => Promise<T>): Promise<T> {
    if (this.usePostgres) {
      const client = await this.pool!.connect();
      try {
        await client.query('BEGIN');
        const txAdapter = new TransactionAdapter(client);
        const result = await callback(txAdapter);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLite transaction
      const tx = db.transaction(() => {
        return callback(this);
      });
      return tx();
    }
  }
}

/**
 * Transaction-specific adapter for PostgreSQL
 */
class TransactionAdapter extends DbAdapter {
  private client: any;

  constructor(client: any) {
    super();
    this.client = client;
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    let pgSql = sql;
    let paramIndex = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${paramIndex}`);
      paramIndex++;
    }
    
    const result = await this.client.query(pgSql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    let pgSql = sql;
    let paramIndex = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${paramIndex}`);
      paramIndex++;
    }
    
    const result = await this.client.query(pgSql, params);
    
    let lastID: number | undefined;
    if (sql.toLowerCase().includes('insert into')) {
      const idResult = await this.client.query('SELECT lastval()');
      lastID = parseInt(idResult.rows[0]?.lastval);
    }
    
    return {
      lastID,
      changes: result.rowCount || 0
    };
  }
}

// Export singleton instance
export const dbAdapter = new DbAdapter();
