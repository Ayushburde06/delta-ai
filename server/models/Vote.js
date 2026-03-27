const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
    {
        prompt: {
            type: String,
            required: true,
        },
        winner: {
            type: String,
            required: true,
            enum: ["gemini", "groq"],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vote", voteSchema);
