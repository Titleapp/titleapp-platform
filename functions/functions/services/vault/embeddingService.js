"use strict";

/**
 * embeddingService.js — OpenAI text-embedding-3-small batch embeddings
 *
 * Generates 1536-dimensional embeddings for document chunks.
 * Batches requests to stay within API limits.
 *
 * Exports: generateEmbeddings, MODEL, DIMENSIONS
 */

const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;
const BATCH_SIZE = 20; // OpenAI supports up to 2048 inputs but keep batches small for reliability

let _client;
function getClient() {
  if (!_client) {
    const { OpenAI } = require("openai");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Generate embeddings for an array of text strings.
 *
 * @param {string[]} texts — array of text chunks to embed
 * @returns {Promise<number[][]>} — array of 1536-dim float arrays
 */
async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];

  const client = getClient();
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({
      model: MODEL,
      input: batch,
    });

    // Sort by index to ensure order matches input
    const sorted = response.data.sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

module.exports = { generateEmbeddings, MODEL, DIMENSIONS };
