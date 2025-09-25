# Module 1: The Foundation - Thinking in Components

This document summarizes the core concepts of React covered in Module 1.

## The Core Idea: UI as a Function of Data

The fundamental mental shift from traditional UI programming to React is this: you don't tell the app *how* to change the UI step-by-step. Instead, you declare what the UI *should look like* for any given set of data. React's job is to keep the screen in sync with your data.

This can be expressed as a simple formula: **`UI = f(data)`**

-   **`f`**: Your React **Component**.
-   **`data`**: The **Props** and **State** of your component.

---

## 1. Components: The Building Blocks

A Component is the primary unit of React. It's a reusable, self-contained piece of the user interface.

-   **It's just a JavaScript function:** The convention is to name component functions with a capital letter (e.g., `ThemeToggle`, not `themeToggle`).
-   **It returns a description of the UI:** This description is written in JSX.
-   **They are composable:** You build complex UIs by nesting components inside other components.

### Codebase Example: `components/ThemeToggle.tsx`

```tsx
// A simple, self-contained component.
function ThemeToggle() {
  // ... logic ...

  // It returns JSX that describes the UI.
  return (
    <DropdownMenu>
      <Button>
        <Sun />
        <Moon />
      </Button>
    </DropdownMenu>
  );
}

// It is exported to be used in other files.
export default memo(ThemeToggle);
```

---

## 2. JSX: Describing the UI

JSX is a syntax extension for JavaScript that allows you to write HTML-like markup inside your code.

-   **It is not HTML:** It's a "syntactic sugar" that gets transformed into regular JavaScript function calls.
-   **Embed JavaScript with `{}`:** You can place any valid JavaScript expression inside curly braces.
-   **Use `className` for styling:** The `class` attribute in HTML becomes `className` in JSX.
-   **Use Components like tags:** Custom components are written like HTML tags, e.g., `<MyComponent />`.

---

## 3. Props: Passing Data to Components

**Props** (short for properties) are used to pass data from a parent component down to a child component.

-   **Read-Only:** A component can never modify its own props. This ensures a predictable, one-way data flow.
-   **The "Arguments" of a Component:** They are passed as attributes in JSX and received as the first argument to the component function.

### Codebase Example: `app/page.tsx` (Parent) -> `components/Dashboard.tsx` (Child)

**In the parent (`app/page.tsx`):**
A function `handleOpenProject` is defined and then passed as a prop to the `Dashboard` component.

```tsx
// 1. Define the function to be passed.
const handleOpenProject = (projectId: string) => {
  setCurrentProject(projectId);
  setCurrentView("canvas");
};

// 2. Pass it as a prop (like an HTML attribute).
<Dashboard onOpenProject={handleOpenProject} />
```

**In the child (`components/Dashboard.tsx`):**
The component receives `onOpenProject` in its function signature and can now use it.

```tsx
// 1. Define the expected types for the props (using TypeScript).
interface DashboardProps {
  onOpenProject: (projectId: string) => void;
}

// 2. Receive the prop as an argument.
export default function Dashboard({ onOpenProject }: DashboardProps) {
  
  // 3. Use the prop inside an event handler.
  return <Card onClick={() => onOpenProject(project.id)} />;
}
```

---

## 4. State (`useState`): A Component's Memory

**State** is data that is managed *by a component itself*. When state changes, React will automatically re-render the component to reflect the update.

-   **The `useState` Hook:** This is the primary function for adding state to a component.
-   **It returns a pair:** `const [value, setValue] = useState(initialValue);`
    1.  `value`: The current state value.
    2.  `setValue`: The updater function. You **must** use this function to change the state.
-   **Changing state triggers a re-render:** Calling the updater function tells React that the component's data has changed and the UI might need to be updated.

### Codebase Example: `app/page.tsx`

This component uses state to decide which view (`dashboard` or `canvas`) to display.

```tsx
export default function Home() {
  // 1. Declare a piece of state with an initial value of "dashboard".
  const [currentView, setCurrentView] = useState<"dashboard" | "canvas">("dashboard");

  // This function is passed as a prop to the Dashboard.
  const handleOpenProject = (projectId: string) => {
    // 2. When called, it uses the updater function to change the state.
    setCurrentView("canvas"); 
  };

  // 3. The JSX uses the state value to conditionally render the UI.
  return (
    <main>
      {currentView === "dashboard" ? (
        <Dashboard onOpenProject={handleOpenProject} />
      ) : (
        <Canvas />
      )}
    </main>
  );
}
```
When `handleOpenProject` is called, `setCurrentView('canvas')` runs. React detects the state change, re-renders the `Home` component, and because `currentView` is now `'canvas'`, the `<Canvas />` component is displayed instead of the `<Dashboard />`.
