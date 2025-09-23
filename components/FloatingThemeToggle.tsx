"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { memo, useEffect, useState } from "react"

function FloatingThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      onClick={toggleTheme}
      size="sm"
      className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full p-0 
                 bg-white/90 backdrop-blur-md border border-slate-200 
                 hover:bg-white hover:border-slate-300 hover:scale-105
                 dark:bg-black/50 dark:border-purple-500/30 dark:hover:bg-black/70
                 dark:hover:border-purple-400 dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]
                 shadow-lg transition-all duration-300"
    >
      <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all 
                      text-amber-600 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all 
                      text-purple-400 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export default memo(FloatingThemeToggle)
