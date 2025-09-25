# Module 2: Component Lifecycle & Handling Side Effects

This document summarizes the concepts covered in Module 2, focusing on how React components manage dynamic behavior and interact with the outside world over time.

## 1. The Render Cycle: A Component's "Life"

A React component goes through a lifecycle of three main phases. Understanding this is key to knowing *when* to execute your code.

1.  **Mounting**: The component is created and inserted into the DOM (i.e., it appears on the screen for the first time). This is its "birth."
2.  **Updating**: The component re-renders because its `props` or `state` have changed. A component can update many times during its "life."
3.  **Unmounting**: The component is removed from the DOM (i.e., it disappears from the screen). This is its "death."

**Python Analogy**: The render cycle is like a GUI application's event loop. Instead of running once from top to bottom, React is constantly "listening" for state and prop changes, and it re-runs the render logic of affected components in response.

---

## 2. The `useEffect` Hook: Handling "Side Effects"

A **side effect** is any operation that affects something outside the component itself. You should not perform side effects directly in the main body of your component, as this would cause them to run on every single render.

Common side effects include:
-   Fetching data from an API or database.
-   Subscribing to timers or WebSockets.
-   Manually manipulating the DOM.
-   Adding and removing browser event listeners (e.g., for keyboard input).

The `useEffect` hook provides a safe and controlled place to manage this logic.

### Codebase Example: Initial Data Fetching in `components/Dashboard.tsx`

This effect runs only once when the `Dashboard` component first mounts, fetching the initial list of projects.

```tsx
// Load projects on mount
useEffect(() => {
  // This is the "effect" function.
  // It contains the code that performs the side effect.
  loadProjectsData();
}, []); // <-- The dependency array controls when the effect runs.
```

---

## 3. The Dependency Array: Controlling the Effect

The second argument to `useEffect` is the dependency array. It is the most important part for controlling the hook's behavior. It tells React to re-run the effect only when one of the values in the array has changed since the last render.

There are three rules to follow:

1.  **`[]` (Empty Array):** The effect runs **only once**, immediately after the component mounts. This is the correct choice for "on-load" data fetching or setup that only needs to happen once.
2.  **`[prop, state]` (Array with Values):** The effect runs after the first mount **and** any time any of the values inside the array change. This is used for reacting to changes in props or state.
3.  **No Array (Omitted):** The effect runs after **every single render**. This is rarely what you want and can easily cause infinite loops and performance problems.

---

## 4. The Cleanup Function: Preventing Memory Leaks

An effect can optionally return a function. This is called the **cleanup function**. React will execute this cleanup function before the component unmounts, and also before the effect runs again due to a dependency change.

It is essential for preventing memory leaks when you are setting up subscriptions, timers, or event listeners.

**Python Analogy**: The cleanup function is analogous to the `__exit__` method in a Python context manager (`with...as`). It ensures that resources are properly released when they are no longer needed.

### Codebase Example: Event Listener in `components/nodes/ChatNode.tsx`

This effect adds a keyboard listener, but only when the node is selected.

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... logic for handling the key press
  };

  // Only add the listener if the node is selected.
  if (selected) {
    document.addEventListener('keydown', handleKeyDown);

    // This is the CLEANUP function.
    // It runs when `selected` becomes false or when the component unmounts.
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }
}, [selected]); // Dependency: The effect and cleanup are tied to the `selected` prop.
```

This pattern ensures that at any given time, there is only one event listener active for this component, and it is properly removed when it's no longer needed.
