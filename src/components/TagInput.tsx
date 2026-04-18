import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IonChip,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonText,
} from '@ionic/react'
import { closeCircle } from 'ionicons/icons'
import { tagsApi } from '@/api/tags'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  onPendingChange?: (pending: string) => void
}

const MAX_TAGS = 10

export function TagInput({ value, onChange, onPendingChange }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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
    if (!trimmed || value.includes(trimmed) || value.length >= MAX_TAGS) return
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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
        {value.map((tag) => (
          <IonChip key={tag} color="primary" onClick={() => removeTag(tag)}>
            <IonLabel>#{tag}</IonLabel>
            <IonIcon icon={closeCircle} />
          </IonChip>
        ))}
      </div>

      {value.length >= MAX_TAGS ? (
        <IonText color="medium">
          <p style={{ fontSize: '0.75rem', margin: '4px 0' }}>Максимум {MAX_TAGS} тегов</p>
        </IonText>
      ) : (
        <IonSearchbar
          value={input}
          debounce={300}
          placeholder="Добавить тег..."
          onIonInput={(e) => {
            const val = e.detail.value ?? ''
            setInput(val)
            setShowSuggestions(val.length > 0)
            onPendingChange?.(val)
          }}
          onKeyDown={handleKeyDown}
          onIonFocus={() => input && setShowSuggestions(true)}
          style={{ '--border-radius': '8px', padding: '0' } as React.CSSProperties}
        />
      )}

      {showSuggestions && filteredSuggestions.length > 0 && (
        <IonList
          style={{
            position: 'absolute',
            zIndex: 10,
            width: '100%',
            background: 'var(--ion-background-color)',
            border: '1px solid var(--ion-border-color, #e0e0e0)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflow: 'auto',
          }}
        >
          {filteredSuggestions.map((s) => (
            <IonItem
              key={s.id}
              button
              detail={false}
              onMouseDown={(e) => { e.preventDefault(); addTag(s.name) }}
            >
              <IonLabel>#{s.name}</IonLabel>
              {s.txCount !== undefined && (
                <IonNote slot="end">{s.txCount}</IonNote>
              )}
            </IonItem>
          ))}
        </IonList>
      )}

      <IonText color="medium">
        <p style={{ fontSize: '0.75rem', margin: '4px 0 0' }}>Enter или запятая — добавить тег</p>
      </IonText>
    </div>
  )
}
