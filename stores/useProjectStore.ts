import { create } from "zustand"

export interface FileItem {
  id: string
  name: string
  type: "video" | "document" | "image"
  size: string
  url: string
  uploadedAt: Date
}

export interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  citations?: string[]
}

export interface Chat {
  id: string
  name: string
  messages: ChatMessage[]
  createdAt: Date
}

export interface Project {
  id: string
  name: string
  files: FileItem[]
  chats: Chat[]
  createdAt: Date
  updatedAt: Date
}

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  addProject: (project: Project) => void
  updateProject: (projectId: string, updates: Partial<Project>) => void
  setCurrentProject: (project: Project | null) => void
  addFileToProject: (projectId: string, file: FileItem) => void
  removeFileFromProject: (projectId: string, fileId: string) => void
  addChatToProject: (projectId: string, chat: Chat) => void
  addMessageToChat: (projectId: string, chatId: string, message: ChatMessage) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),

  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((project) => (project.id === projectId ? { ...project, ...updates } : project)),
      currentProject:
        state.currentProject?.id === projectId ? { ...state.currentProject, ...updates } : state.currentProject,
    })),

  setCurrentProject: (project) =>
    set(() => ({
      currentProject: project,
    })),

  addFileToProject: (projectId, file) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, files: [...project.files, file] } : project,
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, files: [...state.currentProject.files, file] }
          : state.currentProject,
    })),

  removeFileFromProject: (projectId, fileId) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, files: project.files.filter((f) => f.id !== fileId) } : project,
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              files: state.currentProject.files.filter((f) => f.id !== fileId),
            }
          : state.currentProject,
    })),

  addChatToProject: (projectId, chat) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, chats: [...project.chats, chat] } : project,
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, chats: [...state.currentProject.chats, chat] }
          : state.currentProject,
    })),

  addMessageToChat: (projectId, chatId, message) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              chats: project.chats.map((chat) =>
                chat.id === chatId ? { ...chat, messages: [...chat.messages, message] } : chat,
              ),
            }
          : project,
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              chats: state.currentProject.chats.map((chat) =>
                chat.id === chatId ? { ...chat, messages: [...chat.messages, message] } : chat,
              ),
            }
          : state.currentProject,
    })),
}))
