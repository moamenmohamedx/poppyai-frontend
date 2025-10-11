# Chapter 6: UI Components & Styling

## Overview

Printer AI uses shadcn/ui, a collection of reusable components built on Radix UI primitives and styled with Tailwind CSS. This chapter explores the component architecture, styling patterns, and dark mode implementation.

---

## 1. The shadcn/ui Philosophy

### Not a Component Library

shadcn/ui is **NOT** an npm package you install. Instead:

1. **Copy components into your project** - Full control and customization
2. **Built on Radix UI** - Accessible, unstyled primitives
3. **Styled with Tailwind** - Utility-first CSS
4. **Customizable** - Modify components directly in your codebase

### Benefits

- No vendor lock-in
- No bloated dependencies
- Full TypeScript support
- Complete customization
- Tree-shaking friendly

---

## 2. Tailwind CSS Basics

### Utility Classes

```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold text-gray-900">Hello</h1>
  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
    Click Me
  </button>
</div>
```

### Common Patterns

```typescript
// Layout
flex              // display: flex
flex-col          // flex-direction: column
items-center      // align-items: center
justify-between   // justify-content: space-between
gap-4             // gap: 1rem

// Spacing
p-4               // padding: 1rem (all sides)
px-4              // padding-left: 1rem, padding-right: 1rem
py-2              // padding-top: 0.5rem, padding-bottom: 0.5rem
m-4               // margin: 1rem
mt-2              // margin-top: 0.5rem

// Typography
text-sm           // font-size: 0.875rem
text-lg           // font-size: 1.125rem
font-bold         // font-weight: 700
text-gray-900     // color: rgb(17, 24, 39)

// Backgrounds
bg-white          // background-color: white
bg-blue-500       // background-color: rgb(59, 130, 246)

// Borders
border            // border-width: 1px
border-2          // border-width: 2px
border-gray-200   // border-color: rgb(229, 231, 235)
rounded           // border-radius: 0.25rem
rounded-lg        // border-radius: 0.5rem

// Effects
shadow-md         // box-shadow: medium
shadow-lg         // box-shadow: large
hover:bg-blue-600 // Change on hover
transition-all    // Smooth transitions
```

---

## 3. Dark Mode with Tailwind

### Dark Mode Classes

```typescript
<div className="bg-white dark:bg-black text-gray-900 dark:text-white">
  <button className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700">
    Click Me
  </button>
</div>
```

### Pattern

```typescript
// Light mode first, then dark: prefix
className="bg-white dark:bg-black"

// Combine with states
className="bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900"
```

---

## 4. next-themes Integration

### Theme Provider Setup

```typescript
// From frontend/app/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"          // Adds 'dark' class to <html>
      defaultTheme="system"      // Follow system preference
      enableSystem               // Detect system dark mode
      disableTransitionOnChange  // Prevent flash
    >
      {children}
    </ThemeProvider>
  )
}
```

### Using Theme Hook

```typescript
'use client'

import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const currentTheme = theme === 'system' ? systemTheme : theme
  
  return (
    <button
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
    >
      {currentTheme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

---

## 5. CSS Variables for Theming

### Global Styles

```css
/* From frontend/app/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --purple-500: 168 85% 63%;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --purple-500: 168 85% 63%;
  }
}
```

### Using Variables

```typescript
<div className="bg-background text-foreground">
  <div className="bg-card text-card-foreground">
    Card content
  </div>
</div>
```

Tailwind converts these to: `bg-[hsl(var(--background))]`

---

## 6. Radix UI Primitives

Radix provides unstyled, accessible component behavior.

### Dialog Example

```typescript
// From frontend/components/ui/dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
        "bg-white dark:bg-black p-6 rounded-lg shadow-lg",
        "max-w-lg w-full",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
```

### Usage

```typescript
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <h2>Dialog Title</h2>
        <p>Dialog content goes here</p>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 7. Class Variance Authority (CVA)

CVA provides type-safe component variants.

### Button Example

```typescript
// From frontend/components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  // Base classes (always applied)
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### Usage

```typescript
<Button variant="default" size="default">Click Me</Button>
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="outline" size="lg">Cancel</Button>
<Button variant="ghost" size="icon">
  <X className="h-4 w-4" />
</Button>
```

---

## 8. cn() Utility Function

Combines Tailwind classes intelligently.

```typescript
// From frontend/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Why cn()?

```typescript
// Problem: Later classes don't override earlier ones
<div className="text-red-500 text-blue-500">
  // Both colors applied!
</div>

// Solution: cn() merges intelligently
<div className={cn("text-red-500", "text-blue-500")}>
  // Only blue-500 applied
</div>

// Conditional classes
<div className={cn(
  "px-4 py-2 rounded-lg",
  isActive && "bg-blue-500 text-white",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
```

---

## 9. Component Composition Pattern

shadcn components are designed to be composed.

### Card Example

```typescript
// From frontend/components/ui/card.tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
)

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
)

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-2xl font-semibold leading-none", className)} {...props} />
)

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
)
```

### Usage

```typescript
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Benefits:**
- Flexible composition
- Consistent spacing
- Easy to customize
- Type-safe

---

## 10. Real-World Example: ChatNode UI

Let's analyze the ChatNode's UI structure:

```typescript
// From frontend/components/nodes/ChatNode.tsx
<Card className="w-[700px] h-[700px] bg-white dark:bg-black shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-gray-200 dark:border-purple-500/30">
  {/* Header */}
  <div className="flex items-center justify-between px-3 py-2 bg-purple-100 dark:bg-purple-900/30">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
        <MessageSquare className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="font-semibold text-sm text-gray-800 dark:text-purple-300">AI Chat</span>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
    >
      <X className="w-3.5 h-3.5" />
    </Button>
  </div>
  
  {/* Two Column Layout */}
  <div className="flex h-[calc(100%-44px)]">
    {/* Left: Conversations */}
    <div className="w-[200px] bg-purple-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700">
      <Button className="w-full bg-purple-600 hover:bg-purple-700">
        <Plus className="w-4 h-4 mr-1.5" />
        New Conversation
      </Button>
    </div>
    
    {/* Right: Chat */}
    <div className="flex-1 bg-gray-50 dark:bg-slate-950 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg) => (
          <div className={cn(
            "max-w-[85%] px-4 py-2 rounded-lg",
            msg.role === 'user'
              ? "bg-purple-600 text-white"
              : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200"
          )}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="px-4 pb-4">
        <input
          className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-200"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
    </div>
  </div>
</Card>
```

### Patterns Used

1. **Card Component**: Base container
2. **Flexbox Layout**: Two-column structure
3. **Dark Mode**: Every element has dark: variants
4. **Custom Shadows**: Glow effects in dark mode
5. **Conditional Classes**: cn() for message bubbles
6. **Responsive Sizing**: calc() for dynamic heights
7. **Color Consistency**: Purple theme throughout

---

## 11. Icon System: Lucide React

```typescript
import { MessageSquare, X, Plus, Send } from 'lucide-react'

<MessageSquare className="w-4 h-4 text-purple-600" />
<X className="w-3.5 h-3.5" />
<Send className="w-5 h-5" />
```

**Benefits:**
- Tree-shakeable (only import what you use)
- Consistent sizing with Tailwind
- Customizable with className
- Large icon library

---

## 12. Toast Notifications

```typescript
import { toast } from 'sonner'

// Success
toast.success('Message sent successfully')

// Error
toast.error('Failed to send message')

// Loading
toast.loading('Sending message...')

// Custom
toast('Custom message', {
  description: 'Additional details',
  duration: 3000,
  position: 'top-center'
})
```

### Toaster Setup

```typescript
// In layout.tsx
import { Toaster } from '@/components/ui/sonner'

<Toaster position="top-center" />
```

---

## 13. Form Components

### Input Example

```typescript
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>
```

### Select Example

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

---

## 14. Alert Dialog

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 15. Dropdown Menu

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="w-4 h-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      <Edit2 className="w-4 h-4 mr-2" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
      <Trash2 className="w-4 h-4 mr-2" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 16. Responsive Design

### Tailwind Breakpoints

```typescript
<div className="
  flex flex-col        /* Mobile: column */
  md:flex-row          /* Tablet+: row */
  lg:items-center      /* Desktop: center items */
  xl:gap-8             /* Large: bigger gap */
">
```

### Breakpoint Values

- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

---

## 17. Animation with Tailwind

### Transitions

```typescript
<button className="
  transition-all          /* Animate all properties */
  duration-200            /* 200ms */
  hover:scale-105         /* Grow on hover */
  hover:shadow-lg         /* Shadow on hover */
  active:scale-95         /* Shrink on click */
">
```

### Custom Animations

```css
/* globals.css */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}
```

---

## Key Takeaways

1. **shadcn/ui**: Copy components, not npm install
2. **Tailwind**: Utility-first CSS with dark mode support
3. **Radix UI**: Accessible, unstyled primitives
4. **CVA**: Type-safe component variants
5. **cn()**: Intelligent class merging
6. **Composition**: Build complex UI from simple pieces
7. **Theme**: CSS variables + next-themes
8. **Icons**: Lucide React for consistent icons
9. **Toasts**: Sonner for notifications
10. **Forms**: Label, Input, Select, etc.

---

## Best Practices

1. **Always use cn()** for conditional classes
2. **Dark mode everywhere** - Every component should support it
3. **Consistent spacing** - Use Tailwind's spacing scale
4. **Accessible** - Radix handles most of it, but test
5. **Semantic HTML** - Use proper elements (button, not div with onClick)
6. **Reusable variants** - Use CVA for component options
7. **CSS variables** - For theme-aware colors
8. **Icon sizing** - Consistent w-4 h-4 or w-5 h-5

---

## Next Steps

Now you can:
- Build beautiful, accessible UI components
- Implement dark mode consistently
- Create complex layouts with Tailwind
- Use Radix primitives for interactive elements
- Understand how Printer AI's UI is structured

The UI is the face of the application - make it beautiful and functional!

