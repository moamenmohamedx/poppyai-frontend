# UI Tweaks Implementation Plan (September 2025)

## Overview

This document provides a detailed technical implementation plan for the UI and functionality enhancements outlined in `UI_TWEAKS_REQUIREMENTS.md`. Each section maps a requirement to specific, actionable changes in the codebase.


## 1. Enhanced Connectivity for Chat Node

**Objective:** Allow the `ChatNode` to accept connections on both its left and right sides.

**File to Edit:** `components/nodes/ChatNode.tsx`

**Change Details:**
- Add two new `<Handle>` components.
- One `source` handle on the left (`Position.Left`).
- One `target` handle on the right (`Position.Right`).
- Ensure all four handles are rendered and connectable.

**Code Sketch (Diff):**
```diff
// components/nodes/ChatNode.tsx

// ...
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="left-target"
          // ...
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left-source"
          className="!bg-green-500 dark:!bg-green-400 !border-white dark:!border-slate-900"
          style={{ top: 'auto', bottom: 20, width: '16px', height: '16px' }}
          isConnectable={true}
        />
        
        <Card>
          {/* ... Card Content ... */}
        </Card>
        
        <Handle
          type="source" 
          position={Position.Right}
          id="right-source"
          // ...
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right-target"
          className="!bg-red-500 dark:!bg-red-400 !border-white dark:!border-slate-900"
          style={{ top: 'auto', bottom: 20, width: '16px', height: '16px' }}
          isConnectable={true}
        />
// ...
```

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
