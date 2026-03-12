"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const zod_1 = require("zod");
(0, node_test_1.default)('zod works in phase-2', () => {
    const S = zod_1.z.object({ ok: zod_1.z.boolean() });
    strict_1.default.deepEqual(S.parse({ ok: true }), { ok: true });
});
