"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groq = void 0;
exports.groqJson = groqJson;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_1 = require("../config/env");
exports.groq = env_1.config.groqApiKey
    ? new groq_sdk_1.default({ apiKey: env_1.config.groqApiKey })
    : null;
async function groqJson(params) {
    if (!exports.groq) {
        throw new Error('GROQ_API_KEY is not set');
    }
    const completion = await exports.groq.chat.completions.create({
        model: env_1.config.groqModel,
        temperature: 0.2,
        messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: `${params.user}\n\nReturn ONLY valid JSON.\nSchema:\n${params.schemaHint}` }
        ]
    });
    const content = completion.choices?.[0]?.message?.content ?? '';
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    const jsonText = firstBrace !== -1 && lastBrace !== -1 ? content.slice(firstBrace, lastBrace + 1) : content;
    return JSON.parse(jsonText);
}
