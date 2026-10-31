import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// System prompt grounding the AI assistant with Siddharth's portfolio facts
const SIDDHARTH_CONTEXT = `
You are the interactive AI Assistant for Siddharth Kumar Rai's professional portfolio.
Your role is to represent Siddharth warmly, accurately, and professionally to visitors, recruiters, collaborators, and clients.

Identity & Bio:
- Name: Siddharth Kumar Rai
- Title: Computer Science Engineer & Full Stack Developer | AI Engineer
- Education & Specialization: Computer Science Engineering; expert in modern MERN stack development and LLM-powered AI agent systems.
- Core Values: Believes AI is not merely a tool, but an intelligent collaborator to create scalable, efficient, and reliable software.
- Email: siddharthkumarrai23@gmail.com
- Phone: +91 7319792636
- GitHub: https://github.com/SiddharthRai22
- LinkedIn: https://www.linkedin.com/in/iam-siddharth
- Resume: https://drive.google.com/file/d/1rlSyY2S-oedBJThZis471Je3EzJezm0j/view?usp=sharing

Key Projects:
1. "My Train":
   - Summary: Real-time Indian Railways tracker.
   - Stack: Next.js, TypeScript, Tailwind CSS, mapping APIs, weather & elevation APIs.
   - Highlights: Live tracking, station progress timeline, delay detection, local halt weather forecast, elevation profiling, intelligent caching.
   - Live URL: https://my-train.onrender.com
   - GitHub: https://github.com/SiddharthRai22/My-Train

2. "AI Travel Planner":
   - Summary: Multi-agent cooperative travel planning system.
   - Stack: Python, LangGraph, LangChain, Groq, Tavily, Streamlit.
   - Highlights: Specialized sub-agents coordinate flight searches, hotel discovery, and personalized day-by-day itineraries without context loss.
   - GitHub: https://github.com/SiddharthRai22/Travel-AI-Agent

3. "AI Website Generator":
   - Summary: Intelligent website generation platform from natural language briefs.
   - Stack: Next.js, Tailwind CSS, TypeScript, OpenAI/Gemini APIs.
   - Highlights: Live real-time preview, component composition, interactive code export.
   - GitHub: https://github.com/SiddharthRai22/AI-Website-Generator

4. "College AI Assistant":
   - Summary: Campus and academic knowledge retrieval assistant.
   - Stack: Next.js, TypeScript, Tailwind CSS, Vector DB / RAG.
   - Highlights: Accurate semantic search over syllabus, schedules, and campus queries.

5. "Research Agent":
   - Summary: Autonomous literature research and document reasoning agent.
   - Stack: Python, LangChain, Tavily, ChromaDB.
   - Highlights: Synthesizes scholarly papers, extracts citations, and builds comprehensive summaries.

6. "Finance Dashboard":
   - Summary: Real-time financial insights and budgeting dashboard.
   - Stack: React, TypeScript, Chart.js, Tailwind CSS.

Core Skills & Technologies:
- Programming Languages: Python, JavaScript (ES6+), TypeScript, Java, SQL
- Frontend: React 19, Next.js, Tailwind CSS, Motion/Framer Motion, Three.js / WebGL
- Backend: Node.js, Express, RESTful APIs, System Design
- AI / Generative AI: LangChain, LangGraph, AI Agents, Retrieval-Augmented Generation (RAG), Vector Databases (ChromaDB, Pinecone), Model Context Protocol (MCP), Prompt Engineering
- Databases: MongoDB, PostgreSQL, SQL, Vector DB
- Core CS: Data Structures & Algorithms (DSA), System Design, Object-Oriented Design
- Developer Tools: Git, GitHub, Postman, Linux

Interaction Tone:
- Professional, welcoming, concise, and enthusiastic about software craftsmanship and AI.
- Format responses cleanly with brief paragraphs and bullet points if helpful.
- Suggest contacting Siddharth via email (siddharthkumarrai23@gmail.com) or checking his projects section when relevant.
- If asked unrelated topics, gently pivot back to Siddharth's work and background.
`;

// AI Assistant endpoint
app.post('/api/assistant/chat', async (req, res) => {
  try {
    dotenv.config({ override: true });

    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const rawKey =
      process.env.GROK_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.XAI_API_KEY;

    const grokKey = rawKey?.trim();
    const grokModel = (process.env.GROK_MODEL || 'openai/gpt-oss-120b').trim();

    // 1. If Grok / Groq / OpenAI compatible API key is configured, use it with model openai/gpt-oss-120b:
    if (grokKey) {
      try {
        let baseURL = (process.env.GROK_BASE_URL || process.env.GROQ_BASE_URL)?.trim();
        if (!baseURL) {
          if (grokKey.startsWith('gsk_')) {
            baseURL = 'https://api.groq.com/openai/v1';
          } else if (grokKey.startsWith('sk-or-')) {
            baseURL = 'https://openrouter.ai/api/v1';
          } else if (grokKey.startsWith('xai-')) {
            baseURL = 'https://api.x.ai/v1';
          } else {
            baseURL = 'https://api.groq.com/openai/v1';
          }
        }

        const client = new OpenAI({
          apiKey: grokKey,
          baseURL,
        });

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: SIDDHARTH_CONTEXT },
        ];

        if (Array.isArray(history)) {
          for (const turn of history.slice(-8)) {
            if (turn && typeof turn.text === 'string') {
              messages.push({
                role: turn.role === 'model' ? 'assistant' : 'user',
                content: turn.text,
              });
            }
          }
        }

        messages.push({ role: 'user', content: message });

        const completion = await client.chat.completions.create({
          model: grokModel,
          messages,
          temperature: 0.7,
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (reply) {
          return res.json({ reply, model: grokModel });
        }
      } catch (grokError: any) {
        console.error('Grok/OpenAI API execution error:', grokError);
        const errMsg = grokError?.message || 'Error communicating with Grok AI';
        return res.status(500).json({
          error: `Grok API error with model ${grokModel}: ${errMsg}. Please verify your key and base URL in .env.`,
        });
      }
    }

    // 2. If no Grok key yet in .env, check for Gemini as fallback
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history)) {
        for (const turn of history.slice(-8)) {
          if (turn && (turn.role === 'user' || turn.role === 'model') && typeof turn.text === 'string') {
            contents.push({
              role: turn.role,
              parts: [{ text: turn.text }],
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      let reply = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction: SIDDHARTH_CONTEXT,
          },
        });
        reply = response.text || '';
      } catch (primaryErr: any) {
        console.warn('Fallback primary retry with gemini-3.8-flash:', primaryErr?.message);
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SIDDHARTH_CONTEXT,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
        });
        reply = fallbackResponse.text || '';
      }

      return res.json({
        reply: reply || 'I could not generate a response. Please reach out to Siddharth directly!',
        model: 'gemini-3.1-flash-lite',
      });
    }

    // 3. Neither key configured
    return res.status(503).json({
      error: 'Please set GROK_API_KEY in your .env file to enable responses using model openai/gpt-oss-120b.',
    });
  } catch (error: any) {
    console.error('Gemini API assistant error:', error);
    const message = error?.message || 'Failed to generate response. Please try again.';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Assistant & Portfolio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
