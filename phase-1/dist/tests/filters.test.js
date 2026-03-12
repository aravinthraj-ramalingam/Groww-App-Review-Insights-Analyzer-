"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const filters_1 = require("../scraper/filters");
(0, node_test_1.default)('basicCleanText redacts emails and phone numbers', () => {
    const input = 'Contact me at test@example.com or +91 9876543210';
    const out = (0, filters_1.basicCleanText)(input);
    strict_1.default.ok(!out.includes('test@example.com'));
    strict_1.default.ok(!out.includes('9876543210'));
    strict_1.default.match(out, /\[redacted\]/);
});
(0, node_test_1.default)('passesFilters drops short reviews (<=7 words)', () => {
    const ctx = { seenSignatures: new Set() };
    const ok = (0, filters_1.passesFilters)({ id: '1', title: '', text: 'Too short review here' }, ctx);
    strict_1.default.equal(ok, false);
});
(0, node_test_1.default)('passesFilters drops duplicates', () => {
    const ctx = { seenSignatures: new Set() };
    const r1 = (0, filters_1.passesFilters)({ id: '1', title: 'Hello', text: 'This is a longer unique review text' }, ctx);
    const r2 = (0, filters_1.passesFilters)({ id: '2', title: 'Hello', text: 'This is a longer unique review text' }, ctx);
    strict_1.default.equal(r1, true);
    strict_1.default.equal(r2, false);
});
