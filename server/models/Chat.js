const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    response: {
      type: String,
      required: true,
    },
    thinkingSteps: {
      type: String,
    },
    suggestedQuestions: {
      type: [String],
      default: []
    },
    classification: {
      type: String,
      enum: ["problem", "attempt", "breakthrough", "solution", "exploration"],
      default: "exploration",
    },
    inputMethod: {
      type: String,
      enum: ["voice", "text"],
      default: "text",
    },
    modelUsed: {
      type: String,
      default: "Gemini 1.5 Flash",
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Chat", chatSchema);
