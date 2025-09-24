# 📐 Document 2: Implementation Plan (Enhanced)

## **Implementation Order & Instructions**

Following the 80/20 rule, we'll implement these tweaks in order of impact and simplicity, with production-ready enhancements for accessibility, responsiveness, and user experience.

---



**Files to modify**:
1.  `components/Canvas.tsx`
2.  `lib/supabase/projects.ts` (The `updateProject` function already exists and is sufficient)

**Enhanced Implementation in `Canvas.tsx`**:

1.  **Add State & Refs**:
    - `isEditingName` and `editedName` states
    - `originalName` ref for rollback on error
    - `inputRef` for focus management

2.  **Add Imports**: 
    - Import `updateProject` from supabase
    - Import `toast` from sonner
    - Import `useCallback`, `useRef`, `useEffect`

3.  **Enhanced Features**:
    - Optimistic UI updates with rollback on failure
    - Validation for empty names and special characters
    - Auto-select text on edit start
    - Click-outside detection to cancel
    - Proper error handling with user feedback

**Enhanced Code** (for the `<h1>` at line 49):
```tsx
// Add to component:
const [isEditingName, setIsEditingName] = useState(false)
const [editedName, setEditedName] = useState('')
const originalNameRef = useRef<string>('')
const inputRef = useRef<HTMLInputElement>(null)

// Click outside handler
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (isEditingName && inputRef.current && !inputRef.current.contains(e.target as Node)) {
      setIsEditingName(false)
      setEditedName(currentProject?.name || '')
    }
  }
  if (isEditingName) {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }
}, [isEditingName, currentProject])

const handleSaveName = useCallback(async () => {
  const trimmedName = editedName.trim()
  
  // Validation
  if (!trimmedName) {
    toast.error('Project name cannot be empty')
    setEditedName(originalNameRef.current)
    setIsEditingName(false)
    return
  }
  
  if (trimmedName === currentProject?.name) {
    setIsEditingName(false)
    return
  }
  
  // Optimistic update
  if (currentProject) {
    originalNameRef.current = currentProject.name
    // Update local state optimistically
    updateProjectOptimistic({ ...currentProject, name: trimmedName })
    
    try {
      await updateProject(currentProject.id, { name: trimmedName })
      toast.success('Project renamed successfully')
    } catch (error) {
      // Rollback on error
      updateProjectOptimistic({ ...currentProject, name: originalNameRef.current })
      toast.error('Failed to rename project')
      setEditedName(originalNameRef.current)
    }
  }
  
  setIsEditingName(false)
}, [editedName, currentProject])

// Replace <h1> with:
{isEditingName ? (
  <input
    ref={inputRef}
    type="text"
    value={editedName}
    onChange={(e) => setEditedName(e.target.value)}
    onBlur={handleSaveName}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSaveName()
      } else if (e.key === 'Escape') {
        setEditedName(currentProject?.name || '')
        setIsEditingName(false)
      }
    }}
    className="text-lg font-semibold bg-transparent border-b-2 border-indigo-500 dark:border-purple-500 
               outline-none px-1 dark:text-white min-w-[150px] max-w-[300px]"
    autoFocus
    onFocus={(e) => e.target.select()}
    maxLength={50}
    aria-label="Edit project name"
  />
) : (
  <h1 
    className="text-lg font-semibold text-gray-900 dark:bg-gradient-to-r dark:from-purple-500 
               dark:to-cyan-400 dark:text-transparent dark:bg-clip-text cursor-pointer 
               hover:opacity-80 transition-opacity"
    onClick={() => {
      setEditedName(currentProject?.name || '')
      originalNameRef.current = currentProject?.name || ''
      setIsEditingName(true)
    }}
    title="Click to rename project"
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setEditedName(currentProject?.name || '')
        originalNameRef.current = currentProject?.name || ''
        setIsEditingName(true)
      }
    }}
  >
    {currentProject?.name || "Untitled Project"}
  </h1>
)}
```

**Edge Cases Handled**:
- Empty names → Show error toast
- Names with only whitespace → Trim and validate
- Same name → Just exit edit mode
- Network errors → Rollback with error message
- Special characters → Allowed (let backend validate if needed)
- Max length → Limited to 50 characters

---

### **📋 Tweak 1: Node Right-Click Context Menu**

**Files**: `components/nodes/ChatNode.tsx` and `components/nodes/ContextNode.tsx`

**Enhanced Implementation (for both node components)**:

1.  **Add State & Refs**:
    - `contextMenuPosition` state for menu coordinates
    - `menuRef` for click-outside detection
    - `nodeRef` for node position calculations

2.  **Enhanced Features**:
    - React Portal for proper layering
    - Edge detection to keep menu on screen
    - Keyboard shortcuts (Del for delete, Ctrl+D for duplicate)
    - Click-outside to close
    - Smooth animations
    - Accessibility attributes

3.  **Add Handlers**:
    - Smart positioning logic
    - Duplicate with offset (20px down and right)
    - Delete with confirmation for important nodes

**Enhanced Code for Both Nodes**:

```tsx
// Add imports
import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { Copy, Trash2 } from 'lucide-react'

// Add to component:
const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
const menuRef = useRef<HTMLDivElement>(null)
const { addChatNode, addContextNode, deleteNode, nodes } = useReactFlowStore()

// Click outside & keyboard handlers
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setContextMenuPosition(null)
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (selected) {
      if (e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        handleCopy()
      }
    }
  }
  
  if (contextMenuPosition) {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }
}, [contextMenuPosition, selected])

// Enhanced handlers
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  
  // Calculate safe position
  const menuWidth = 160
  const menuHeight = 80
  const padding = 8
  
  let x = e.clientX
  let y = e.clientY
  
  // Keep menu on screen
  if (x + menuWidth > window.innerWidth - padding) {
    x = window.innerWidth - menuWidth - padding
  }
  if (y + menuHeight > window.innerHeight - padding) {
    y = window.innerHeight - menuHeight - padding
  }
  
  setContextMenuPosition({ x, y })
}

const handleCopy = () => {
  const currentNode = nodes.find(n => n.id === data.id)
  if (currentNode) {
    // For ChatNode:
    addChatNode({
      x: currentNode.position.x + 20,
      y: currentNode.position.y + 20
    })
    // For ContextNode:
    // addContextNode(data.type, { x: currentNode.position.x + 20, y: currentNode.position.y + 20 })
  }
  setContextMenuPosition(null)
  toast.success('Node duplicated')
}

const handleDelete = () => {
  deleteNode(data.id as string)
  setContextMenuPosition(null)
  toast.success('Node deleted')
}

// Add to main div
<div 
  onContextMenu={handleContextMenu}
  className={`react-flow-node ${selected ? 'ring-2 ring-indigo-500 dark:ring-purple-400' : ''}`}
>

// Render context menu with Portal
{contextMenuPosition && createPortal(
  <div
    ref={menuRef}
    className="fixed bg-white dark:bg-black border border-gray-200 dark:border-purple-500/30 
               rounded-lg shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] z-[100] 
               py-1 min-w-[160px] animate-in fade-in duration-200"
    style={{ 
      left: `${contextMenuPosition.x}px`, 
      top: `${contextMenuPosition.y}px`,
      transformOrigin: 'top left'
    }}
    role="menu"
    aria-label="Node context menu"
  >
    <button
      onClick={handleCopy}
      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-purple-500/20 
                 dark:text-purple-300 flex items-center gap-2 transition-colors"
      role="menuitem"
    >
      <Copy className="w-4 h-4" />
      Duplicate
      <span className="ml-auto text-xs opacity-60">Ctrl+D</span>
    </button>
    <div className="border-t border-gray-200 dark:border-purple-500/20 my-1" />
    <button
      onClick={handleDelete}
      className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-500/20 
                 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors"
      role="menuitem"
    >
      <Trash2 className="w-4 h-4" />
      Delete
      <span className="ml-auto text-xs opacity-60">Del</span>
    </button>
  </div>,
  document.body
)}
```

**Additional Enhancements**:
- Fade-in animation for smooth appearance
- Keyboard shortcut hints in menu
- Proper ARIA roles for accessibility
- Different hover colors for destructive actions
- Toast notifications for feedback

---

### **🎨 Additional Considerations**

#### **Toast Notifications**
- Use `sonner` consistently across all features
- Success messages: Green with checkmark icon
- Error messages: Red with X icon
- Position: Bottom-right of screen
- Auto-dismiss: 3 seconds for success, 5 seconds for errors

#### **Dark Mode Consistency**
- All new UI elements must respect the current theme
- Use existing color tokens:
  - Light mode: `indigo-*` for primary actions
  - Dark mode: `purple-*` and `cyan-*` for accents
  - Proper contrast ratios for accessibility

#### **Accessibility Standards**
- All interactive elements must have proper ARIA labels
- Keyboard navigation for all features
- Focus indicators visible and consistent
- Screen reader announcements for state changes
- Proper heading hierarchy maintained

#### **Performance Optimizations**
- Use `memo` for all modified components
- Debounce expensive operations (renaming)
- Lazy load context menus only when needed
- Minimize re-renders with proper state management

---

### **✅ Enhanced Testing Checklist**

#### **1. Sidebar Fix Testing**
- [ ] Expand button visible when collapsed
- [ ] Hover effect works in both light/dark modes
- [ ] Keyboard navigation (Tab to focus, Enter/Space to activate)
- [ ] Screen reader announces button state
- [ ] Animation draws attention on first collapse
- [ ] Focus management when toggling

#### **2. Panel Removal Testing**
- [ ] Floating panel completely removed
- [ ] No console errors after removal
- [ ] All functions available in sidebar
- [ ] Canvas performance improved
- [ ] No dead imports remaining

#### **3. Save Button Testing**
- [ ] Centered on desktop (≥640px)
- [ ] Top-right on mobile (<640px)
- [ ] No overlap with theme toggle
- [ ] Loading state displays correctly
- [ ] Success/error states show properly
- [ ] Keyboard accessible (Tab navigation)

#### **4. Canvas Renaming Testing**
- [ ] Click to edit works
- [ ] Enter saves, Escape cancels
- [ ] Click outside cancels
- [ ] Empty name validation
- [ ] Optimistic update visible immediately
- [ ] Error rollback works
- [ ] Toast notifications appear
- [ ] Max length enforced (50 chars)
- [ ] Special characters handled
- [ ] Keyboard navigation (Tab to focus, Enter to edit)

#### **5. Context Menu Testing**
- [ ] Right-click opens menu on both node types
- [ ] Menu stays on screen near edges
- [ ] Click outside closes menu
- [ ] Escape key closes menu
- [ ] Duplicate creates node with offset
- [ ] Delete removes node with confirmation
- [ ] Keyboard shortcuts work (Del, Ctrl+D)
- [ ] Toast notifications appear
- [ ] Portal rendering above all elements
- [ ] Animations smooth
- [ ] Dark mode styling correct

#### **6. Cross-Browser Testing**
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Android)

#### **7. Accessibility Testing**
- [ ] Keyboard-only navigation possible
- [ ] Screen reader compatibility
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] No keyboard traps

#### **8. Performance Testing**
- [ ] No noticeable lag when editing
- [ ] Smooth animations
- [ ] Memory leaks checked
- [ ] Bundle size impact minimal
