import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

const MAX_TEXTAREA_HEIGHT = 128 // max-h-32

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  onTypingStart?: () => void
  onTypingStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

function useIsMobileInput() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px), (pointer: coarse)')

    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)

    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}

function resetTextareaSize(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  textarea.style.overflowY = 'hidden'
}

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  const scrollHeight = textarea.scrollHeight
  const newHeight = Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT)
  textarea.style.height = `${newHeight}px`
  textarea.style.overflowY = scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
}

function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  isLoading = false,
  disabled = false,
  placeholder = 'Nachricht schreiben...',
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobileInput()

  useEffect(() => {
    if (textareaRef.current) {
      resizeTextarea(textareaRef.current)
    }
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedMessage = message.trim()
    if (!trimmedMessage || disabled) return

    setMessage('')
    onTypingStop?.()

    if (textareaRef.current) {
      resetTextareaSize(textareaRef.current)
    }

    void onSendMessage(trimmedMessage).catch((error) => {
      console.error('Fehler beim Senden der Nachricht:', error)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    if (e.nativeEvent.isComposing) return
    // Mobil: Enter = Zeilenumbruch (natives Verhalten)
    if (isMobile) return

    e.preventDefault()
    onTypingStop?.()
    handleSubmit(e)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    if (e.target.value.length > 0 && onTypingStart) {
      onTypingStart()
    } else if (e.target.value.length === 0 && onTypingStop) {
      onTypingStop()
    }
  }

  const isSubmitDisabled = !message.trim() || disabled || isLoading

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={onTypingStop}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            enterKeyHint={isMobile ? 'enter' : 'send'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px] max-h-32"
            rows={1}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex-shrink-0 h-[42px] w-[42px] bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Nachricht senden"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-2 h-4" />
    </div>
  )
}

export default MessageInput
