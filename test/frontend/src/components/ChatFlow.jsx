// import React, { useState, useRef, useEffect } from 'react'
// import { getGeminiResponse } from '../api/gemini'
// import { sendToAvatar } from '../api/livekit'

// const ChatFlow = ({ messages, setMessages }) => {
//   const [input, setInput] = useState('')
//   const [isLoading, setIsLoading] = useState(false)
//   const messagesEndRef = useRef(null)

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }

//   useEffect(() => {
//     scrollToBottom()
//   }, [messages])

//   const sendMessage = async () => {
//     const userMsg = input.trim()
//     if (!userMsg || isLoading) return

//     // Add user message
//     const userMessage = { sender: 'user', text: userMsg, timestamp: new Date() }
//     setMessages(prev => [...prev, userMessage])
//     setInput('')
//     setIsLoading(true)

//     try {
//       // Get Gemini response
//       const reply = await getGeminiResponse(userMsg)
      
//       // Add bot message
//       const botMessage = { sender: 'bot', text: reply, timestamp: new Date() }
//       setMessages(prev => [...prev, botMessage])

//       // Make avatar speak
//       if (window.avatar) {
//         await sendToAvatar('default', reply)
//       }
//     } catch (error) {
//       console.error('Error sending message:', error)
//       const errorMessage = { 
//         sender: 'bot', 
//         text: 'Sorry, I encountered an error. Please try again.', 
//         timestamp: new Date(),
//         isError: true 
//       }
//       setMessages(prev => [...prev, errorMessage])
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault()
//       sendMessage()
//     }
//   }

//   return (
//     <div className="chat-flow">
//       <div className="chat-messages">
//         {messages.length === 0 ? (
//           <div style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>
//             <p>Start a conversation with your AI avatar! 🎤</p>
//             <p>Use the microphone or type your message below.</p>
//           </div>
//         ) : (
//           messages.map((message, index) => (
//             <div key={index} className={`message ${message.sender}`}>
//               <strong>{message.sender === 'user' ? 'You' : 'Avatar'}</strong>
//               {message.text}
//             </div>
//           ))
//         )}
//         {isLoading && (
//           <div className="message bot">
//             <strong>Avatar</strong>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <div className="typing-dots">
//                 <span></span>
//                 <span></span>
//                 <span></span>
//               </div>
//               Thinking...
//             </div>
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       <div className="input-area">
//         <input
//           type="text"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyPress={handleKeyPress}
//           placeholder="Type your message here..."
//           disabled={isLoading}
//         />
//         <button 
//           onClick={sendMessage} 
//           disabled={isLoading || !input.trim()}
//         >
//           {isLoading ? 'Sending...' : 'Send'}
//         </button>
//       </div>
//     </div>
//   )
// }

// export default ChatFlow
import React, { useState, useEffect, useRef } from 'react'
import { Send, User, Bot } from 'lucide-react'
import { sendMessage, startInterview } from '../api/gemini'

const ChatFlow = () => {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Start interview when component mounts
    const initializeInterview = async () => {
      setIsLoading(true)
      try {
        const response = await startInterview('Software Engineer')
        setMessages([{
          id: 1,
          text: response.response,
          sender: 'bot',
          timestamp: new Date()
        }])
      } catch (error) {
        console.error('Failed to start interview:', error)
        setMessages([{
          id: 1,
          text: "Hello! I'm your AI interviewer. Ready to begin our conversation?",
          sender: 'bot',
          timestamp: new Date()
        }])
      }
      setIsLoading(false)
    }

    initializeInterview()
  }, [])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await sendMessage(inputMessage)
      const botMessage = {
        id: messages.length + 2,
        text: response.response,
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage = {
        id: messages.length + 2,
        text: "I apologize, but I'm having trouble responding. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
    setIsLoading(false)
  }

  return (
    <div className="chat-flow">
      <div className="chat-header">
        <h3>Interview Conversation</h3>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-avatar">
              {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot-message">
            <div className="message-avatar">
              <Bot size={16} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your response..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputMessage.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}

export default ChatFlow