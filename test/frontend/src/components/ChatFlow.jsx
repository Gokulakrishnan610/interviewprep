import React, { useState, useRef, useEffect } from 'react'
import { getGeminiResponse } from '../api/gemini'
import { sendToAvatar } from '../api/livekit'

const ChatFlow = ({ messages, setMessages }) => {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    const userMsg = input.trim()
    if (!userMsg || isLoading) return

    // Add user message
    const userMessage = { sender: 'user', text: userMsg, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Get Gemini response
      const reply = await getGeminiResponse(userMsg)
      
      // Add bot message
      const botMessage = { sender: 'bot', text: reply, timestamp: new Date() }
      setMessages(prev => [...prev, botMessage])

      // Make avatar speak
      if (window.avatar) {
        await sendToAvatar('default', reply)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = { 
        sender: 'bot', 
        text: 'Sorry, I encountered an error. Please try again.', 
        timestamp: new Date(),
        isError: true 
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-flow">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>
            <p>Start a conversation with your AI avatar! 🎤</p>
            <p>Use the microphone or type your message below.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              <strong>{message.sender === 'user' ? 'You' : 'Avatar'}</strong>
              {message.text}
            </div>
          ))
        )}
        {isLoading && (
          <div className="message bot">
            <strong>Avatar</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
          disabled={isLoading}
        />
        <button 
          onClick={sendMessage} 
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

export default ChatFlow