'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  matchId: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, matchId }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { startTyping, stopTyping, connectionStatus } = useMessaging();

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Handle typing indicator
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true);
      startTyping(matchId);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(matchId);
      }
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Clear typing indicator
    if (isTyping) {
      setIsTyping(false);
      stopTyping(matchId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send message
    onSendMessage(trimmedMessage);
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = connectionStatus !== 'connected';

  return (
    <div className="bg-white border-t p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled 
                ? 'Connecting...' 
                : 'Type a message...'
            }
            disabled={isDisabled}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
            rows={1}
            style={{ minHeight: '48px' }}
          />
          
          {/* Emoji button (placeholder for future enhancement) */}
          <button
            type="button"
            className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDisabled}
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </button>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || isDisabled}
          className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 text-white rounded-full flex items-center justify-center hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-pink-500 disabled:hover:to-purple-500"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
        </button>
      </form>

      {/* Connection status warning */}
      {isDisabled && (
        <div className="mt-2 text-xs text-center text-orange-500">
          {connectionStatus === 'connecting' && 'Connecting to server...'}
          {connectionStatus === 'reconnecting' && 'Reconnecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected. Messages will be sent when reconnected.'}
        </div>
      )}
    </div>
  );
};
