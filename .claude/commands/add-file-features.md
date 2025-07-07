# /add-file-features - Extend File Management

You are a helpful assistant that guides users through extending the existing file management features in their VibeCode Template app. This template already has a complete file management system with Firebase Storage integration.

## What This Command Does

Helps users extend the existing file management system. The template already includes:

### 🔧 **Backend Foundation**
- Complete file CRUD operations (`server/routes/fileRoutes.ts`)
- File storage layer (`server/storage/FileStorage.ts`)
- User ownership verification and security middleware
- Plan-based file limits (Free: 10 files/100MB, Pro: 100 files/1GB)

### 🖥️ **Frontend Components**
- `useFiles()` hook - Complete file operations with state management
- `<FileUpload />` - Drag & drop upload with progress tracking
- `<FileList />` - File listing with preview, download, and delete
- `/files` page - Complete file management interface
- Firebase integration (`client/src/lib/firebase.ts`)

### 📊 **Current Features**
- File upload with progress tracking and validation
- File preview for images and PDFs
- Download and delete functionality
- Storage usage tracking and limits
- User-specific file organization (`users/{userId}/files/`)
- Secure file access with Firebase Auth

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**File Feature Type:**
- [ ] What file features do you want to add?
  - a) File sharing (public links, user-specific access)
  - b) File organization (folders, categories, tags)
  - c) File collaboration (comments, version history)
  - d) File processing (image resizing, format conversion)
  - e) File search and filtering
  - f) Bulk file operations

**Organization Method:**
- [ ] How do you want files organized?
  - Folder structure (like traditional file systems)
  - Tags and labels (flexible categorization)
  - Categories with subcategories
  - Project-based organization

**Sharing Requirements:**
- [ ] How should file sharing work?
  - Public links anyone can access
  - User-specific sharing with permissions
  - Time-limited access links
  - Password-protected sharing

## Step 2: Implementation Based on User Answers

### Option A: File Sharing

If user wants file sharing capabilities:

1. **Extend Database Schema**
   - Study the existing file schema in `shared/schema.ts`
   - Add new tables for file sharing following the existing naming conventions
   - Include fields for share tokens, permissions, expiration, and access tracking
   - Use the same column types and references pattern as existing tables
   - Follow the existing foreign key relationship patterns (e.g., `references(() => users.firebaseId)`)
   - Run `npm run db:push` to apply schema changes

2. **Extend Existing FileStorage Service**
   - Open `server/storage/FileStorage.ts` to understand the existing patterns
   - Add new functions following the existing async/await patterns
   - Use the existing database query patterns with Drizzle ORM
   - Generate unique share tokens (consider using nanoid library)
   - Follow the existing error handling and return patterns
   - Implement password hashing if using password-protected shares
   - Use the existing `db` import and query builder patterns

3. **Extend Existing File Routes**
   - Study `server/routes/fileRoutes.ts` for existing route patterns
   - Add new routes following the existing RESTful conventions
   - Use the existing `requiresAuth` middleware pattern for protected routes
   - Follow the existing error handling and response patterns
   - Utilize the existing FileStorage methods (like `getFileById`)
   - Implement proper validation for route parameters
   - Generate full share URLs using request protocol and host
   - Handle expiration checks and access control logic

4. **Create File Sharing Component**
   - Look at existing dialog components for patterns (e.g., file upload dialogs)
   - Use the existing UI components from `client/src/components/ui/`
   - Follow the existing state management patterns with React hooks
   - Integrate with the existing toast notification system (`use-toast`)
   - Use the existing fetch patterns for API calls
   - Implement proper loading and error states following existing patterns
   - Use Lucide React icons consistently with other components
   - Apply Tailwind classes following the existing style patterns

### Option B: File Organization with Folders

If user wants folder organization:

1. **Create Folder Database Schema**
   - Add a folders table to `shared/schema.ts` following existing patterns
   - Include self-referencing parentId for nested folder structure
   - Add userId field following the existing foreign key pattern
   - Update the existing files table to include a folderId reference
   - Use the same timestamp patterns (createdAt, updatedAt)
   - Run `npm run db:push` after schema changes

2. **Create Folder Management Component**
   - Study existing component patterns in `client/src/components/`
   - Build a tree structure component for folder hierarchy
   - Use existing UI components (Button, Input, DropdownMenu)
   - Implement expand/collapse functionality with state management
   - Follow existing fetch patterns for API communication
   - Use the existing toast system for user feedback
   - Apply consistent hover and selection states with Tailwind
   - Handle nested folder rendering with proper indentation

### Option C: File Tags and Search

If user wants tagging and search:

1. **Create Tags Database Schema**
   - Add tags and file_tags tables to `shared/schema.ts`
   - Follow the existing foreign key patterns for relationships
   - Include user-specific tags with userId reference
   - Create a many-to-many relationship table (file_tags)
   - Add color field for visual tag differentiation
   - Run `npm run db:push` to apply changes

2. **Create File Search Component**
   - Look at existing search components (e.g., `SearchBar.tsx`) for patterns
   - Use existing UI components (Input, Badge, Select)
   - Implement real-time search with useEffect hooks
   - Build tag selection interface with visual feedback
   - Use URL search params for API queries
   - Follow existing state management patterns
   - Apply consistent styling with Tailwind classes
   - Handle multiple filter criteria (search term, tags, file type)

## Step 3: Update Existing Components

Integrate new features with existing file upload and management:

### A. Update FileList Component
- Open `client/src/components/FileList.tsx` to understand the existing structure
- Add new action buttons alongside existing delete and download buttons
- Import and integrate any new dialog components (sharing, tagging)
- Maintain the existing error handling and toast notification patterns
- Keep the existing file metadata display structure
- Ensure new features work with the existing progress tracking

### B. Update useFiles Hook
- Study `client/src/hooks/useFiles.ts` for the current implementation
- Add new functions following the existing async pattern
- Integrate with React Query for caching if used
- Maintain the existing state management approach
- Add new API calls following the existing fetch patterns
- Keep the existing error handling structure

### C. Update Files Page
- Examine `client/src/pages/Files.tsx` for the current layout
- Add new tabs or sections to the existing interface
- Integrate search/filter components if implementing
- Maintain the existing storage usage dashboard
- Keep plan-based restrictions working
- Follow the existing component composition patterns

## Step 4: Testing Instructions

1. **Test New Features**
   - [ ] File sharing links work correctly
   - [ ] Folder organization functions properly
   - [ ] Search and filtering work as expected
   - [ ] Tags can be added and removed

2. **Test Integration with Existing System**
   - [ ] New features work with existing `useFiles()` hook
   - [ ] File limits are still enforced (Free: 10 files/100MB, Pro: 100 files/1GB)
   - [ ] Firebase Storage security rules still apply
   - [ ] Existing `<FileUpload />` and `<FileList />` components work properly
   - [ ] Mobile responsiveness maintained on `/files` page
   - [ ] Toast notifications work for all operations

3. **Test Edge Cases**
   - [ ] Shared link expiration
   - [ ] Password-protected shares
   - [ ] Nested folder operations
   - [ ] Bulk file operations
   - [ ] File ownership verification still works
   - [ ] Authentication middleware still protects routes

## Step 5: Next Steps

After implementation:
- [ ] Add file version history
- [ ] Implement file collaboration features
- [ ] Add file preview capabilities
- [ ] Create file analytics and usage reports
- [ ] Add file backup and sync features

## Remember

- **Leverage existing components**: Use the current `useFiles()` hook, `<FileUpload />`, `<FileList />`, and `/files` page structure
- **Maintain existing security**: Keep Firebase Storage security rules and authentication middleware
- **Preserve file limits**: Maintain Free (10 files/100MB) and Pro (100 files/1GB) restrictions
- **Use existing patterns**: Follow the established database storage layer pattern (`server/storage/FileStorage.ts`)
- **Test sharing permissions**: Thoroughly test file ownership verification and access controls
- **Ensure search performance**: Consider database indexing for large file counts
- **Backup database**: Always backup before schema changes with `npm run db:push`
- **Update incrementally**: Extend existing functionality rather than replacing it
- **Use existing UI components**: Leverage shadcn/ui components and existing toast system
- **Follow established API patterns**: Use the existing route structure and error handling patterns