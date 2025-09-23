"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, CheckCircle } from "lucide-react"
import { useProjectStore, type FileItem } from "@/stores/useProjectStore"

interface FileUploadProps {
  projectId: string
  onComplete: () => void
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: "uploading" | "completed" | "error"
}

export default function FileUpload({ projectId, onComplete }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const { addFileToProject } = useProjectStore()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const newUploadingFiles: UploadingFile[] = files.map((file) => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: "uploading",
    }))

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles])

    // Simulate file upload
    newUploadingFiles.forEach((uploadingFile) => {
      simulateUpload(uploadingFile)
    })
  }

  const simulateUpload = (uploadingFile: UploadingFile) => {
    const interval = setInterval(() => {
      setUploadingFiles((prev) =>
        prev.map((file) => {
          if (file.id === uploadingFile.id) {
            const newProgress = Math.min(file.progress + Math.random() * 20, 100)

            if (newProgress >= 100) {
              clearInterval(interval)

              // Add to project store
              const fileItem: FileItem = {
                id: `file-${Date.now()}-${Math.random()}`,
                name: uploadingFile.file.name,
                type: getFileType(uploadingFile.file.type),
                size: formatFileSize(uploadingFile.file.size),
                url: URL.createObjectURL(uploadingFile.file),
                uploadedAt: new Date(),
              }

              addFileToProject(projectId, fileItem)

              return { ...file, progress: 100, status: "completed" as const }
            }

            return { ...file, progress: newProgress }
          }
          return file
        }),
      )
    }, 200)
  }

  const getFileType = (mimeType: string): "video" | "document" | "image" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const allCompleted = uploadingFiles.length > 0 && uploadingFiles.every((file) => file.status === "completed")

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          isDragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
        }`}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-600 mb-1">Drop files here or click to browse</p>
        <p className="text-xs text-gray-500 mb-4">Supports videos, documents, and images</p>

        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          accept="video/*,image/*,.pdf,.doc,.docx,.txt"
        />
        <label htmlFor="file-upload">
          <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
            <span>Choose Files</span>
          </Button>
        </label>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Uploading Files</h4>
          {uploadingFiles.map((uploadingFile) => (
            <div key={uploadingFile.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 truncate">{uploadingFile.file.name}</span>
                <div className="flex items-center space-x-2">
                  {uploadingFile.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadingFile(uploadingFile.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Progress value={uploadingFile.progress} className="flex-1" />
                <span className="text-xs text-gray-500 min-w-[3rem]">{Math.round(uploadingFile.progress)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onComplete}>
          Cancel
        </Button>
        {allCompleted && (
          <Button onClick={onComplete} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Done
          </Button>
        )}
      </div>
    </div>
  )
}
