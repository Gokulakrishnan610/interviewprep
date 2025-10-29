/**
 * Interview Bot Server - LiveKit Integration
 * This server creates LiveKit rooms and tokens for interview practice sessions
 */

import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'APIabMqmQ8P4aRx';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'BrhWkwtTeBmYqeMIXEOqpnQFhG3Vvkfz3bffOezzKJQK';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://interviewapp-86itzjcd.livekit.cloud';

// Store active sessions
const activeSessions = new Map();

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    livekit: {
      api_key: !!LIVEKIT_API_KEY,
      api_secret: !!LIVEKIT_API_SECRET,
      url: LIVEKIT_URL
    },
    active_sessions: activeSessions.size
  });
});

/**
 * Create interview session with LiveKit
 */
app.post('/api/create-interview-session', async (req, res) => {
  try {
    const { user_id, session_type = 'practice', difficulty = 'intermediate' } = req.body;

    console.log('🎯 Creating interview session...');

    // Generate unique room name
    const roomName = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create participant token for user
    const userToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `user-${user_id}`,
      name: `Interview Candidate`,
      ttl: '1h', // 1 hour expiration
    });

    userToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    // Create agent token for the interview bot
    const agentToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: 'interview-bot',
      name: 'AI Interview Coach',
      ttl: '1h', // 1 hour expiration
    });

    agentToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    // Generate JWT tokens
    const userTokenJwt = await userToken.toJwt();
    const agentTokenJwt = await agentToken.toJwt();

    // Store session info
    const sessionInfo = {
      roomName,
      userId: user_id,
      sessionType: session_type,
      difficulty,
      createdAt: new Date(),
      status: 'created'
    };

    activeSessions.set(roomName, sessionInfo);

    console.log('✅ Interview session created:', roomName);

    res.json({
      success: true,
      session: {
        room_name: roomName,
        user_token: userTokenJwt,
        agent_token: agentTokenJwt,
        livekit_url: LIVEKIT_URL,
        session_type: session_type,
        difficulty: difficulty
      }
    });
  } catch (error) {
    console.error('❌ Error creating interview session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get session status
 */
app.get('/api/session/:room_name', (req, res) => {
  const { room_name } = req.params;
  const session = activeSessions.get(room_name);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    session: session
  });
});

/**
 * End interview session
 */
app.delete('/api/session/:room_name', (req, res) => {
  const { room_name } = req.params;
  const session = activeSessions.get(room_name);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  // Mark session as ended
  session.status = 'ended';
  session.endedAt = new Date();

  // Clean up after some time
  setTimeout(() => {
    activeSessions.delete(room_name);
  }, 300000); // 5 minutes

  res.json({
    success: true,
    message: 'Session ended'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🎯 Interview Bot Server - LiveKit Integration');
  console.log('========================================');
  console.log(`   Port: ${PORT}`);
  console.log(`   LiveKit URL: ${LIVEKIT_URL}`);
  console.log(`   API Key: ${LIVEKIT_API_KEY ? '✅' : '❌'}`);
  console.log(`   API Secret: ${LIVEKIT_API_SECRET ? '✅' : '❌'}`);
  console.log('========================================');
  console.log(`\n� Server running at http://localhost:${PORT}`);
  console.log(`\n💡 Endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/create-interview-session`);
  console.log(`   GET  /api/session/:room_name`);
  console.log(`   DELETE /api/session/:room_name`);
  console.log(`\n🤖 Interview bot ready for LiveKit sessions!\n`);
});
