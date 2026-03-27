require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini3() {
    const key = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(key);

    const mIdentifer = "gemini-3-flash-preview";
    try {
        console.log(`Testing Gemini 3: ${mIdentifer}`);
        const model = genAI.getGenerativeModel({ model: mIdentifer });
        const result = await model.generateContent("Hi");
        console.log(`✅ ${mIdentifer} worked:`, result.response.text());
    } catch (err) {
        console.error(`❌ ${mIdentifer} failed:`, err.message);
    }
}

testGemini3();
