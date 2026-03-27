const fs = require('fs');
const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testTranscription() {
    try {
        console.log("Testing Groq Transcription...");
        // create a dummy file if needed, or check if one exists
        const testFile = 'test.webm';

        // If we don't have a real audio file, this test will fail on the API call
        // but we can at least check if the SDK initializes.
        // I will try to list models instead first to verify API key.

        console.log("Verifying API Key by listing models...");
        const models = await groq.models.list();
        console.log("Models list success, key is valid.");

        console.log("Attempting transcription (this will fail if no test.webm exists)...");
        if (!fs.existsSync(testFile)) {
            console.log("No test.webm found, skipping actual transcription call.");
            return;
        }

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(testFile),
            model: "whisper-large-v3",
            response_format: "json",
            temperature: 0.0,
        });

        console.log("Transcription result:", transcription.text);

    } catch (err) {
        console.error("Test failed:", err);
    }
}

testTranscription();
