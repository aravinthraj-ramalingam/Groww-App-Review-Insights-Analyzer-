"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initSchema = initSchema;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const env_1 = require("../config/env");
const logger_1 = require("../core/logger");
exports.db = new better_sqlite3_1.default(env_1.config.databaseFile);
function initSchema() {
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      text TEXT NOT NULL,
      clean_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      raw_payload TEXT
    );
  `);
    exports.db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reviews_week_start
      ON reviews (week_start);
  `);
    (0, logger_1.logInfo)('Database schema initialized');
}
