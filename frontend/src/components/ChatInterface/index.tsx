import React, { useState, useRef, useEffect } from 'react'
import Avatar from '../Avatar'
import MessageBubble from '../MessageBubble'
import TypingIndicator from '../TypingIndicator'
import { useChat } from '../../hooks/useChat'

export function ChatInterface() {
  const { messages, isLoading, sendMessage } = useChat()
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    await sendMessage(inputValue)
    setInputValue('')
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-surface border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex gap-4 items-center max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Message Poly..."
            disabled={isLoading}
            className="chat-input flex-1"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="btn-send disabled:opacity-50 disabled:cursor-not-allowed"
          >
            send
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatInterface