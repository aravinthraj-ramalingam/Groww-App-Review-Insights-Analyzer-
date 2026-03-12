"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    databaseFile: process.env.DATABASE_FILE || 'phase1.db',
    port: Number(process.env.PORT || 4001)
};
