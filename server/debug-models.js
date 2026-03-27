require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    console.log("Checking API Key: ", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
    for (const m of models) {
        try {
            console.log(`Testing ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hi");
            console.log(`✅ ${m}: ${result.response.text().substring(0, 50)}`);
        } catch (err) {
            console.log(`❌ ${m}: ${err.message}`);
        }
    }
}
test();
