const mongoose = require("mongoose");

const DocumentChunkSchema = new mongoose.Schema({
    // Parent document info
    documentId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true }, // pdf | txt | md
    userId: { type: String, index: true }, // optional: per-user docs

    // Chunk content
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },

    // TF embedding (word frequency map, used for TF-IDF similarity)
    embedding: { type: mongoose.Schema.Types.Mixed, required: true },

    // Metadata
    createdAt: { type: Date, default: Date.now }
});

// Index for fast filtering by document
DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

module.exports = mongoose.model("DocumentChunk", DocumentChunkSchema);
