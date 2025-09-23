"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Copy, Trash2 } from "lucide-react"

interface ContextMenuProps {
  x: number
  y: number
  onCopy: () => void
  onDelete: () => void
  onClose: () => void
}

export default function ContextMenu({ x, y, onCopy, onDelete, onClose }: ContextMenuProps) {
  React.useEffect(() => {
    const handleClickOutside = () => onClose()
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("click", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("click", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[9999]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopy}
        className="w-full justify-start px-3 py-2 text-sm hover:bg-gray-100"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="w-full justify-start px-3 py-2 text-sm hover:bg-red-50 text-red-600 hover:text-red-700"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </div>
  )
}
