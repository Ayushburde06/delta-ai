# Delta AI — Gen AI Chat & Prompt Engineering Assistant

Delta is a full-stack Generative AI application I built to solve real-world problems using **Prompt Engineering** and **RAG (Retrieval-Augmented Generation)**. It allows users to chat with multiple AI models (Google Gemini and Llama 3) and ask questions directly based on uploaded documents.

This project was built from scratch to demonstrate strong problem-solving skills in a **Gen AI environment**.

## 🚀 Key Features Built

- **Custom RAG Pipeline:** Users can upload PDFs or Text files. The app reads the text, creates embeddings using Google's `text-embedding-004`, and runs semantic search.
- **Advanced Prompt Engineering:** I engineered dynamic system prompts to inject retrieved document chunks into the AI's context. This stops the AI from hallucinating and forces it to answer only from the uploaded data.
- **Multiple AI Models:** Integrated both **Google Gemini** and **Llama 3.3** via API to compare reasoning styles. 
- **Voice Input & Speech:** Added Voice-to-Text and Text-to-Speech to make the application accessible.
- **Custom Similarity Search:** Instead of using an expensive external vector database, I wrote a custom cosine similarity algorithm mathematically in Node.js to match user queries with document chunks in MongoDB.

## 🛠️ Technology Stack (ATS Keywords)

- **AI & Data:** Generative AI (Gen AI), Prompt Engineering, Large Language Models (Gemini, Llama 3), Retrieval-Augmented Generation (RAG), Vector Embeddings (`text-embedding-004`), Semantic Search.
- **Backend Core:** Node.js, Express.js, RESTful APIs.
- **Database:** MongoDB, Mongoose (Used for document chunk storage & retrieval).
- **Frontend App:** Next.js (React), TypeScript, TailwindCSS.

## 📁 Project Architecture Highlights

- `/server/routes/rag.js`: Handles document text extraction and prompt injection (Prompt Engineering focus).
- `/server/utils/ragPipeline.js`: The core problem-solving logic for document text chunking and executing the cosine similarity search.
- `/chat-frontend`: A responsive, dark-mode user interface designed to feel like modern AI chatbots (ChatGPT inspired).

## ⚙️ How to Run Locally

### 1. Requirements
- Node.js (v18+)
- A MongoDB connection (Local or free Atlas tier)
- Free API keys from Google API Studio (Gemini) and Groq (Llama)

### 2. Installation
Clone the repository and install dependencies for both the frontend and backend:
```bash
# Install backend packages
cd server
npm install

# Install frontend packages
cd ../chat-frontend
npm install
```

### 3. Environment Config
In the `/server` folder, create a `.env` file with these values:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret_string
```

### 4. Start the Application
Open two separate terminal windows:
```bash
# Terminal 1: Start Backend Server
cd server
node server.js
```
```bash
# Terminal 2: Start Frontend UI
cd chat-frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

## 🎯 What I Learned

Building this project taught me how to practically apply Generative AI concepts rather than just reading about them. I gained hands-on experience dealing with AI context windows, writing effective system prompts (Prompt Engineering), chunking data for LLMs, and solving complex web architecture problems using Next.js and Node.js.