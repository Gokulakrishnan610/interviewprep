/**
 * LiveKit Service for Interview Practice
 * Handles connection to LiveKit rooms with Beyond Presence agent
 */

import { Room, RoomEvent, Track } from 'livekit-client';

export interface LiveKitConfig {
  url: string;
  token: string;
  roomName: string;
}

export class LiveKitService {
  private room: Room | null = null;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onParticipantConnectedCallback?: (participantName: string) => void;
  private onTrackSubscribedCallback?: (track: any) => void;

  /**
   * Connect to LiveKit room
   */
  async connect(config: LiveKitConfig): Promise<Room> {
    try {
      console.log('🔌 Connecting to LiveKit room:', config.roomName);

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
            frameRate: 30,
          },
        },
      });

      // Set up event listeners
      this.setupEventListeners();

      // Connect to room
      await this.room.connect(config.url, config.token);

      console.log('✅ Connected to LiveKit room');
      
      // Enable local audio and video
      await this.room.localParticipant.setMicrophoneEnabled(true);
      await this.room.localParticipant.setCameraEnabled(true);

      return this.room;
    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for room events
   */
  private setupEventListeners() {
    if (!this.room) return;

    // Room connected
    this.room.on(RoomEvent.Connected, () => {
      console.log('✅ Room connected');
      this.onConnectedCallback?.();
    });

    // Room disconnected
    this.room.on(RoomEvent.Disconnected, () => {
      console.log('🔌 Room disconnected');
      this.onDisconnectedCallback?.();
    });

    // Participant connected (Beyond Presence agent)
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('👤 Participant connected:', participant.identity);
      this.onParticipantConnectedCallback?.(participant.identity);
    });

    // Track subscribed (audio/video from agent)
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('🎬 Track subscribed:', track.kind, 'from', participant.identity);
      this.onTrackSubscribedCallback?.(track);

      // Auto-attach audio tracks
      if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
        console.log('🔊 Audio track attached');
      }

      // Auto-attach video tracks
      if (track.kind === Track.Kind.Video) {
        console.log('📹 Video track available');
      }
    });

    // Track unsubscribed
    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('🔇 Track unsubscribed:', track.kind);
      track.detach();
    });
  }

  /**
   * Disconnect from room
   */
  async disconnect() {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      console.log('🔌 Disconnected from LiveKit room');
    }
  }

  /**
   * Toggle microphone
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.room) return false;
    
    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled);
    console.log(`🎤 Microphone ${!enabled ? 'enabled' : 'disabled'}`);
    return !enabled;
  }

  /**
   * Toggle camera
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.room) return false;
    
    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!enabled);
    console.log(`📹 Camera ${!enabled ? 'enabled' : 'disabled'}`);
    return !enabled;
  }

  /**
   * Get room instance
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * Set callback for when connected
   */
  onConnected(callback: () => void) {
    this.onConnectedCallback = callback;
  }

  /**
   * Set callback for when disconnected
   */
  onDisconnected(callback: () => void) {
    this.onDisconnectedCallback = callback;
  }

  /**
   * Set callback for when participant connects
   */
  onParticipantConnected(callback: (participantName: string) => void) {
    this.onParticipantConnectedCallback = callback;
  }

  /**
   * Set callback for when track is subscribed
   */
  onTrackSubscribed(callback: (track: any) => void) {
    this.onTrackSubscribedCallback = callback;
  }
}

/**
 * Get LiveKit token from backend
 */
export async function getLivekitToken(roomName: string, participantName: string): Promise<string> {
  try {
    const response = await fetch('http://127.0.0.1:8002/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_name: roomName,
        participant_name: participantName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get LiveKit token');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('❌ Error getting LiveKit token:', error);
    throw error;
  }
}

/**
 * Start Beyond Presence agent in room
 */
export async function startBeyondPresenceAgent(roomName: string): Promise<void> {
  try {
    // Get token for the agent
    const token = await getLivekitToken(roomName, 'beyond-presence-agent');

    // Create Beyond Presence agent
    const response = await fetch('http://127.0.0.1:8002/api/beyond-presence/create-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatar_id: '694c83e2-8895-4a98-bd16-56332ca3f449',
        livekit_token: token,
        livekit_url: 'wss://interviewapp-86itzjcd.livekit.cloud',
        name: 'Interview Coach',
        system_prompt:
          'You are a professional interview coach. Ask the candidate thoughtful questions, provide constructive feedback, and keep the conversation natural and supportive.',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start Beyond Presence agent');
    }

    const agentData = await response.json();
    console.log('✅ Beyond Presence agent started:', agentData);

    const agentId =
      agentData?.agent_id ??
      agentData?.data?.agent_id ??
      agentData?.data?.id ??
      agentData?.id;

    if (!agentId) {
      console.error('❌ Missing agent_id in Beyond Presence agent response', agentData);
      throw new Error('Beyond Presence agent_id missing');
    }

    // Kick off Beyond Presence call so the avatar joins the room
    const callResponse = await fetch('http://127.0.0.1:8002/api/beyond-presence/create-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatar_id: '694c83e2-8895-4a98-bd16-56332ca3f449',
        agent_id: agentId,
        livekit_token: token,
        livekit_url: 'wss://interviewapp-86itzjcd.livekit.cloud',
        language: 'english',
      }),
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      console.error('❌ Beyond Presence call error response:', errorText);
      throw new Error('Failed to start Beyond Presence call');
    }

    const callData = await callResponse.json();
    console.log('✅ Beyond Presence call started:', callData);
  } catch (error) {
    console.error('❌ Error starting Beyond Presence agent:', error);
    throw error;
  }
}
