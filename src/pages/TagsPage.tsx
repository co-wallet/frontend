import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Pencil, Trash2, Check, X } from 'lucide-react'
import { tagsApi } from '@/api/tags'

export function TagsPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: tagsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })

  function startEdit(id: string, name: string) {
    setEditingId(id)
    setEditName(name)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
            ← Назад
          </Link>
          <h1 className="text-xl font-bold">Теги</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Загрузка...</div>
        ) : tags.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tag size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет тегов. Добавьте теги к транзакциям.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="bg-card rounded-lg border px-4 py-3 flex items-center gap-3">
                {editingId === tag.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameMutation.mutate({ id: tag.id, name: editName })
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="flex-1 rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => renameMutation.mutate({ id: tag.id, name: editName })}
                      disabled={renameMutation.isPending || !editName.trim()}
                      className="p-1 rounded hover:bg-muted text-green-600 disabled:opacity-50"
                    >
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEdit} className="p-1 rounded hover:bg-muted text-muted-foreground">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">#{tag.name}</span>
                    {tag.txCount !== undefined && (
                      <span className="text-xs text-muted-foreground">{tag.txCount} транзакций</span>
                    )}
                    <button
                      onClick={() => startEdit(tag.id, tag.name)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Удалить тег?')) deleteMutation.mutate(tag.id)
                      }}
                      className="p-1 rounded hover:bg-muted text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
