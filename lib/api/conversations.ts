import { UUID, Conversation, Message } from '../../types/apiTypes'

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

// Conversation CRUD Operations

export async function createConversation(payload: { 
  project_id: UUID; 
  chat_node_id: string 
}): Promise<Conversation> {
  try {
    const response = await fetch(`${baseUrl}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Create Conversation Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to create conversation')
  }
}

export async function getConversationsForNode(chat_node_id: string): Promise<Conversation[]> {
  try {
    const response = await fetch(`${baseUrl}/api/conversations/node/${encodeURIComponent(chat_node_id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get Conversations for Node Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to get conversations')
  }
}

export async function getMessages(conversation_id: UUID): Promise<Message[]> {
  try {
    const response = await fetch(`${baseUrl}/api/messages/${conversation_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get Messages Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to get messages')
  }
}

export async function updateConversation(payload: { 
  conversation_id: UUID; 
  title: string 
}): Promise<Conversation> {
  try {
    const response = await fetch(`${baseUrl}/api/conversations/${payload.conversation_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: payload.title }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Update Conversation Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to update conversation')
  }
}

export async function deleteConversation(conversation_id: UUID): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/conversations/${conversation_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Delete endpoints return void
    return
  } catch (error) {
    console.error('Delete Conversation Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to delete conversation')
  }
}

// Additional utility functions for project-level operations

export async function getConversationsForProject(project_id: UUID): Promise<Conversation[]> {
  try {
    const response = await fetch(`${baseUrl}/api/conversations/project/${project_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get Conversations for Project Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to get conversations for project')
  }
}

export async function getConversation(conversation_id: UUID): Promise<Conversation> {
  try {
    const response = await fetch(`${baseUrl}/api/conversations/${conversation_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get Conversation Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to get conversation')
  }
}

export async function deleteMessage(message_id: UUID): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/messages/${message_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Delete endpoints return void
    return
  } catch (error) {
    console.error('Delete Message Error:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to delete message')
  }
}
