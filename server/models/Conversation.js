const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        title: {
            type: String,
            required: true,
            default: "New Chat",
        },
        problemContext: {
            goal: String,
            triedBefore: String,
            skillLevel: String
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Conversation", conversationSchema);
