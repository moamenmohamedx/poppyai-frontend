# UI Tweaks - Technical Implementation Plan

**Author:** Dr. Alex Turing, Front-End Architect
**Date:** September 24, 2025
**Status:** In Progress

---

## Introduction

This document provides a detailed technical implementation plan for the UI enhancements outlined in `UI_TWEAKS_REQUIREMENTS.md`. The plan is based on a thorough audit of the existing Next.js/React Flow codebase and is designed to be executed efficiently by the development team, adhering to the 80/20 principle.

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
