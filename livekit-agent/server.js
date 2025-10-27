/**
 * Simple Express server for Beyond Presence integration
 * This works with Beyond Presence's built-in agent system
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Store conversation history
const conversations = new Map();

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    gemini: !!process.env.GEMINI_API_KEY,
    beyondPresence: !!process.env.BEY_API_KEY,
  });
});

/**
 * Create Beyond Presence call
 */
app.post('/api/create-call', async (req, res) => {
  try {
    const { avatar_id, livekit_url, livekit_token, language = 'english' } = req.body;

    console.log('📞 Creating Beyond Presence call...');

    const response = await axios.post(
      'https://api.bey.dev/v1/calls',
      {
        avatar_id,
        livekit_url,
        livekit_token,
        language,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.BEY_API_KEY,
        },
      }
    );

    console.log('✅ Beyond Presence call created:', response.data);

    res.json({
      success: true,
      call_id: response.data.call_id,
      data: response.data,
    });
  } catch (error) {
    console.error('❌ Error creating call:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

/**
 * Generate AI response using Gemini
 */
app.post('/api/generate-response', async (req, res) => {
  try {
    const { session_id, message, context } = req.body;

    console.log('🤖 Generating response for session:', session_id);

    // Get or create conversation history
    if (!conversations.has(session_id)) {
      conversations.set(session_id, []);
    }

    const history = conversations.get(session_id);

    // Add user message
    history.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Create chat with history
    const chat = model.startChat({
      history: history.slice(0, -1),
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 200,
      },
    });

    // Generate response
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    // Add assistant response to history
    history.push({
      role: 'model',
      parts: [{ text: responseText }],
    });

    console.log('✅ Response generated');

    res.json({
      success: true,
      response: responseText,
      session_id,
    });
  } catch (error) {
    console.error('❌ Error generating response:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clear conversation history
 */
app.delete('/api/conversation/:session_id', (req, res) => {
  const { session_id } = req.params;
  conversations.delete(session_id);
  res.json({ success: true, message: 'Conversation cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 Interview Practice Server');
  console.log('========================================');
  console.log(`   Port: ${PORT}`);
  console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
  console.log(`   Beyond Presence: ${process.env.BEY_API_KEY ? '✅' : '❌'}`);
  console.log('========================================');
  console.log(`\n📡 Server running at http://localhost:${PORT}`);
  console.log(`\n💡 Endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/create-call`);
  console.log(`   POST /api/generate-response`);
  console.log(`\n✨ Ready to handle requests!\n`);
});
