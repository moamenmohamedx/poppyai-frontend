import { useCanvasStore } from '@/stores/useCanvasStore'

/**
 * Collects textual content from all context nodes connected to a specific chat card
 * @param chatCardId - The ID of the chat card to collect context for
 * @returns Array of strings representing the collected context
 */
export function getConnectedContextForChat(chatCardId: string): string[] {
  const { edges, contextCards } = useCanvasStore.getState()
  
  // Find all edges where the target is the chat card
  const connectedEdges = edges.filter(edge => 
    edge.targetId === chatCardId && edge.targetType === 'chat'
  )
  
  // Get the source context card IDs
  const connectedContextIds = connectedEdges.map(edge => edge.sourceId)
  
  // Find the actual context cards and extract their textual content
  const contextTexts: string[] = []
  
  for (const contextId of connectedContextIds) {
    const contextCard = contextCards.find(card => card.id === contextId)
    
    if (!contextCard || !contextCard.content) continue
    
    // Extract textual content based on card type
    let textContent = ''
    
    switch (contextCard.type) {
      case 'text':
        // Text cards have content.content and content.title
        textContent = `${contextCard.content.title || 'Text Note'}: ${contextCard.content.content || ''}`
        break
        
      case 'video':
        // Video cards have title and URL
        textContent = `Video: ${contextCard.content.title || 'Video'} (${contextCard.content.url || 'No URL'})`
        break
        
      case 'image':
        // Image cards have alt text and caption
        textContent = `Image: ${contextCard.content.alt || 'Image'} - ${contextCard.content.caption || 'No description'}`
        break
        
      case 'website':
        // Website cards have title, URL, and description
        textContent = `Website: ${contextCard.content.title || 'Website'} (${contextCard.content.url || 'No URL'}) - ${contextCard.content.description || 'No description'}`
        break
        
      case 'document':
        // Document cards have name and type
        textContent = `Document: ${contextCard.content.name || 'Document'} (${contextCard.content.type || 'Unknown type'})`
        break
        
      default:
        // Fallback for unknown types
        textContent = `${contextCard.type}: ${JSON.stringify(contextCard.content)}`
        break
    }
    
    // Only add non-empty content
    if (textContent.trim()) {
      contextTexts.push(textContent.trim())
    }
  }
  
  return contextTexts
}
