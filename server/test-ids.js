require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    const m = "gemini-2.0-flash";
    try {
        console.log(`Testing ${m}...`);
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("Hi");
        console.log(`✅ ${m}: ${result.response.text().substring(0, 10)}...`);
    } catch (err) {
        console.log(`❌ ${m}: ${err.message}`);
    }
}
test();
