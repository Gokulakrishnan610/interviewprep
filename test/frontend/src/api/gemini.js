import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
})

export const getGeminiResponse = async (message) => {
  try {
    const response = await API.post('/api/gemini/respond', { message })
    
    if (response.data.success) {
      return response.data.response
    } else {
      throw new Error(response.data.error || 'Failed to get response from Gemini')
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}
