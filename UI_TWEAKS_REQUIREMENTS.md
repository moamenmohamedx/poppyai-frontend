# UI Tweaks Requirements Document

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
