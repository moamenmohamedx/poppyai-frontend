# UI Tweaks Requirements Document

## 1. React Flow Handle Enhancement

### 1.1. Objective
Enhance the visual appeal and usability of the React Flow node handles by increasing their size and adding a distinct glow effect.

### 1.2. Requirements
- **Increase Handle Size:** The circular connection handles on all nodes must be made significantly larger to improve clickability and visibility, especially on high-resolution displays.
- **Neon Glow Effect:** Implement a "neon glow" visual effect around the edges of the handles.
  - The glow color should be dynamic, utilizing the primary brand color (`indigo-600`).
  - The glow should be subtle but noticeable, intensifying slightly on hover to provide clear visual feedback.
  - The effect must be performant and not degrade the canvas interaction experience.

## 2. Node Creation UX

### 2.1. Objective
Improve the user experience when creating new nodes by ensuring they appear in a predictable and immediately accessible location.

### 2.2. Requirements
- **Viewport-Centric Spawning:** When a user creates a new node (e.g., from a context menu or by dragging from a library), the node must appear in the center of the current viewport.
- **Avoid Off-Screen Creation:** Nodes should never be created outside the user's current view, eliminating the need for the user to pan or zoom out to find the newly created element.

## 3. AI Chat Node Redesign

### 3.1. Objective
Redesign the AI Chat Node to mirror the provided reference image, creating a more intuitive and organized two-part interface that respects the application's theme.

### 3.2. Requirements
- **Two-Column Layout:** The node's internal layout must be divided into two distinct vertical sections:
  - **Left Section (Conversation List):** This area will display a list of previous conversations, acting as a navigation or history panel. A prominent "+ New Conversation" button should be placed at the top, as seen in the reference.
  - **Right Section (Chat Interface):** This area will contain the active chat window, including the message display area and the text input field at the bottom.
- **Visual Fidelity:** The implementation must be an exact visual replica of the provided image, including layout, spacing, and iconography.
- **Theming:** The component must fully support both light and dark modes, adapting its colors to match the brand's established palette (`slate-*` for neutrals, etc.) while maintaining high contrast and readability.

## 4. Dark Mode Contrast Correction for Controls

### 4.1. Objective
Fix the poor visibility of the React Flow controls component in dark mode.

### 4.2. Requirements
- **Improve Contrast:** Adjust the color of the control icons and background to ensure they are clearly visible against the dark canvas background.
- **Reference Analysis:** The second provided image, which highlights the issue, should be used as a direct reference for what needs to be fixed. The final implementation should have no contrast issues.
- **Consistent Styling:** The corrected controls must maintain a consistent visual style with other UI elements in dark mode.

## 5. Custom Context Menu and Toast Notifications

### 5.1. Objective
Implement a custom right-click context menu with copy/paste functionality and provide clear visual feedback for these actions using toast notifications.

### 5.2. Requirements
- **Disable Native Context Menu:** The default browser right-click menu must be disabled across the entire canvas area.
- **Custom Menu Functionality:**
  - On right-click within the canvas or on a node, a custom context menu should appear.
  - This menu must include "Copy" and "Paste" options. The "Duplicate" option should be replaced by this new functionality.
- **Toast Notifications:**
  - When a user selects "Copy," a toast notification must appear at the top-center of the screen with the text "Copied web content" and a success icon, exactly as shown in the reference image.
  - When a user selects "Paste," a similar toast notification for "Pasted web content" should appear.
  - The toast notifications should be non-intrusive and disappear automatically after a short duration (e.g., 3 seconds).
