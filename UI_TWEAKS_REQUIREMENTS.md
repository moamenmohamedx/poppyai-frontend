# UI Tweaks Requirements (September 2025)

## Overview

This document outlines the requirements for the next set of UI and functionality enhancements for the AI Context Organizer application. Each requirement has been detailed to ensure clarity for implementation.


## 1. Enhanced Connectivity for Chat Node

- **Requirement:** Modify the existing `ChatNode` to allow connections from both left and right sides.
- **Technical Feasibility:** This requirement is subject to a technical feasibility check before implementation.
- **Functional Specification:**
    - The `ChatNode` must be able to function as both a target and a source on both its left and right sides.
    - This means it should have handles (`<Handle />`) configured as follows:
        - **Left Side:** One `target` handle and one `source` handle.
        - **Right Side:** One `target` handle and one `source` handle.
    - This will allow for more flexible and complex workflow creations, enabling connections to flow into and out of the `ChatNode` from either direction.

## 2. Interactive Edge Disconnection

- **Requirement:** Implement a feature to easily disconnect two nodes by removing the edge connecting them.
- **Description:** The reference image illustrates a curved, dashed connection line (an edge) between two points. At the midpoint of this edge, a circular red button with a white 'x' is shown, indicating a control to delete or sever the connection.
- **Interaction Details:**
    - When a user hovers their cursor over the midpoint of an edge, a disconnect button should appear.
    - **Button Appearance:** The button should be a circular, red icon (`bg-red-500`) with a white "x" symbol in the center.
    - **Functionality:**
        - Clicking this "x" button must delete the edge from the canvas.
        - The button should disappear when the cursor is no longer hovering over the edge.
    - This functionality should be applied to all edge types in the application.

## 3. Data Flow: Text Node to Chat Node

- **Requirement:** Define and specify the data flow mechanism for passing context from a `Text Block` node to an `AI Chat` node.
- **Conceptual Goal:** The content within a `Text Block` should be usable as context or input for a connected `AI Chat` node.
- **Specification:**
    - When a `Text Block` node is connected to an `AI Chat` node (i.e., an edge is created from a `Text Block`'s source handle to a `Chat Node`'s target handle), the `AI Chat` node must be made aware of the `Text Block`'s content.
    - The data to be passed should include:
        - The content of the primary text input.
        - The content of the secondary notes input.
    - The implementation plan should detail how the application state (likely managed by Zustand) will be updated to reflect this connection and make the text content available to the `ChatNode`'s logic.
