/**
 * RAG Routes
 * POST   /api/rag/upload          — Upload & index a document
 * GET    /api/rag/documents        — List all user's uploaded documents
 * DELETE /api/rag/documents/:id   — Delete a document + its chunks
 * POST   /api/rag/chat            — RAG-powered chat with SSE streaming
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DocumentChunk = require("../models/DocumentChunk");
const { protect } = require("../middleware/authMiddleware");
const { extractText, chunkText, embedChunks, semanticSearch, buildRAGPrompt } = require("../utils/ragPipeline");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Multer: memory storage, 20 MB, PDF/TXT/MD only ─────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const extAllowed = [".pdf", ".txt", ".md"];
        const ext = "." + file.originalname.split(".").pop().toLowerCase();
        if (extAllowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, TXT, and Markdown files are supported."));
        }
    }
});

// ─── POST /api/rag/upload ────────────────────────────────────────────────────
router.post("/upload", protect, upload.single("document"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded." });

        const { originalname, buffer, mimetype } = req.file;
        const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const userId = req.user._id.toString();

        console.log(`📄 Processing: ${originalname} (${(buffer.length / 1024).toFixed(1)} KB)`);

        // 1. Extract text
        const rawText = await extractText(buffer, mimetype);
        if (!rawText || rawText.trim().length < 50) {
            return res.status(400).json({ error: "Could not extract meaningful text from this document." });
        }

        // 2. Chunk
        const chunks = chunkText(rawText, 300, 50);
        console.log(`✂️  ${chunks.length} chunks`);
        if (chunks.length > 200) {
            return res.status(400).json({ error: "Document is too large (max ~50,000 words)." });
        }

        // 3. Embed
        console.log("🧠 Generating embeddings...");
        const embeddedChunks = await embedChunks(chunks);

        // 4. Save to MongoDB
        const docs = embeddedChunks.map(ec => ({
            documentId,
            fileName: originalname,
            fileType: mimetype.includes("pdf") ? "pdf" : "txt",
            userId,
            chunkIndex: ec.index,
            content: ec.content,
            embedding: ec.embedding
        }));
        await DocumentChunk.insertMany(docs);
        console.log(`✅ Indexed ${docs.length} chunks for "${originalname}"`);

        res.json({ success: true, documentId, fileName: originalname, chunks: docs.length });
    } catch (err) {
        console.error("RAG upload error:", err);
        res.status(500).json({ error: err.message || "Failed to process document." });
    }
});

// ─── GET /api/rag/documents ──────────────────────────────────────────────────
router.get("/documents", protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const docs = await DocumentChunk.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: "$documentId",
                    fileName: { $first: "$fileName" },
                    fileType: { $first: "$fileType" },
                    chunkCount: { $sum: 1 },
                    createdAt: { $first: "$createdAt" }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch documents." });
    }
});

// ─── DELETE /api/rag/documents/:id ──────────────────────────────────────────
router.delete("/documents/:id", protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const result = await DocumentChunk.deleteMany({ documentId: req.params.id, userId });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete document." });
    }
});

// ─── POST /api/rag/chat ──────────────────────────────────────────────────────
// SSE streaming RAG chat
router.post("/chat", protect, async (req, res) => {
    try {
        const { prompt, documentIds, model: modelId = "gemini-1.5-flash" } = req.body;
        const userId = req.user._id.toString();

        if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required." });

        // 1. Load chunks
        const query = documentIds?.length
            ? { userId, documentId: { $in: documentIds } }
            : { userId };

        const allChunks = await DocumentChunk.find(query).select("content embedding fileName").lean();

        // 2. Semantic search + build RAG prompt
        let retrievedChunks = [];
        let systemPrompt = "You are Delta AI, a helpful and intelligent assistant.";

        if (allChunks.length > 0) {
            retrievedChunks = await semanticSearch(prompt, allChunks, 5);
            const ragPrompt = buildRAGPrompt(retrievedChunks);
            if (ragPrompt) systemPrompt = ragPrompt;
        }

        // 3. Stream with Gemini
        const modelName = modelId.includes("gemini") ? modelId : "gemini-1.5-flash";
        const geminiModel = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const streamResult = await geminiModel.generateContentStream(prompt);

        for await (const chunk of streamResult.stream) {
            res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
        }

        // Done event with sources
        const sources = [...new Set(retrievedChunks.map(c => c.fileName))];
        res.write(`data: ${JSON.stringify({ done: true, sources, chunksUsed: retrievedChunks.length })}\n\n`);
        res.end();

    } catch (err) {
        console.error("RAG chat error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || "RAG chat failed." });
        } else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});

module.exports = router;
