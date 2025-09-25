# UI Tweaks Implementation Plan (September 2025)

## Overview

This document provides a detailed technical implementation plan for the UI and functionality enhancements outlined in `UI_TWEAKS_REQUIREMENTS.md`. Each section maps a requirement to specific, actionable changes in the codebase.


## 1. Revised Node Handle Configuration

**Objective:** Standardize all node handles to a single-handle, right-to-left connection model. Context-providing nodes will have one `source` handle on the right, and the `ChatNode` will have one `target` handle on the left.

**Plan:**

**A. Update `ChatNode`:**
   - **File:** `components/nodes/ChatNode.tsx`
   - **Action:** Remove the right-side handle, leaving only the existing `target` handle on the left.

**Code Sketch (Diff for `ChatNode.tsx`):**
```diff
// components/nodes/ChatNode.tsx

// ...
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="left-target"
          className="!bg-indigo-600 dark:!bg-purple-500 !border-white dark:!border-slate-900 dark:handle-glow-purple dark:handle-glow-purple-hover"
          style={{ width: '20px', height: '20px' }}
          isConnectable={true}
        />
        
        <Card>
          {/* ... Card Content ... */}
        </Card>
        
```

**B. Update `ContextNode`:**
   - **File:** `components/nodes/ContextNode.tsx`
   - **Action:** Remove the left-side `target` handle, leaving only the existing `source` handle on the right.

**Code Sketch (Diff for `ContextNode.tsx`):**
```diff
// components/nodes/ContextNode.tsx

// ...
        {/* Connection handles */}
        
        <Card>
          {/* ... Card Content ... */}
        </Card>
        
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-indigo-600 dark:!bg-purple-500 !border-white dark:!border-slate-900 dark:handle-glow-purple dark:handle-glow-purple-hover"
          style={{ width: '20px', height: '20px' }}
          isConnectable={true}
        />
// ...
```

**C. Define Handles for New `TextBlockNode`:**
   - **File:** `components/nodes/TextBlockNode.tsx` (during creation)
   - **Action:** Ensure the new node is created with only a single `source` handle on the right.

---

## 2. Interactive Edge Disconnection

**Objective:** Add a button to edges that allows users to delete the connection on hover.

**Plan:**

**1. Create a Custom Edge Component:**
   - **File:** `components/edges/CustomEdge.tsx` (new file)
   - **Structure:**
     - This component will render the edge path and the disconnect button.
     - Use the `getSmoothStepPath` utility from React Flow to calculate the SVG path data.
     - Render a `path` element for the visible edge.
     - Render a second, wider, transparent `path` element on top for easier hover detection.
     - Use a `<foreignObject>` to position an HTML `<button>` at the center of the edge (`path` midpoint).
     - The button will only be visible when the edge is hovered (`[group-hover]:block`).
     - The button's `onClick` handler will call `useReactFlowStore.getState().deleteEdge(id)`.

**2. Register the Custom Edge Type:**
   - **File:** `components/ReactFlowCanvas.tsx`
   - **Change Details:**
     - Import the `CustomEdge` component.
     - Create an `edgeTypes` object and pass it to the `<ReactFlow>` component.
     - Modify the `onConnect` handler in `useReactFlowStore.ts` (or `handleConnect` in `ReactFlowCanvas.tsx`) to specify `type: 'custom'` when creating new edges.

---

## 3. Data Flow: Text Node to Chat Node

**Objective:** Pass data from a connected `TextBlockNode` to a `ChatNode`.

**Plan:**

**1. Update Type Definitions:**
   - **File:** `types/reactFlowTypes.ts`
   - **Change Details:**
     - Add `sourceNodeIds?: string[]` to the `ChatNodeData` interface to store the IDs of connected context-providing nodes.
     - Define a `TextBlockNodeData` interface containing fields for the primary and secondary text content.

**2. Modify State Management on Connection:**
   - **File:** `stores/useReactFlowStore.ts`
   - **Change Details:**
     - In the `onConnect` function, check if the connection is from a `textBlockNode` to a `chatNode`.
     - If it is, find the target `chatNode` in the `nodes` array.
     - Update the target node's `data` object to include the source node's ID in the `sourceNodeIds` array.
     - Use the `updateNode` function to apply the change.

**Code Sketch (Logic for `onConnect`):**
```typescript
// stores/useReactFlowStore.ts

// ... in onConnect function
if (sourceNode?.type === 'textBlockNode' && targetNode?.type === 'chatNode') {
    const targetNodeData = targetNode.data as ChatNodeData;
    const updatedSourceIds = [...(targetNodeData.sourceNodeIds || []), sourceNode.id];
    
    // Create a new data object for the target node
    const newTargetNodeData = { ...targetNodeData, sourceNodeIds: updatedSourceIds };

    // Update the node in the store
    get().updateNode(targetNode.id, { data: newTargetNodeData });

    // Add the edge as usual
    // ...
}
```

**3. Update Connection Validation:**
   - **File:** `components/ReactFlowCanvas.tsx`
   - **Change Details:**
     - Update `isValidConnection` and the validation logic within `handleConnect` to allow connections from `textBlockNode` to `chatNode`.

**4. Accessing Data in `ChatNode`:**
   - The `ChatNode.tsx` component will now have access to `data.sourceNodeIds`.
   - It can use these IDs to get the full data of the connected `TextBlockNode`(s) from the `nodes` array in the `useReactFlowStore`. This allows it to display or use the text content.
