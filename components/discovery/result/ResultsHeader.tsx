'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Edit2, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ResultsHeaderProps {
  title: string
  onNewSearch?: () => void
  isGeneratedTitle?: boolean
  onTitleEdit?: (newTitle: string) => void
}

export default function ResultsHeader({
  title,
  onNewSearch,
  isGeneratedTitle = false,
  onTitleEdit,
}: ResultsHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditTitle(title)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== title) {
      onTitleEdit?.(editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div className="bg-background flex-shrink-0 pt-6 pb-4">
      <div className="flex items-start justify-between">
        <div className="mr-4 flex-1">
          {isEditing ? (
            <div className="mb-2 flex items-center gap-2">
              <Input
                ref={inputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-primary h-auto border-2 px-2 py-1 text-3xl font-bold"
                placeholder="Enter title..."
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveEdit}
                className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelEdit}
                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mb-2 flex items-center gap-2">
              <h1 className="text-3xl font-bold">{title}</h1>
              {isGeneratedTitle && onTitleEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStartEdit}
                  className="text-muted-foreground hover:text-foreground h-8 w-8"
                  title="Edit title"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        <Button
          variant="default"
          onClick={onNewSearch}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Search
        </Button>
      </div>
    </div>
  )
}
