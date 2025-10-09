import { UUID } from '../../types/apiTypes'

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

// Get auth headers helper
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('printer_auth_token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export async function renameProject(
  projectId: string,
  newName: string
): Promise<Project> {
  try {
    const response = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to rename project')
    }

    return await response.json()
  } catch (error) {
    console.error('Error renaming project:', error)
    throw error
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete project')
    }
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

