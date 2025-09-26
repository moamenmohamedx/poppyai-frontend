# Technical Plan: Frontend Integration with Canvas AI Agent

| | |
|---|---|
| **Author** | Dr. Evelyn Reed, Principal Software Architect |
| **Date** | September 26, 2025 |
| **Version** | 1.0 |
| **Status** | Approved for Implementation |

---

## 1.0 Executive Summary

This document outlines the technical implementation plan for integrating the AI Canvas frontend, built with Next.js and React Flow, with the FastAPI-based AI Agent backend. The primary goal is to enable a seamless, contextual conversational experience. The core user interaction involves connecting various context nodes (e.g., text nodes) to a chat node on the canvas, which then passes the aggregated context along with the user's message to the AI agent via a dedicated API endpoint. This plan focuses exclusively on the frontend tasks required to achieve this integration, emphasizing robust architecture, type safety, and a superior user experience.

## 2.0 Objectives & Success Criteria

### 2.1 Objectives

1.  **Establish Communication:** Implement a reliable API client to communicate with the `http://127.0.0.1:8000/api/chat` backend endpoint.
2.  **Enable Context-Aware Conversations:** Develop a mechanism to collect textual content from all context nodes connected to a specific chat node on the canvas.
3.  **Integrate Chat Functionality:** Refactor the primary chat component (`ChatCard.tsx`) to send user messages and aggregated context to the backend.
4.  **Display AI Responses:** Render responses from the AI agent within the chat interface, including any relevant metadata or citations.
5.  **Implement Robust Error Handling:** Provide clear feedback to the user in case of API failures or other errors.

### 2.2 Success Criteria

The integration will be considered successful when the following criteria are met:

-   A user can add a text node and a chat node to the canvas and connect them.
-   Sending a message from the chat node triggers a `POST` request to the `/api/chat` endpoint.
-   The request payload correctly includes the user's message and an array of text content from the connected context node(s).
-   The AI's response is successfully received and displayed in the chat node's UI.
-   The UI provides feedback for loading states (while awaiting a response) and displays a user-friendly message upon API error.

---

## 3.0 Architectural Approach

The integration will leverage the existing frontend architecture, which includes Next.js, TypeScript, Zustand for state management, and React Flow for the canvas UI. Our approach is designed for modularity and scalability.

1.  **API Service Layer:** A dedicated, reusable `ApiClient` class will be implemented to handle all communication with the backend. This encapsulates API logic, making it easy to manage and test.
2.  **Context Aggregation:** A utility function, `getConnectedContextForChat`, will be created. This function will read the current canvas state (nodes and edges) from the `useCanvasStore` (Zustand) to dynamically collect and format context from nodes connected to the active chat component.
3.  **Component-Level Integration:** The `ChatCard.tsx` component will be modified to orchestrate the process: invoking the context aggregator, calling the API client, and updating the component's state to reflect the conversation flow (user message, loading state, AI response, errors).

## 4.0 Implementation Plan

The implementation will be executed in three distinct phases to ensure a structured and organized workflow.

### Phase 1: Environment & API Client Setup

**Objective:** Prepare the foundational components for backend communication.

-   **Task 1.1: Configure Environment Variables**
    -   Create a `.env.local` file in the `frontend` root.
    -   Add the following variable to configure the API base URL:
        ```env
        NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
        ```

-   **Task 1.2: Implement API Client Service**
    -   Create a new file: `frontend/lib/api/client.ts`.
    -   Implement the `ApiClient` class to handle `fetch` requests to the backend. This class will include methods for the `/api/chat` endpoint and a health check.
    -   Define and export the necessary TypeScript interfaces for type-safe API communication.

    ```typescript
    // In frontend/lib/api/client.ts

    export interface ChatRequest {
      user_message: string;
      context_texts: string[];
    }

    export interface ChatResponse {
      response: string;
    }

    class ApiClient {
      private baseUrl: string;

      constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000') {
        this.baseUrl = baseUrl;
      }

      async chat(request: ChatRequest): Promise<ChatResponse> {
        // Implementation details...
      }

      async healthCheck(): Promise<{ status: string }> {
        // Implementation details...
      }
    }

    export const apiClient = new ApiClient();
    ```

### Phase 2: State & Context Management

**Objective:** Develop the logic for collecting contextual data from the canvas.

-   **Task 2.1: Implement Context Aggregation Logic**
    -   Create a new file: `frontend/lib/context/collector.ts`.
    -   Implement the `getConnectedContextForChat` function. This function will accept a `chatCardId` and perform the following:
        1.  Access the `edges` and `nodes` from the `useCanvasStore`.
        2.  Filter edges to find all source nodes connected to the target `chatCardId`.
        3.  Retrieve the content from each connected context node based on its type.
        4.  Return an array of strings representing the collected context.

### Phase 3: UI Integration

**Objective:** Connect the chat component to the backend and manage the conversational state.

-   **Task 3.1: Refactor `ChatCard.tsx` for Backend Communication**
    -   Locate the `handleSendMessage` function within `frontend/components/ChatCard.tsx`.
    -   Modify the function to incorporate the new logic:
        1.  On message submission, add the user's message to the state immediately for a responsive UI.
        2.  Call `getConnectedContextForChat` with the current card's ID to get relevant context.
        3.  Invoke `apiClient.chat()` with the user's message and the collected context.
        4.  On a successful response, add the AI's message to the chat state.
        5.  On failure, trigger the error handling logic.

-   **Task 3.2: Implement UI Feedback (Loading & Error States)**
    -   Introduce a new state variable (e.g., `isLoading`) within `ChatCard.tsx`.
    -   Set `isLoading` to `true` before the API call and `false` after completion or failure.
    -   Use this state to render a loading indicator (e.g., "AI is thinking...") in the chat interface.
    -   Display error messages received from the API client in the chat history, formatted clearly to distinguish them from user or AI messages.

---

## 5.0 Error Handling Strategy

A consistent error handling strategy is crucial for a reliable user experience.

1.  **API Client:** The `ApiClient` will be the primary point of error detection. It will check for non-ok HTTP responses (`!response.ok`) and network errors (within a `try...catch` block). It will throw a structured `Error` object to be caught by the calling component.
2.  **UI Component (`ChatCard.tsx`):** The `handleSendMessage` function will wrap its API call logic in a `try...catch` block. Upon catching an error, it will:
    -   Log the detailed error to the console for debugging purposes.
    -   Add a formatted error message to the chat history (e.g., "Sorry, an error occurred. Please try again.").
    -   Ensure any loading indicators are turned off.

---

## 6.0 Testing & Validation Plan

1.  **Unit Testing:**
    -   The `getConnectedContextForChat` function should be unit-tested with mock canvas state to ensure it correctly identifies and extracts text from connected nodes.
    -   The `ApiClient` methods can be tested using a mock `fetch` implementation.

2.  **Manual End-to-End Testing:**
    -   **Scenario 1 (Happy Path):**
        -   Start backend and frontend servers.
        -   Create a text node with content "Fact A".
        -   Create a chat node.
        -   Connect the text node to the chat node.
        -   Send a message: "What do you know?".
        -   **Expected:** The AI responds, referencing "Fact A".
    -   **Scenario 2 (No Context):**
        -   Send a message in a chat node with no connections.
        -   **Expected:** The AI responds without any specific context.
    -   **Scenario 3 (API Error):**
        -   Stop the backend server.
        -   Send a message in the chat node.
        -   **Expected:** The UI displays a user-friendly error message in the chat history.

---

## 7.0 Future Considerations

Upon successful completion of this integration, the following enhancements should be prioritized:

-   **Context Previews:** Display a summary of connected context items within the chat UI.
-   **Chat History Persistence:** Implement a mechanism to save and load chat conversations, likely leveraging `localStorage` or a database via Supabase.
-   **Streaming Responses:** Upgrade the API client and chat component to handle streaming responses from the backend for a more real-time feel.
