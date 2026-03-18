"use strict";

/**
 * textChunker.js — Split text into ~500-token chunks with 50-token overlap.
 *
 * Token estimation: ~4 chars per token (conservative for English text).
 * Breaks at paragraph or sentence boundaries when possible.
 *
 * Exports: chunkText, TARGET_TOKENS, OVERLAP_TOKENS
 */

const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 50;

/**
 * Split text into overlapping chunks optimized for embedding retrieval.
 *
 * @param {string} text — full document text
 * @param {object} [options]
 * @param {number} [options.targetTokens=500] — target tokens per chunk
 * @param {number} [options.overlapTokens=50] — overlap tokens between chunks
 * @returns {Array<{text: string, startOffset: number, endOffset: number, tokenEstimate: number, index: number}>}
 */
function chunkText(text, options = {}) {
  const targetChars = (options.targetTokens || TARGET_TOKENS) * CHARS_PER_TOKEN;
  const overlapChars = (options.overlapTokens || OVERLAP_TOKENS) * CHARS_PER_TOKEN;

  if (!text || text.length === 0) return [];

  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + targetChars, text.length);

    // Try to break at a natural boundary if not at end of text
    if (endIndex < text.length) {
      const windowStart = Math.max(endIndex - 200, startIndex);
      const windowEnd = Math.min(endIndex + 200, text.length);
      const searchWindow = text.substring(windowStart, windowEnd);
      const windowOffset = endIndex - windowStart;

      // Prefer paragraph break
      const paraBreak = searchWindow.lastIndexOf("\n\n", windowOffset + 200);
      if (paraBreak !== -1 && paraBreak >= 100) {
        endIndex = windowStart + paraBreak + 2;
      } else {
        // Settle for sentence break
        const sentenceBreak = searchWindow.lastIndexOf(". ", windowOffset + 200);
        if (sentenceBreak !== -1 && sentenceBreak >= 50) {
          endIndex = windowStart + sentenceBreak + 2;
        }
      }
    }

    const chunkContent = text.substring(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        text: chunkContent,
        startOffset: startIndex,
        endOffset: endIndex,
        tokenEstimate: Math.ceil(chunkContent.length / CHARS_PER_TOKEN),
        index: chunks.length,
      });
    }

    // Move start forward, accounting for overlap
    const nextStart = endIndex - overlapChars;
    if (nextStart <= startIndex) {
      // Prevent infinite loop — force advance
      startIndex = endIndex;
    } else {
      startIndex = nextStart;
    }

    if (endIndex >= text.length) break;
  }

  return chunks;
}

module.exports = { chunkText, TARGET_TOKENS, OVERLAP_TOKENS };
