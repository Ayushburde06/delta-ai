/**
 * RAG Pipeline Utilities
 * 
 * Uses TF-IDF based similarity for semantic search — no external embedding API needed.
 * This makes RAG free, fast, and works offline.
 */

const { PDFParse } = require("pdf-parse");

// ─── 1. TEXT EXTRACTION ─────────────────────────────────────────────────────

async function extractText(buffer, mimeType) {
    if (mimeType === "application/pdf") {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text;
    }
    // txt / md / plain text
    return buffer.toString("utf-8");
}

// ─── 2. CHUNKING ────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks.
 * @param {string} text
 * @param {number} chunkSize   words per chunk  (default 300)
 * @param {number} overlap     overlap in words (default 50)
 */
function chunkText(text, chunkSize = 300, overlap = 50) {
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(" ");
        if (chunk.trim().length > 20) {
            chunks.push(chunk.trim());
        }
        if (i + chunkSize >= words.length) break;
    }
    return chunks;
}

// ─── 3. TF-IDF EMBEDDINGS (local, no API) ───────────────────────────────────

// Stopwords to filter out common English words
const STOPWORDS = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "up", "about", "into", "over",
    "after", "and", "but", "or", "nor", "not", "so", "yet", "both", "either", "neither",
    "each", "every", "all", "any", "few", "more", "most", "other", "some", "such", "no",
    "only", "own", "same", "than", "too", "very", "just", "because", "as", "until", "while",
    "during", "before", "after", "above", "below", "between", "out", "off", "through",
    "then", "once", "here", "there", "when", "where", "why", "how", "what", "which", "who",
    "this", "that", "these", "those", "i", "me", "my", "we", "our", "you", "your", "he", "him",
    "his", "she", "her", "it", "its", "they", "them", "their"
]);

/**
 * Tokenize text into meaningful words (lowercased, no stopwords, no punctuation)
 */
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Build TF vector for a text (term frequency normalized by doc length)
 */
function buildTF(tokens) {
    const tf = {};
    for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }
    const len = tokens.length || 1;
    for (const key in tf) {
        tf[key] = tf[key] / len;
    }
    return tf;
}

/**
 * Build IDF from a corpus of TF vectors
 */
function buildIDF(tfVectors) {
    const n = tfVectors.length;
    const df = {};
    for (const tf of tfVectors) {
        for (const term of Object.keys(tf)) {
            df[term] = (df[term] || 0) + 1;
        }
    }
    const idf = {};
    for (const term in df) {
        idf[term] = Math.log((n + 1) / (df[term] + 1)) + 1; // smoothed IDF
    }
    return idf;
}

/**
 * Convert TF vector to TF-IDF using global IDF
 */
function tfIdfVector(tf, idf) {
    const vec = {};
    for (const term in tf) {
        vec[term] = tf[term] * (idf[term] || 1);
    }
    return vec;
}

/**
 * Cosine similarity between two sparse TF-IDF vectors
 */
function cosineSimilarity(vecA, vecB) {
    let dot = 0, magA = 0, magB = 0;
    const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    for (const term of allTerms) {
        const a = vecA[term] || 0;
        const b = vecB[term] || 0;
        dot += a * b;
        magA += a * a;
        magB += b * b;
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Create a simple numeric embedding from TF (for storage).
 * We store the raw TF object as JSON in MongoDB — lightweight and effective.
 */
function createEmbedding(text) {
    return buildTF(tokenize(text));
}

/**
 * Batch embed chunks (synchronous — no API calls needed!)
 */
function embedChunks(chunks) {
    return chunks.map((content, index) => ({
        content,
        index,
        embedding: createEmbedding(content)
    }));
}

// ─── 4. SEMANTIC SEARCH ─────────────────────────────────────────────────────

/**
 * Find the top-k most relevant chunks for a query.
 * Uses TF-IDF weighting with cosine similarity.
 */
function semanticSearch(query, allChunks, topK = 5) {
    // Build corpus TF vectors
    const chunkTFs = allChunks.map(c => {
        if (typeof c.embedding === "object" && !Array.isArray(c.embedding)) {
            return c.embedding; // Already a TF map from MongoDB
        }
        return createEmbedding(c.content);
    });

    const queryTF = buildTF(tokenize(query));

    // Build IDF from all chunks + query
    const allTFs = [...chunkTFs, queryTF];
    const idf = buildIDF(allTFs);

    // Convert to TF-IDF
    const queryVec = tfIdfVector(queryTF, idf);

    const scored = allChunks.map((chunk, i) => ({
        content: chunk.content,
        fileName: chunk.fileName,
        score: cosineSimilarity(queryVec, tfIdfVector(chunkTFs[i], idf))
    }));

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(r => r.score > 0.05); // Lower threshold for TF-IDF
}

// ─── 5. PROMPT TEMPLATE ─────────────────────────────────────────────────────

function buildRAGPrompt(relevantChunks) {
    if (!relevantChunks || relevantChunks.length === 0) return null;

    const context = relevantChunks
        .map((c, i) => `[Source ${i + 1}: ${c.fileName}]\n${c.content}`)
        .join("\n\n---\n\n");

    return `You are Delta AI, an intelligent assistant. You have been provided with relevant document excerpts to help answer the user's question accurately.

RETRIEVED CONTEXT:
${context}

INSTRUCTIONS:
- Answer the user's question using the context above as your primary reference.
- If the context doesn't fully answer the question, supplement with your own knowledge but clearly say so.
- Cite the source document name when referencing specific information.
- Be concise, accurate, and helpful.
- If the context is completely unrelated to the question, answer from your general knowledge.`;
}

module.exports = {
    extractText,
    chunkText,
    embedChunks,
    semanticSearch,
    buildRAGPrompt
};
