/**
 * Privacy-first OCR & matching utilities for Lost & Found (C1).
 * Privacy rule (CLAUDE.md §2.7, PROJECT_PLAN §8 C1):
 *   - Mask CNICs, CMS/student IDs, phone numbers, card numbers, and emails immediately.
 *   - Never store raw OCR text or expose OCR text in any API response.
 *   - Timeout/failure never blocks posting: falls back cleanly to manual keywords.
 */

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'near',
  'found',
  'lost',
  'item',
  'card',
  'nust',
  'islamabad',
  'pakistan',
  'valid',
  'date',
  'issue',
  'expiry',
  'student',
  'redacted',
]);

/**
 * Mask sensitive numbers (CNIC, phone, CMS/Reg IDs, bank/card numbers, emails)
 * and return sanitized matching text plus safe lowercase keywords.
 */
function maskSensitiveText(rawText) {
  const input = String(rawText || '');
  if (!input.trim()) return { maskedText: '', keywords: [] };

  let masked = input
    // CNIC: 12345-1234567-1 or 13 consecutive digits
    .replace(/\b\d{5}[-\s]?\d{7}[-\s]?\d\b/g, '[REDACTED]')
    // Emails
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED]')
    // Phone numbers (+92 / 03xx / dashed)
    .replace(/(?:\+?92|0)[-\s]?3\d{2}[-\s]?\d{7}\b/g, '[REDACTED]')
    // Any remaining 5+ digit number (CMS IDs, reg numbers, card numbers, serials)
    .replace(/\b\d{5,}\b/g, '[REDACTED]')
    // Spaced digit groups like 4111 2222 3333 4444
    .replace(/(?:\b\d{3,4}[-\s]+){2,}\d{3,4}\b/g, '[REDACTED]');

  masked = masked.replace(/\s+/g, ' ').trim().slice(0, 600);

  const tokens = masked
    .toLowerCase()
    .replace(/\[redacted\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));

  const keywords = [...new Set(tokens)].slice(0, 25);
  return { maskedText: masked, keywords };
}

/** Tokenize title, description, location, and manual keywords into normalized matching terms. */
function tokenizeItemText(item) {
  const combined = [item.title, item.description, item.location, item.manualKeywords].filter(Boolean).join(' ');
  const tokens = combined
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d{5,}$/.test(w) && !STOP_WORDS.has(w));
  const ocrTokens = Array.isArray(item.ocrKeywords) ? item.ocrKeywords : [];
  return new Set([...tokens, ...ocrTokens]);
}

/**
 * Run tesseract.js OCR on a local image path with a hard timeout so posting never hangs or fails.
 * Accepts an optional `recognizer` for deterministic testing without network/traineddata.
 */
async function extractOcrFromImage(filePath, { timeoutMs = 8000, recognizer } = {}) {
  const runOcr = async () => {
    if (typeof recognizer === 'function') {
      return recognizer(filePath);
    }
    const tesseract = require('tesseract.js');
    const result = await tesseract.recognize(filePath, 'eng');
    return result?.data?.text || '';
  };

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('OCR timed out')), timeoutMs);
  });

  try {
    const raw = await Promise.race([runOcr(), timeout]);
    const { maskedText, keywords } = maskSensitiveText(raw);
    return { ok: true, ocrStatus: 'completed', maskedText, keywords };
  } catch (err) {
    return { ok: false, ocrStatus: 'failed', maskedText: '', keywords: [], error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Score candidate opposite-type items for probable matches.
 * Returns matches sorted by score descending, exposing only public fields + match reasons.
 */
function findMatchesForItem(source, candidates, { minScore = 25, limit = 5 } = {}) {
  const sourceTokens = tokenizeItemText(source);
  const sourceDate = source.eventDate ? new Date(source.eventDate).getTime() : 0;
  const sourceLoc = String(source.location || '').toLowerCase().trim();

  const scored = [];
  for (const cand of candidates) {
    if (!cand || String(cand._id || cand.id) === String(source._id || source.id)) continue;
    if (cand.type === source.type) continue;
    if (cand.hidden || cand.status !== 'open') continue;

    let score = 0;
    const reasons = [];

    if (cand.category && source.category && cand.category === source.category) {
      score += 25;
      reasons.push('Same category');
    }

    const candTokens = tokenizeItemText(cand);
    const overlap = [...sourceTokens].filter((t) => candTokens.has(t));
    if (overlap.length > 0) {
      score += Math.min(50, overlap.length * 15);
      reasons.push(`Matching terms (${overlap.slice(0, 4).join(', ')})`);
    }

    const candLoc = String(cand.location || '').toLowerCase().trim();
    if (sourceLoc && candLoc && (candLoc.includes(sourceLoc) || sourceLoc.includes(candLoc))) {
      score += 15;
      reasons.push('Similar location');
    }

    if (sourceDate && cand.eventDate) {
      const diffDays = Math.abs(sourceDate - new Date(cand.eventDate).getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays <= 7) {
        score += 10;
        reasons.push('Within 7 days');
      }
    }

    if (score >= minScore) {
      scored.push({
        item: typeof cand.toPublic === 'function' ? cand.toPublic() : cand,
        score: Math.min(100, score),
        reasons,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

module.exports = { maskSensitiveText, tokenizeItemText, extractOcrFromImage, findMatchesForItem };
