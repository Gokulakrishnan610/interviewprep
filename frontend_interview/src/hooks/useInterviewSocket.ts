/**
 * useInterviewSocket
 *
 * Self-contained hook that owns the entire WebSocket + audio lifecycle for a
 * live interview session. The page just calls this hook and reads state from it.
 *
 * WebSocket URL:  ws(s)://host/ws/interview/{sessionId}?token={accessToken}
 * Auth:           JWT access token passed as query param (browser WS can't set headers)
 *
 * Audio capture:
 *   - Uses MediaRecorder with audio/webm;codecs=opus (falls back to audio/webm)
 *   - While the user holds the mic button, 250 ms chunks are sent as audio_chunk
 *     with chunk_final=false
 *   - On release, one final chunk is sent with chunk_final=true, telling the
 *     backend to flush the buffer to Deepgram
 *
 * Ping/keepalive:
 *   - A ping is sent every 25 seconds to keep the connection alive through
 *     proxies / NAT that close idle WebSockets
 */

import { useEffect, useRef, useCallback, useReducer } from 'react';
import type { WsInboundMessage, WsOutboundMessage } from '../types';

// ── Turn history entry ────────────────────────────────────────────────────────
export interface TurnHistoryEntry {
  turnNumber: number;
  question: string;
  answer: string;   // populated from transcript_final when the next question arrives
}

// ── Public state shape ────────────────────────────────────────────────────────

export type WsConnectionStatus =
  | 'idle'          // hook mounted, not yet started
  | 'connecting'    // WebSocket opening
  | 'connected'     // handshake received from server
  | 'disconnected'  // clean close or error
  | 'error';        // non-recoverable failure

export interface InterviewSocketState {
  connectionStatus: WsConnectionStatus;
  /** Current question text from the server */
  currentQuestion: string | null;
  /** 0-based index of the current question */
  turnNumber: number;
  /** Total questions for this session */
  totalTurns: number;
  /** Server is generating the next question */
  isThinking: boolean;
  /** Partial real-time transcript (while speaking) */
  transcriptPartial: string;
  /** Confirmed final transcript for current turn */
  transcriptFinal: string;
  /** Whether the mic is actively recording */
  isRecording: boolean;
  /** Whether mic permission has been granted */
  micGranted: boolean;
  /** Recoverable warning from server */
  warning: string | null;
  /** Non-recoverable error — interview cannot continue */
  fatalError: string | null;
  /** Session ended — report generation triggered */
  sessionEnded: boolean;
  /** ID of the session that just ended */
  endedSessionId: number | null;
  /** Accumulates completed Q&A pairs as the interview progresses */
  turnHistory: TurnHistoryEntry[];
  /** Browser TTS is currently speaking a question aloud */
  isSpeaking: boolean;
}
// ── Hook actions / reducer ────────────────────────────────────────────────────
type Action =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED'; turnNumber: number; totalTurns: number }
  | { type: 'THINKING' }
  | { type: 'QUESTION'; turnNumber: number; questionText: string; totalTurns: number }
  | { type: 'TRANSCRIPT_PARTIAL'; text: string }
  | { type: 'TRANSCRIPT_FINAL'; text: string }
  | { type: 'SESSION_ENDED'; sessionId: number }
  | { type: 'WARNING'; message: string }
  | { type: 'FATAL_ERROR'; message: string }
  | { type: 'RECORDING_START' }
  | { type: 'RECORDING_STOP' }
  | { type: 'MIC_GRANTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'CLEAR_WARNING' }
  | { type: 'PUSH_HISTORY'; entry: TurnHistoryEntry }
  | { type: 'SPEAKING_START' }
  | { type: 'SPEAKING_STOP' };
const initialState: InterviewSocketState = {
  connectionStatus: 'idle',
  currentQuestion: null,
  turnNumber: 0,
  totalTurns: 0,
  isThinking: false,
  transcriptPartial: '',
  transcriptFinal: '',
  isRecording: false,
  micGranted: false,
  warning: null,
  fatalError: null,
  sessionEnded: false,
  endedSessionId: null,
  turnHistory: [],
  isSpeaking: false,
};
function reducer(state: InterviewSocketState, action: Action): InterviewSocketState {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, connectionStatus: 'connecting', fatalError: null, warning: null };
    case 'CONNECTED':
      return {
        ...state,
        connectionStatus: 'connected',
        turnNumber: action.turnNumber,
        totalTurns: action.totalTurns,
      };
    case 'THINKING':
      return { ...state, isThinking: true, transcriptPartial: '', transcriptFinal: '' };
    case 'QUESTION':
      return {
        ...state,
        isThinking: false,
        currentQuestion: action.questionText,
        turnNumber: action.turnNumber,
        totalTurns: action.totalTurns,
        transcriptPartial: '',
        transcriptFinal: '',
      };
    case 'PUSH_HISTORY':
      return { ...state, turnHistory: [...state.turnHistory, action.entry] };
    case 'SPEAKING_START':
      return { ...state, isSpeaking: true };
    case 'SPEAKING_STOP':
      return { ...state, isSpeaking: false };    case 'TRANSCRIPT_PARTIAL':
      return { ...state, transcriptPartial: action.text };
    case 'TRANSCRIPT_FINAL':
      return { ...state, transcriptFinal: action.text, transcriptPartial: '' };
    case 'SESSION_ENDED':
      return {
        ...state,
        sessionEnded: true,
        endedSessionId: action.sessionId,
        connectionStatus: 'disconnected',
      };
    case 'WARNING':
      return { ...state, warning: action.message };
    case 'CLEAR_WARNING':
      return { ...state, warning: null };
    case 'FATAL_ERROR':
      return { ...state, fatalError: action.message, connectionStatus: 'error' };
    case 'RECORDING_START':
      return { ...state, isRecording: true };
    case 'RECORDING_STOP':
      return { ...state, isRecording: false };
    case 'MIC_GRANTED':
      return { ...state, micGranted: true };
    case 'DISCONNECTED':
      return { ...state, connectionStatus: 'disconnected' };
    default:
      return state;
  }
}
// ── Hook ──────────────────────────────────────────────────────────────────────
const WS_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api')
  .replace(/^http/, 'ws')      // http → ws, https → wss
  .replace(/\/api$/, '');      // strip /api suffix — WS is at root
const PING_INTERVAL_MS  = 25_000;
const AUDIO_CHUNK_MS    = 250;   // MediaRecorder timeslice
function chooseMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}
export function useInterviewSocket(
  sessionId: number | null,
  /** Pass null when the session hasn't been started yet */
  accessToken: string | null,
) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const wsRef            = useRef<WebSocket | null>(null);
  const mediaRecRef      = useRef<MediaRecorder | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const pingTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef   = useRef(false);  // shadow of state.isRecording for callbacks
  const sessionEndedRef  = useRef(false);  // avoids stale-closure read in ws.onclose
  const utteranceRef     = useRef<SpeechSynthesisUtterance | null>(null);
  // Tracks the last transcript_final so it can be stored in history when the
  // next question arrives (we don't know the answer until the turn is over)
  const lastTranscriptRef = useRef<string>('');
  // Tracks the question text for the current turn so we can archive it
  const lastQuestionRef   = useRef<string>('');
  // ── Send helper ─────────────────────────────────────────────────────────
  const sendJson = useCallback((msg: WsOutboundMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ── Browser TTS ──────────────────────────────────────────────────────────
  // Uses the Web Speech API (SpeechSynthesis) to read questions aloud.
  // Completely optional: if the browser doesn't support it, we just skip.
  const speakQuestion = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    // Cancel any in-flight utterance before starting a new one
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate   = 0.95;
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;

    // Prefer a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.localService)
    ) ?? voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => dispatch({ type: 'SPEAKING_START' });
    utterance.onend   = () => dispatch({ type: 'SPEAKING_STOP' });
    utterance.onerror = () => dispatch({ type: 'SPEAKING_STOP' });

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancelSpeech = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    dispatch({ type: 'SPEAKING_STOP' });
  }, []);
  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!sessionId || !accessToken) return;
    if (wsRef.current) return; // already open
    dispatch({ type: 'CONNECTING' });
    const url = `${WS_BASE_URL}/ws/interview/${sessionId}?token=${accessToken}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // ping to keep proxies alive
      pingTimerRef.current = setInterval(() => {
        sendJson({ type: 'ping' });
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: WsInboundMessage;
      try {
        msg = JSON.parse(event.data) as WsInboundMessage;
      } catch {
        return;
      }
      handleMessage(msg);
    };

    ws.onerror = () => {
      dispatch({ type: 'FATAL_ERROR', message: 'WebSocket connection failed.' });
    };

    ws.onclose = (ev) => {
      clearPing();
      // If we closed because of an auth/not-found error (4001/4003/4004), report it
      if (ev.code === 4001 || ev.code === 4003) {
        dispatch({ type: 'FATAL_ERROR', message: 'Authentication failed. Please refresh and try again.' });
      } else if (ev.code === 4004) {
        dispatch({ type: 'FATAL_ERROR', message: 'Session not found or not active.' });
      } else if (!sessionEndedRef.current) {
        dispatch({ type: 'DISCONNECTED' });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, accessToken]);

  // ── Message handler ──────────────────────────────────────────────────────
  function handleMessage(msg: WsInboundMessage) {
    switch (msg.type) {
      case 'connected':
        dispatch({ type: 'CONNECTED', turnNumber: msg.turn_number, totalTurns: msg.total_turns });
        break;
      case 'thinking':
        cancelSpeech();
        dispatch({ type: 'THINKING' });
        break;
      case 'question': {
        // Before rendering the new question, push the previous turn into history
        if (msg.turn_number > 0 && lastQuestionRef.current) {
          dispatch({
            type: 'PUSH_HISTORY',
            entry: {
              turnNumber: msg.turn_number - 1,
              question: lastQuestionRef.current,
              answer: lastTranscriptRef.current,
            },
          });
        }
        lastTranscriptRef.current = '';
        lastQuestionRef.current   = msg.question_text;

        dispatch({
          type: 'QUESTION',
          turnNumber: msg.turn_number,
          questionText: msg.question_text,
          totalTurns: msg.total_turns,
        });
        setTimeout(() => speakQuestion(msg.question_text), 80);
        break;
      }
      case 'transcript_partial':
        dispatch({ type: 'TRANSCRIPT_PARTIAL', text: msg.text });
        break;
      case 'transcript_final':
        lastTranscriptRef.current = msg.text;
        dispatch({ type: 'TRANSCRIPT_FINAL', text: msg.text });
        break;
      case 'turn_saved':
        // acknowledged — no UI update needed
        break;
      case 'session_ended':
        sessionEndedRef.current = true;
        dispatch({ type: 'SESSION_ENDED', sessionId: msg.session_id });
        cleanup();
        break;
      case 'error':
        if (msg.recoverable) {
          dispatch({ type: 'WARNING', message: msg.detail });
        } else {
          dispatch({ type: 'FATAL_ERROR', message: msg.detail });
          cleanup();
        }
        break;
      case 'pong':
        break;
    }
  }

  // ── Mic / recording ──────────────────────────────────────────────────────

  const requestMic = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      dispatch({ type: 'MIC_GRANTED' });
      return stream;
    } catch {
      dispatch({ type: 'WARNING', message: 'Microphone access denied. Please allow microphone and refresh.' });
      return null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecordingRef.current) return;
    const mimeType = chooseMimeType();
    const options  = mimeType ? { mimeType } : undefined;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, options);
    } catch {
      dispatch({ type: 'WARNING', message: 'Could not start recording. Try a different browser.' });
      return;
    }

    recorder.ondataavailable = async (ev: BlobEvent) => {
      if (!ev.data || ev.data.size === 0) return;

      const buffer = await ev.data.arrayBuffer();
      const bytes  = new Uint8Array(buffer);
      let binary   = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);

      sendJson({
        type: 'audio_chunk',
        audio_data: b64,
        mime_type: mimeType || 'audio/webm',
        chunk_final: false,
      });
    };

    recorder.start(AUDIO_CHUNK_MS);
    mediaRecRef.current = recorder;
    isRecordingRef.current = true;
    dispatch({ type: 'RECORDING_START' });
  }, [sendJson]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current || !mediaRecRef.current) return;
    isRecordingRef.current = false;
    dispatch({ type: 'RECORDING_STOP' });

    const recorder = mediaRecRef.current;

    // Capture the last chunk then send chunk_final=true
    recorder.addEventListener('dataavailable', async (ev: Event) => {
      const blobEv = ev as BlobEvent;
      if (blobEv.data && blobEv.data.size > 0) {
        const buffer = await blobEv.data.arrayBuffer();
        const bytes  = new Uint8Array(buffer);
        let binary   = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        sendJson({
          type: 'audio_chunk',
          audio_data: b64,
          mime_type: recorder.mimeType || 'audio/webm',
          chunk_final: true,
        });
      } else {
        // No last-chunk data — still signal end of utterance
        sendJson({
          type: 'audio_chunk',
          audio_data: '',
          mime_type: recorder.mimeType || 'audio/webm',
          chunk_final: true,
        });
      }
    }, { once: true });

    recorder.stop();
    mediaRecRef.current = null;
  }, [sendJson]);

  // ── End session ──────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    sendJson({ type: 'end_session' });
  }, [sendJson]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  function clearPing() {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }

  function cleanup() {
    clearPing();
    cancelSpeech();
    if (mediaRecRef.current) {
      try { mediaRecRef.current.stop(); } catch { /* ignore */ }
      mediaRecRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }
    isRecordingRef.current = false;
    sessionEndedRef.current = false;
    lastTranscriptRef.current = '';
    lastQuestionRef.current = '';
  }

  // Cleanup on unmount
  useEffect(() => cleanup, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearWarning = useCallback(() => dispatch({ type: 'CLEAR_WARNING' }), []);

  return {
    state,
    connect,
    requestMic,
    startRecording,
    stopRecording,
    endSession,
    clearWarning,
    speakQuestion,
    cancelSpeech,
  };
}
