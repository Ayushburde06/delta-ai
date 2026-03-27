const express = require("express");
const router = express.Router();
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = "uploads/";
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const mimeToExt = {
            "audio/webm": ".webm",
            "audio/mp4": ".mp4",
            "audio/ogg": ".ogg",
            "audio/wav": ".wav",
            "audio/mpeg": ".mp3",
        };
        const ext = mimeToExt[file.mimetype] || ".webm";
        cb(null, `audio-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Unsupported: ${file.mimetype}`));
    },
});

// ─── Gemini Audio Transcription ───
async function transcribeWithGemini(filePath, mimeType) {
    // Read file as buffer
    const audioBuffer = fs.readFileSync(filePath);
    // Convert to base64
    const audioBase64 = audioBuffer.toString("base64");

    // Gemini supports audio directly
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType: mimeType || "audio/wav",
                data: audioBase64,
            },
        },
        {
            text: `Transcribe this audio exactly as spoken.
- Return ONLY the spoken words, nothing else
- No labels, no commentary, no extra text  
- Even if voice is very low or noisy, transcribe your best guess
- Language is English`,
        },
    ]);

    return result.response.text().trim();
}

router.post("/", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No audio file provided" });

    if (req.file.size < 500) {
        fs.unlink(req.file.path, () => { });
        return res.status(400).json({ error: "Audio too short or empty" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    console.log(`🎤 Transcribing | Size: ${req.file.size}b | Type: ${mimeType}`);

    try {
        const text = await transcribeWithGemini(filePath, mimeType);

        fs.unlink(filePath, (err) => { if (err) console.error("Delete error:", err); });

        if (!text) return res.json({ text: "", warning: "No speech detected" });

        console.log(`✅ Transcribed: "${text}"`);
        res.json({ text, model: "Gemini 3 Flash" });

    } catch (error) {
        console.error("❌ Gemini transcription error:", error.message);
        if (fs.existsSync(filePath)) fs.unlink(filePath, () => { });
        res.status(500).json({ error: "Transcription failed", details: error.message });
    }
});

module.exports = router;