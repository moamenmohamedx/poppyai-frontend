# 🚀 Supabase Setup Guide for AI Context Organizer

## Quick Start (5 minutes)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New project"
3. Fill in:
   - Project name: `ai-context-organizer` (or your preference)
   - Database password: (save this securely)
   - Region: Choose closest to you
4. Click "Create project" and wait ~2 minutes

### 2. Run Database Migration
1. In your Supabase dashboard, click "SQL Editor" (left sidebar)
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

### 3. Get Your API Keys
1. In Supabase dashboard, click "Settings" (gear icon, left sidebar)
2. Click "API" in the settings menu
3. Copy these values:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **Anon/Public Key**: `eyJ...` (long string)

### 4. Configure Environment
1. Create `.env.local` file in the frontend root:
```bash
cp env.example .env.local
```

2. Edit `.env.local` and paste your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Start the Application
```bash
npm run dev
```

Visit http://localhost:3000 and create your first project! 🎉

## Features Implemented

### ✅ Complete State Persistence
- **Projects**: Create, list, update, delete
- **Canvas State**: Nodes, edges, viewport saved automatically
- **Auto-save**: Debounced 2-second saves on any change
- **Manual Save**: Click save button for instant persistence

### ✅ User Experience
- **Save Status Indicator**: Shows saving/saved/error states
- **Loading States**: Skeleton loaders while fetching
- **Error Handling**: Toast notifications for all operations
- **Relative Timestamps**: "2h ago", "3d ago" format

### ✅ Performance Optimizations
- **Debounced Saves**: Prevents excessive API calls
- **Clean Serialization**: Strips UI-only state before saving
- **Viewport Persistence**: Remembers zoom and pan position
- **Last-write-wins**: Simple conflict resolution

## Architecture Overview

```
Frontend (Next.js 15 + React 19)
    ↓
Zustand Stores (State Management)
    ↓
Persistence Layer (lib/supabase/)
    ↓
Supabase (PostgreSQL + REST API)
```

### Key Files
- `lib/supabase/client.ts` - Supabase client configuration
- `lib/supabase/projects.ts` - CRUD operations for projects/canvas
- `hooks/useAutoSaveCanvas.ts` - Auto-save logic with debouncing
- `app/providers/ProjectProvider.tsx` - Project context and save status
- `stores/useReactFlowStore.ts` - React Flow state with viewport

## Troubleshooting

### "Supabase not configured" warning
- Ensure `.env.local` exists with correct values
- Restart dev server after adding env vars

### Canvas not saving
- Check browser console for errors
- Verify Supabase project is running
- Check network tab for failed requests

### Projects not loading
- Ensure tables were created (run migration)
- Check Supabase dashboard → Table Editor
- Verify API keys are correct

## Next Steps

### Phase 1 Complete ✅
- [x] Database setup
- [x] Supabase client
- [x] Persistence layer
- [x] Auto-save mechanism
- [x] UI integration

### Future Enhancements
- [ ] Authentication (when ready)
- [ ] Real-time collaboration
- [ ] Canvas thumbnails
- [ ] Version history
- [ ] Export/import projects

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase dashboard shows your tables
3. Ensure environment variables are set correctly
4. Try clearing browser cache and refreshing

---

**Built with 80/20 precision** - Simple, effective, production-ready! 🎯
