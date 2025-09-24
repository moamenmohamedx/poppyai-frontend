# UI Tweaks - Technical Implementation Plan

**Author:** Dr. Alex Turing, Front-End Architect
**Date:** September 24, 2025
**Status:** Ready for Implementation

---

## Introduction

This document provides a detailed technical implementation plan for the UI enhancements outlined in `UI_TWEAKS_REQUIREMENTS.md`. The plan is based on a thorough audit of the existing Next.js/React Flow codebase and is designed to be executed efficiently by the development team, adhering to the 80/20 principle.

---

## 1. React Flow Handle Enhancement

### 1.1. Objective
Increase the size and add a neon glow effect to React Flow node handles for improved usability and aesthetics.

### 1.2. Technical Plan

1.  **File Targets:**
    *   `components/nodes/ChatNode.tsx`
    *   `components/nodes/ContextNode.tsx`
    *   `app/globals.css`

2.  **Implementation Details:**
    *   **Handle Sizing:** In both `ChatNode.tsx` and `ContextNode.tsx`, locate the `<Handle>` components. Update the Tailwind CSS classes to increase the size from `w-3 h-3` to `w-4 h-4`.

    *   **Neon Glow Effect:** A custom CSS class will be created for a performant `box-shadow` glow.
        *   In `app/globals.css`, add the following utility classes:

          ```css
          @layer utilities {
            .handle-glow-indigo {
              box-shadow: 0 0 8px 2px theme('colors.indigo.500 / 70%');
            }
            .handle-glow-indigo-hover:hover {
              box-shadow: 0 0 12px 4px theme('colors.indigo.400 / 80%');
            }
            /* Add equivalents for other handle colors if needed (e.g., green/cyan) */
            .handle-glow-green {
              box-shadow: 0 0 8px 2px theme('colors.green.500 / 70%');
            }
            .handle-glow-green-hover:hover {
              box-shadow: 0 0 12px 4px theme('colors.green.400 / 80%');
            }
          }
          ```
    *   **Class Application:** Apply the new classes to the `<Handle>` components.

      *Diff for `ChatNode.tsx`:*
      ```diff
      // ...
      <Handle
        type="target"
        position={Position.Left}
      - className="w-3 h-3 !bg-indigo-600 dark:!bg-purple-500 !border-2 !border-white dark:!border-black"
      + className="w-4 h-4 !bg-indigo-600 !border-2 !border-white dark:!border-slate-900 handle-glow-indigo handle-glow-indigo-hover transition-shadow"
        isConnectable={true}
      />
      // ...
      ```
      *Apply similar changes to the source handle and to handles in `ContextNode.tsx` using the green/cyan colors.*

---

## 2. Node Creation UX

### 2.1. Objective
Ensure new nodes are created in the center of the user's current viewport.

### 2.2. Technical Plan

1.  **File Targets:**
    *   `stores/useReactFlowStore.ts`
    *   `components/ReactFlowContextLibrary.tsx` (or any other component that triggers node creation).

2.  **Implementation Details:**
    *   **Store Modification:** The node creation functions in `useReactFlowStore` currently use a default position. They should be modified to *require* a position.

      *Diff for `stores/useReactFlowStore.ts`:*
      ```diff
      export interface ReactFlowStore {
        // ...
      - addChatNode: (position?: { x: number; y: number }) => void
      - addContextNode: (type: '...', position?: { x: number; y: number }) => void
      + addChatNode: (position: { x: number; y: number }) => void
      + addContextNode: (type: '...', position: { x: number; y: number }) => void
        // ...
      }

      export const useReactFlowStore = create<ReactFlowStore>((set, get) => ({
        // ...
      - addChatNode: (position = { x: 250, y: 100 }) => {
      + addChatNode: (position) => {
        // ...
        },
      - addContextNode: (type, position = { x: 100, y: 100 }) => {
      + addContextNode: (type, position) => {
        // ...
        },
        //...
      }));
      ```

    *   **Viewport-Centric Logic:** The component responsible for adding nodes (e.g., `ReactFlowContextLibrary` when dragging from the sidebar) must calculate the center of the viewport.
        *   Use the `useReactFlow()` hook to get the instance.
        *   Calculate the viewport center in screen coordinates.
        *   Use the `screenToFlowPosition` method to convert the screen coordinates to the React Flow pane's coordinate system.

      *Code Sketch for `ReactFlowContextLibrary.tsx`:*
      ```tsx
      import { useReactFlow } from '@xyflow/react';
      import { useReactFlowStore } from '@/stores/useReactFlowStore';

      function ReactFlowContextLibrary(...) {
        const { screenToFlowPosition } = useReactFlow();
        const { addContextNode } = useReactFlowStore();

        const handleCreateNode = (type: '...') => {
          // This logic would be triggered on drop
          const viewport = document.querySelector('.react-flow__viewport');
          if (!viewport) return;

          const centerX = viewport.clientWidth / 2;
          const centerY = viewport.clientHeight / 2;
          
          const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });

          addContextNode(type, flowPosition);
        };

        // ...
      }
      ```

---

## 3. AI Chat Node Redesign

### 3.1. Objective
Redesign the `ChatNode` to a two-column layout as specified.

### 3.2. Technical Plan

1.  **File Target:** `components/nodes/ChatNode.tsx`

2.  **Implementation Details:**
    *   **Layout Overhaul:** Replace the current content within the main `<Card>` component with a two-column Flexbox layout.
    *   **Left Column:**
        *   A `div` with a fixed width (e.g., `w-1/3` or `w-[150px]`) and a border on the right.
        *   It will contain a `Button` for "+ New Conversation" at the top.
        *   Below the button, a scrollable area (`overflow-y-auto`) will list conversations.
    *   **Right Column:**
        *   A `div` that fills the remaining space (`flex-1`).
        *   It will contain a scrollable area for messages and an `input` field at the bottom, anchored within a footer `div`.
    *   **Theming:** Use `dark:` variants and `slate` color palette for backgrounds, text, and borders to ensure consistency with the app's theme.

    *   **Visual & Theming Specification (In lieu of reference image):**
        *   **Structure:** A `400px` by `280px` card with a subtle border, divided into a `30%` width left column and a `70%` width right column.
        *   **Left Column:**
            *   **Background:** `slate-100` (light) / `slate-900` (dark).
            *   **Header:** A full-width ghost button with a `Plus` icon and "+ New Conversation" text.
            *   **List:** A scrollable list of conversation titles. The active conversation should have a background of `indigo-100` (light) / `slate-800` (dark).
        *   **Right Column:**
            *   **Background:** `white` (light) / `slate-950` (dark).
            *   **Input Area:** A text input at the bottom, separated by a `slate-200` (light) / `slate-700` (dark) border.

    *   **State Management Note:** For the initial implementation, the conversation history in the left column can be populated with mock data or left empty. State persistence is not required for this task and will be handled separately.

    *Code Sketch for `ChatNode.tsx`'s render method:*
    ```tsx
    // Inside the <Card> component:
    <div className="flex h-[400px]"> // Example height
      {/* Left Column: Conversation List */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            {/* Icon here */} + New Conversation
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {/* Conversation history items will be mapped here */}
        </div>
      </div>

      {/* Right Column: Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Chat messages will be mapped here */}
        </div>
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <input
            type="text"
            placeholder="Type your message..."
            className="w-full ..." // Apply existing input styles
          />
        </div>
      </div>
    </div>
    ```

---

## 4. Dark Mode Contrast Correction for Controls

### 4.1. Objective
Improve the visibility of React Flow UI controls in dark mode.

### 4.2. Technical Plan

1.  **File Target:** `app/globals.css`

2.  **Implementation Details:**
    *   React Flow's default controls have low contrast against a dark background. We will override their styles for dark mode.
    *   **Visual Requirement:** The goal is to make the controls clearly visible against the dark canvas background (`slate-950`). The control buttons should have a solid background (`slate-800`) with high-contrast icons (`slate-300`).
    *   Add the following CSS rules to `app/globals.css` to target React Flow's specific class names.

    *CSS for `app/globals.css`:*
    ```css
    @layer base {
      /* ... existing base styles ... */

      /* React Flow Controls - Dark Mode Contrast Fix */
      .dark .react-flow__controls-button {
        @apply bg-slate-800 text-slate-300 border-slate-600;
      }

      .dark .react-flow__controls-button:hover {
        @apply bg-slate-700;
      }
      
      .dark .react-flow__minimap {
        @apply bg-slate-900/80 border-slate-700;
      }

      .dark .react-flow__background {
        @apply bg-slate-950;
      }
    }
    ```
    *This approach uses `@apply` to leverage existing Tailwind tokens, ensuring style consistency.*

---

## 5. Custom Context Menu and Toast Notifications

### 5.1. Objective
Implement a canvas-wide custom context menu with copy/paste and provide toast notifications.

### 5.2. Technical Plan

1.  **File Targets:**
    *   `components/ReactFlowCanvas.tsx`
    *   `stores/useReactFlowStore.ts` (or a new `stores/useClipboardStore.ts`)
    *   `components/nodes/ChatNode.tsx` and `components/nodes/ContextNode.tsx` (to remove old menu).

2.  **Implementation Details:**
    *   **Remove Node-Specific Menus:** Delete the `onContextMenu`, `contextMenuPosition`, and related `useEffect` logic from both `ChatNode.tsx` and `ContextNode.tsx`.

    *   **Clipboard State:** Extend `useReactFlowStore` to manage copied nodes.
      *Add to `useReactFlowStore.ts` state and actions:*
      ```ts
      export interface ReactFlowStore {
        // ...
        copiedNodes: Node[];
        copyNodes: (nodes: Node[]) => void;
        pasteNodes: (position: { x: number, y: number }) => void;
      }

      // In create():
      copiedNodes: [],
      copyNodes: (nodes) => set({ copiedNodes: nodes }),
      pasteNodes: (position) => {
        const { copiedNodes, nodes } = get();
        if (copiedNodes.length === 0) return;

        const newNodes = copiedNodes.map((node, index) => ({
          ...node,
          id: `${node.id}-copy-${Date.now()}`, // Ensure unique ID
          position: {
            x: position.x + index * 20, // Offset pasted nodes
            y: position.y + index * 20,
          },
        }));
        
        set({ nodes: [...nodes, ...newNodes] });
      },
      ```

    *   **Canvas Context Menu:** In `ReactFlowCanvas.tsx`, implement the main context menu.
        *   Wrap the `<ReactFlow>` component with the `ContextMenu` component from `shadcn/ui`.
        *   Use the `onPaneContextMenu` prop on `<ReactFlow>` to capture the event and mouse position.
        *   The "Copy" action should get selected nodes using `getNodes()` from `useReactFlow()` and call the store's `copyNodes` action.
        *   The "Paste" action should use the event position (converted to flow position) and call the store's `pasteNodes` action.

    *   **Toast Notifications:** Trigger `sonner` toasts within the `copyNodes` and `pasteNodes` actions in the store. The toast duration should be set to **3 seconds**.
      *Example in `useReactFlowStore.ts`:*
      ```ts
      import { toast } from 'sonner';

      // ...
      copyNodes: (nodes) => {
        set({ copiedNodes: nodes });
        toast.success("Copied web content", { duration: 3000 }); // Exact text from requirements
      },
      pasteNodes: (position) => {
        // ... pasting logic
        if (copiedNodes.length > 0) {
            toast.success("Pasted web content", { duration: 3000 });
        }
      },
      ```
    *This consolidates context menu logic, simplifies node components, and provides a true copy/paste workflow.*
