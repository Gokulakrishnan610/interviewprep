// import axios from 'axios'

// const API = axios.create({
//   baseURL: import.meta.env.VITE_BACKEND_URL,
// })

// export const getGeminiResponse = async (message) => {
//   try {
//     const response = await API.post('/api/gemini/respond', { message })
    
//     if (response.data.success) {
//       return response.data.response
//     } else {
//       throw new Error(response.data.error || 'Failed to get response from Gemini')
//     }
//   } catch (error) {
//     console.error('Gemini API error:', error)
//     throw error
//   }
// }
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const startInterview = async (position = 'Software Engineer') => {
  const response = await axios.post(`${API_BASE_URL}/api/gemini/start-interview`, null, {
    params: { position }
  })
  return response.data
}

export const sendMessage = async (message) => {
  const response = await axios.post(`${API_BASE_URL}/api/gemini/chat`, null, {
    params: { message }
  })
  return response.data
}

export const streamMessage = async (message, onChunk) => {
  const response = await fetch(`${API_BASE_URL}/api/gemini/chat-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message })
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          onChunk(data.text)
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}