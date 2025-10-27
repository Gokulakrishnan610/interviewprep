import { useRef, useState } from 'react'

export function useDeepgramStream(onTranscript) {
  const wsRef = useRef(null)
  const recorderRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  const startListening = async () => {
    if (isConnected) return

    try {
      const ws = new WebSocket(`ws://localhost:8000/api/deepgram/listen`)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Connected to Deepgram WebSocket')
        setIsConnected(true)
        startAudioStream(ws)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const transcript = data?.channel?.alternatives?.[0]?.transcript
          
          if (transcript && data.is_final) {
            onTranscript(transcript)
          }
        } catch (error) {
          console.error('Error parsing Deepgram message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('Deepgram WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('Deepgram WebSocket closed')
        setIsConnected(false)
      }

    } catch (error) {
      console.error('Failed to start Deepgram connection:', error)
    }
  }

  const startAudioStream = async (ws) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16
        } 
      })
      
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

    } catch (error) {
      console.error('Error starting audio stream:', error)
    }
  }

  const stopListening = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (recorderRef.current) {
      const { stream, audioContext, processor, source } = recorderRef.current
      
      stream.getTracks().forEach(track => track.stop())
      
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
    isListening: isConnected
  }
}