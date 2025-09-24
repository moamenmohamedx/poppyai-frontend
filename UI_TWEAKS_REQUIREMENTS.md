# 📋 Document 1: UI Tweaks Requirements Confirmation

## **Executive Summary**
This document confirms the 5 critical UI tweaks identified for the AI Context Organizer canvas application, following the 80/20 rule for maximum impact with minimal complexity.

---

## **✅ Confirmed UI Tweaks**

#### **1. Canvas Renaming Feature** 🏷️
- **Current State**: Canvas displays static project name in header
- **Required Change**: Allow inline editing of project name directly from canvas
- **Database Impact**: Update must persist to Supabase `projects.name` field
- **Location**: Canvas header (`components/Canvas.tsx` line 49)

#### **2. Node Right-Click Context Menu** 📋
- **Current State**: Right-click functionality exists in legacy components but missing in React Flow nodes
- **Required Actions**: 
  - Copy node (duplicate with offset position)
  - Delete node (remove from canvas)
- **Components**: `ChatNode.tsx` and `ContextNode.tsx`

#### **3. Sidebar Maximize Fix** 🔧
- **Critical Bug**: Collapsed sidebar cannot be re-expanded
- **Current State**: When minimized, no visible button to restore
- **Required Fix**: Add visible expand button when collapsed
- **Location**: `components/ReactFlowContextLibrary.tsx` lines 107-114

#### **4. Save Button Position Adjustment** 💾
- **Current Issue**: Dark mode toggle overlaps save button
- **Current Position**: Top-right corner
- **New Position**: Center of header
- **Components Affected**: Save button and save status indicators

#### **5. Remove Floating Action Panel** 🗑️
- **Current State**: Floating panel with "Add Chat", "Add Context", "Reset", "Delete" buttons
- **Required Change**: Remove entire panel from canvas
- **Reasoning**: Redundant with left sidebar functionality
- **Location**: `components/ReactFlowCanvas.tsx` lines 249-300
