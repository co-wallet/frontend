import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { tagsApi } from '@/api/tags'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  /** Called on every keystroke so the parent can read pending text at submit time */
  onPendingChange?: (pending: string) => void
}

export function TagInput({ value, onChange, onPendingChange }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: suggestions = [] } = useQuery({
    queryKey: ['tags', 'autocomplete', input],
    queryFn: () => tagsApi.list(input),
    enabled: input.length > 0,
    staleTime: 10_000,
  })

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s.name))
    .slice(0, 6)

  function addTag(name: string) {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
    setShowSuggestions(false)
    onPendingChange?.('')
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.closest('.tag-input-wrapper')?.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="tag-input-wrapper relative">
      <div
        className="min-h-[38px] w-full rounded-md border px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-primary"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded px-2 py-0.5 text-xs font-medium"
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="hover:text-destructive"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); onPendingChange?.(e.target.value) }}
          onKeyDown={handleKeyDown}
          onFocus={() => input && setShowSuggestions(true)}
          placeholder={value.length === 0 ? 'Добавить тег...' : ''}
          className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 top-full mt-1 w-full bg-card border rounded-md shadow-md overflow-hidden">
          {filteredSuggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s.name) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
            >
              <span>#{s.name}</span>
              {s.txCount !== undefined && (
                <span className="text-xs text-muted-foreground">{s.txCount}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1">Enter или запятая — добавить тег</p>
    </div>
  )
}
