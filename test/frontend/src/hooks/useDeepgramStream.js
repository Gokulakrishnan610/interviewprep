import { useRef, useState } from 'react'

export function useDeepgramStream(onTranscript) {
  const wsRef = useRef(null)
  const recorderRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  const startListening = async () => {
    if (isConnected) {
      console.log('Already connected to Deepgram')
      return
    }

    try {
      setError(null)
      setConnectionStatus('connecting')
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      const wsUrl = backendUrl.replace('http', 'ws') + '/api/deepgram/listen'
      
      console.log('Connecting to Deepgram WebSocket:', wsUrl)
      const ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Connected to Deepgram WebSocket')
        setIsConnected(true)
        setError(null)
        setConnectionStatus('connected')
        startAudioStream(ws)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle connection success message
          if (data.type === 'connected') {
            console.log('✅ ' + data.message)
            return
          }
          
          // Handle errors from server
          if (data.error) {
            console.error('❌ Server error:', data.error)
            setError(data.error)
            stopListening()
            return
          }
          
          // Handle transcripts
          if (data.type === 'transcript' && data.transcript) {
            console.log('🎤 Deepgram transcript:', data.transcript)
            onTranscript(data.transcript)
          }
          
          // Handle raw Deepgram messages (for debugging)
          if (data.is_final && data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript
            if (transcript.trim()) {
              console.log('🎤 Deepgram raw transcript:', transcript)
              onTranscript(transcript)
            }
          }
        } catch (error) {
          console.error('❌ Error parsing Deepgram message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ Deepgram WebSocket error:', error)
        setError('Failed to connect to voice service')
        setConnectionStatus('error')
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        console.log('🔌 Deepgram WebSocket closed:', event.code, event.reason)
        setConnectionStatus('disconnected')
        setIsConnected(false)
        
        if (event.code !== 1000) {
          setError('Voice connection closed unexpectedly')
        }
      }

    } catch (error) {
      console.error('❌ Failed to start Deepgram connection:', error)
      setError('Voice recognition service unavailable')
      setConnectionStatus('error')
    }
  }

  const startAudioStream = async (ws) => {
    try {
      console.log('🎤 Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      console.log('✅ Microphone access granted')
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0)
          const pcmData = convertFloat32ToInt16(inputData)
          ws.send(pcmData)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      recorderRef.current = {
        stream,
        audioContext,
        source,
        processor
      }

      console.log('🎙️ Audio streaming started')

    } catch (error) {
      console.error('❌ Error starting audio stream:', error)
      setError('Microphone access denied or unavailable')
      stopListening()
    }
  }

  const stopListening = () => {
    console.log('🛑 Stopping Deepgram connection...')
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User stopped listening')
      wsRef.current = null
    }

    if (recorderRef.current) {
      const { stream, audioContext, processor, source } = recorderRef.current
      
      console.log('🔌 Cleaning up audio resources...')
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('✅ Stopped audio track:', track.kind)
      })
      
      if (processor) {
        processor.disconnect()
      }
      if (source) {
        source.disconnect()
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
      
      recorderRef.current = null
    }

    setIsConnected(false)
    setConnectionStatus('disconnected')
    console.log('✅ Deepgram connection stopped')
  }

  // Convert Float32 to Int16 for Deepgram
  const convertFloat32ToInt16 = (buffer) => {
    const length = buffer.length
    const int16Array = new Int16Array(length)
    
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    
    return int16Array.buffer
  }

  return {
    startListening,
    stopListening,
    isListening: isConnected,
    error,
    connectionStatus
  }
}