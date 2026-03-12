"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passesFilters = passesFilters;
exports.basicCleanText = basicCleanText;
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/u;
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const indianMobileRegex = /\b[6-9]\d{9}\b/;
const genericPhoneRegex = /(\+?\d{1,3}[- ]?)?\d{10,13}/;
function passesFilters(review, ctx) {
    const combined = `${review.title ?? ''} ${review.text ?? ''}`.trim();
    // Short reviews: drop if word count <= 7
    const wordCount = combined.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 7) {
        return false;
    }
    // Emojis
    if (emojiRegex.test(combined)) {
        return false;
    }
    // Emails
    if (emailRegex.test(combined)) {
        return false;
    }
    // Phone numbers
    if (indianMobileRegex.test(combined) || genericPhoneRegex.test(combined)) {
        return false;
    }
    // Duplicates
    const signature = combined.toLowerCase().replace(/\s+/g, ' ').trim();
    if (ctx.seenSignatures.has(signature)) {
        return false;
    }
    ctx.seenSignatures.add(signature);
    return true;
}
function basicCleanText(text) {
    // Remove emails and phone numbers but keep rest of the text
    return text
        .replace(emailRegex, '[redacted]')
        .replace(indianMobileRegex, '[redacted]')
        .replace(genericPhoneRegex, '[redacted]')
        .trim();
}
