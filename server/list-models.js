require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Using Key:", key ? (key.substring(0, 5) + "...") : "MISSING");

    // The SDK itself doesn't have a simple listModels, but we can use fetch
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName}) [${m.supportedGenerationMethods.join(', ')}]`);
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

listModels();
