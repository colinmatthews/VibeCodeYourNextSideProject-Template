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
   ```typescript
   // Add to shared/schema.ts (existing file)
   export const fileShares = pgTable('file_shares', {
     id: serial('id').primaryKey(),
     fileId: integer('file_id').references(() => files.id),
     shareToken: text('share_token').unique().notNull(),
     shareType: text('share_type').$type<'public' | 'user_specific' | 'password'>().default('public'),
     password: text('password'), // hashed password for protected shares
     expiresAt: timestamp('expires_at'),
     allowDownload: boolean('allow_download').default(true),
     allowView: boolean('allow_view').default(true),
     createdBy: text('created_by').references(() => users.firebaseId),
     createdAt: timestamp('created_at').defaultNow(),
   });
   
   export const fileShareAccess = pgTable('file_share_access', {
     id: serial('id').primaryKey(),
     shareId: integer('share_id').references(() => fileShares.id),
     userId: text('user_id').references(() => users.firebaseId),
     accessedAt: timestamp('accessed_at').defaultNow(),
   });
   ```

2. **Extend Existing FileStorage Service**
   ```typescript
   // Add to server/storage/FileStorage.ts (existing file)
   import { nanoid } from 'nanoid';
   import { fileShares } from '../../shared/schema';
   
   export async function createFileShare(
     fileId: number,
     userId: string,
     options: {
       shareType: 'public' | 'password';
       password?: string;
       expiresAt?: Date;
       allowDownload?: boolean;
     }
   ) {
     const shareToken = nanoid(32);
     
     const [share] = await db.insert(fileShares).values({
       fileId,
       shareToken,
       shareType: options.shareType,
       password: options.password, // Should be hashed
       expiresAt: options.expiresAt,
       allowDownload: options.allowDownload ?? true,
       createdBy: userId,
     }).returning();
     
     return share;
   }
   
   export async function getFileByShareToken(shareToken: string) {
     const result = await db
       .select({
         file: files,
         share: fileShares,
       })
       .from(fileShares)
       .innerJoin(files, eq(fileShares.fileId, files.id))
       .where(eq(fileShares.shareToken, shareToken))
       .limit(1);
     
     return result[0] || null;
   }
   ```

3. **Extend Existing File Routes**
   ```typescript
   // Add to server/routes/fileRoutes.ts (existing file)
   import { createFileShare, getFileByShareToken } from '../storage/FileStorage';
   
   router.post('/files/:id/share', requiresAuth, async (req, res) => {
     try {
       const fileId = parseInt(req.params.id);
       const userId = req.user.firebaseId;
       const { shareType, password, expiresAt, allowDownload } = req.body;
       
       // Use existing getFileById from FileStorage
       const file = await fileStorage.getFileById(fileId);
       if (!file || file.userId !== userId) {
         return res.status(404).json({ error: 'File not found' });
       }
       
       const share = await createFileShare(fileId, userId, {
         shareType,
         password,
         expiresAt: expiresAt ? new Date(expiresAt) : undefined,
         allowDownload,
       });
       
       const shareUrl = `${req.protocol}://${req.get('host')}/share/${share.shareToken}`;
       
       res.json({
         shareToken: share.shareToken,
         shareUrl,
         expiresAt: share.expiresAt,
       });
       
     } catch (error) {
       console.error('Error creating file share:', error);
       res.status(500).json({ error: 'Failed to create share link' });
     }
   });
   
   router.get('/share/:token', async (req, res) => {
     try {
       const { token } = req.params;
       const result = await getFileByShareToken(token);
       
       if (!result) {
         return res.status(404).json({ error: 'Share link not found or expired' });
       }
       
       const { file, share } = result;
       
       // Check if share is expired
       if (share.expiresAt && new Date() > share.expiresAt) {
         return res.status(410).json({ error: 'Share link has expired' });
       }
       
       res.json({
         file: {
           id: file.id,
           name: file.name,
           originalName: file.originalName,
           size: file.size,
           type: file.type,
           url: file.url,
         },
         share: {
           allowDownload: share.allowDownload,
           allowView: share.allowView,
           requiresPassword: share.shareType === 'password',
         },
       });
       
     } catch (error) {
       console.error('Error accessing shared file:', error);
       res.status(500).json({ error: 'Failed to access shared file' });
     }
   });
   ```

4. **Create File Sharing Component**
   ```tsx
   // client/src/components/FileShareDialog.tsx
   import { useState } from 'react';
   import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { Label } from './ui/label';
   import { Switch } from './ui/switch';
   import { Share2, Copy, Check } from 'lucide-react';
   import { useToast } from './ui/use-toast'; // Use existing toast system
   
   interface FileShareDialogProps {
     fileId: number;
     fileName: string;
   }
   
   export function FileShareDialog({ fileId, fileName }: FileShareDialogProps) {
     const [shareUrl, setShareUrl] = useState('');
     const [isCreating, setIsCreating] = useState(false);
     const [copied, setCopied] = useState(false);
     const [settings, setSettings] = useState({
       requirePassword: false,
       password: '',
       allowDownload: true,
       expiresIn: '7', // days
     });
     const { toast } = useToast(); // Use existing toast system
   
     const createShareLink = async () => {
       setIsCreating(true);
       try {
         const expiresAt = new Date();
         expiresAt.setDate(expiresAt.getDate() + parseInt(settings.expiresIn));
         
         const response = await fetch(`/api/files/${fileId}/share`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             shareType: settings.requirePassword ? 'password' : 'public',
             password: settings.requirePassword ? settings.password : undefined,
             allowDownload: settings.allowDownload,
             expiresAt: expiresAt.toISOString(),
           }),
         });
         
         const data = await response.json();
         if (response.ok) {
           setShareUrl(data.shareUrl);
           toast({
             title: "Share link created",
             description: "File share link has been created successfully.",
           });
         } else {
           throw new Error(data.error || 'Failed to create share link');
         }
       } catch (error) {
         console.error('Error creating share link:', error);
         toast({
           title: "Error",
           description: "Failed to create share link. Please try again.",
           variant: "destructive",
         });
       } finally {
         setIsCreating(false);
       }
     };
   
     const copyToClipboard = async () => {
       await navigator.clipboard.writeText(shareUrl);
       setCopied(true);
       setTimeout(() => setCopied(false), 2000);
       toast({
         title: "Link copied",
         description: "Share link has been copied to clipboard.",
       });
     };
   
     return (
       <Dialog>
         <DialogTrigger asChild>
           <Button variant="outline" size="sm">
             <Share2 size={16} className="mr-2" />
             Share
           </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>Share "{fileName}"</DialogTitle>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Expires in</Label>
               <select
                 value={settings.expiresIn}
                 onChange={(e) => setSettings({...settings, expiresIn: e.target.value})}
                 className="w-full p-2 border rounded"
               >
                 <option value="1">1 day</option>
                 <option value="7">7 days</option>
                 <option value="30">30 days</option>
                 <option value="365">1 year</option>
               </select>
             </div>
             
             <div className="flex items-center space-x-2">
               <Switch
                 id="password"
                 checked={settings.requirePassword}
                 onCheckedChange={(checked) => setSettings({...settings, requirePassword: checked})}
               />
               <Label htmlFor="password">Require password</Label>
             </div>
             
             {settings.requirePassword && (
               <div className="space-y-2">
                 <Label>Password</Label>
                 <Input
                   type="password"
                   value={settings.password}
                   onChange={(e) => setSettings({...settings, password: e.target.value})}
                   placeholder="Enter password"
                 />
               </div>
             )}
             
             <div className="flex items-center space-x-2">
               <Switch
                 id="download"
                 checked={settings.allowDownload}
                 onCheckedChange={(checked) => setSettings({...settings, allowDownload: checked})}
               />
               <Label htmlFor="download">Allow download</Label>
             </div>
             
             {!shareUrl ? (
               <Button onClick={createShareLink} disabled={isCreating} className="w-full">
                 {isCreating ? 'Creating...' : 'Create Share Link'}
               </Button>
             ) : (
               <div className="space-y-2">
                 <Label>Share Link</Label>
                 <div className="flex gap-2">
                   <Input value={shareUrl} readOnly />
                   <Button onClick={copyToClipboard} variant="outline">
                     {copied ? <Check size={16} /> : <Copy size={16} />}
                   </Button>
                 </div>
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>
     );
   }
   ```

### Option B: File Organization with Folders

If user wants folder organization:

1. **Create Folder Database Schema**
   ```typescript
   // Add to shared/schema.ts (existing file)
   export const folders = pgTable('folders', {
     id: serial('id').primaryKey(),
     name: text('name').notNull(),
     parentId: integer('parent_id').references(() => folders.id),
     userId: text('user_id').references(() => users.firebaseId),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   
   // Update existing files table to include folder reference
   // Add this column to existing files table in shared/schema.ts:
   // folderId: integer('folder_id').references(() => folders.id),
   ```

2. **Create Folder Management Component**
   ```tsx
   // client/src/components/FolderTree.tsx
   import { useState, useEffect } from 'react';
   import { Folder, FolderOpen, File, Plus, MoreVertical } from 'lucide-react';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
   import { useToast } from './ui/use-toast'; // Use existing toast system
   
   interface FolderNode {
     id: number;
     name: string;
     parentId: number | null;
     children: FolderNode[];
     files: FileNode[];
   }
   
   interface FileNode {
     id: number;
     name: string;
     type: string;
     size: number;
   }
   
   export function FolderTree() {
     const [folders, setFolders] = useState<FolderNode[]>([]);
     const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
     const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
     const [newFolderName, setNewFolderName] = useState('');
     const [isCreating, setIsCreating] = useState(false);
     const { toast } = useToast(); // Use existing toast system
   
     useEffect(() => {
       fetchFolders();
     }, []);
   
     const fetchFolders = async () => {
       try {
         const response = await fetch('/api/folders');
         if (response.ok) {
           const data = await response.json();
           setFolders(data);
         }
       } catch (error) {
         console.error('Error fetching folders:', error);
         toast({
           title: "Error",
           description: "Failed to load folders. Please try again.",
           variant: "destructive",
         });
       }
     };
   
     const createFolder = async () => {
       if (!newFolderName.trim()) return;
       
       setIsCreating(true);
       try {
         const response = await fetch('/api/folders', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             name: newFolderName,
             parentId: selectedFolder,
           }),
         });
         
         if (response.ok) {
           setNewFolderName('');
           fetchFolders();
           toast({
             title: "Folder created",
             description: `Folder "${newFolderName}" has been created successfully.`,
           });
         } else {
           throw new Error('Failed to create folder');
         }
       } catch (error) {
         console.error('Error creating folder:', error);
         toast({
           title: "Error",
           description: "Failed to create folder. Please try again.",
           variant: "destructive",
         });
       } finally {
         setIsCreating(false);
       }
     };
   
     const toggleFolder = (folderId: number) => {
       const newExpanded = new Set(expandedFolders);
       if (newExpanded.has(folderId)) {
         newExpanded.delete(folderId);
       } else {
         newExpanded.add(folderId);
       }
       setExpandedFolders(newExpanded);
     };
   
     const renderFolder = (folder: FolderNode, level: number = 0) => {
       const isExpanded = expandedFolders.has(folder.id);
       
       return (
         <div key={folder.id} className="select-none">
           <div
             className={`flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer ${
               selectedFolder === folder.id ? 'bg-blue-50' : ''
             }`}
             style={{ paddingLeft: `${level * 20 + 8}px` }}
             onClick={() => setSelectedFolder(folder.id)}
           >
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 toggleFolder(folder.id);
               }}
               className="p-1 hover:bg-gray-200 rounded"
             >
               {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
             </button>
             <span className="flex-1">{folder.name}</span>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm">
                   <MoreVertical size={16} />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                 <DropdownMenuItem>Rename</DropdownMenuItem>
                 <DropdownMenuItem>Delete</DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
           
           {isExpanded && (
             <div>
               {folder.children.map(child => renderFolder(child, level + 1))}
               {folder.files.map(file => (
                 <div
                   key={file.id}
                   className="flex items-center gap-2 p-2 hover:bg-gray-50"
                   style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                 >
                   <File size={16} />
                   <span className="flex-1">{file.name}</span>
                   <span className="text-xs text-gray-500">
                     {(file.size / 1024 / 1024).toFixed(1)} MB
                   </span>
                 </div>
               ))}
             </div>
           )}
         </div>
       );
     };
   
     return (
       <div className="border rounded-lg p-4">
         <div className="flex items-center gap-2 mb-4">
           <Input
             value={newFolderName}
             onChange={(e) => setNewFolderName(e.target.value)}
             placeholder="New folder name"
             className="flex-1"
           />
           <Button onClick={createFolder} disabled={isCreating || !newFolderName.trim()}>
             <Plus size={16} />
           </Button>
         </div>
         
         <div className="space-y-1">
           {folders.map(folder => renderFolder(folder))}
         </div>
       </div>
     );
   }
   ```

### Option C: File Tags and Search

If user wants tagging and search:

1. **Create Tags Database Schema**
   ```typescript
   // Add to shared/schema.ts (existing file)
   export const tags = pgTable('tags', {
     id: serial('id').primaryKey(),
     name: text('name').notNull(),
     color: text('color').default('#3b82f6'),
     userId: text('user_id').references(() => users.firebaseId),
     createdAt: timestamp('created_at').defaultNow(),
   });
   
   export const fileTags = pgTable('file_tags', {
     fileId: integer('file_id').references(() => files.id),
     tagId: integer('tag_id').references(() => tags.id),
   });
   ```

2. **Create File Search Component**
   ```tsx
   // client/src/components/FileSearch.tsx
   import { useState, useEffect } from 'react';
   import { Search, Tag, X } from 'lucide-react';
   import { Input } from './ui/input';
   import { Badge } from './ui/badge';
   import { useToast } from './ui/use-toast'; // Use existing toast system
   
   interface FileSearchProps {
     onFilesChange: (files: any[]) => void;
   }
   
   export function FileSearch({ onFilesChange }: FileSearchProps) {
     const [searchTerm, setSearchTerm] = useState('');
     const [selectedTags, setSelectedTags] = useState<number[]>([]);
     const [availableTags, setAvailableTags] = useState<any[]>([]);
     const [fileType, setFileType] = useState('all');
   
     useEffect(() => {
       fetchTags();
     }, []);
   
     useEffect(() => {
       searchFiles();
     }, [searchTerm, selectedTags, fileType]);
   
     const fetchTags = async () => {
       const response = await fetch('/api/tags');
       const data = await response.json();
       setAvailableTags(data);
     };
   
     const searchFiles = async () => {
       const params = new URLSearchParams();
       if (searchTerm) params.append('search', searchTerm);
       if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
       if (fileType !== 'all') params.append('type', fileType);
   
       const response = await fetch(`/api/files/search?${params}`);
       const data = await response.json();
       onFilesChange(data);
     };
   
     const toggleTag = (tagId: number) => {
       setSelectedTags(prev =>
         prev.includes(tagId)
           ? prev.filter(id => id !== tagId)
           : [...prev, tagId]
       );
     };
   
     return (
       <div className="space-y-4">
         <div className="flex gap-2">
           <div className="relative flex-1">
             <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <Input
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Search files..."
               className="pl-10"
             />
           </div>
           <select
             value={fileType}
             onChange={(e) => setFileType(e.target.value)}
             className="px-3 py-2 border rounded-md"
           >
             <option value="all">All types</option>
             <option value="image">Images</option>
             <option value="document">Documents</option>
             <option value="video">Videos</option>
             <option value="audio">Audio</option>
           </select>
         </div>
   
         <div className="space-y-2">
           <div className="flex items-center gap-2">
             <Tag size={16} />
             <span className="text-sm font-medium">Tags</span>
           </div>
           <div className="flex flex-wrap gap-2">
             {availableTags.map(tag => (
               <Badge
                 key={tag.id}
                 variant={selectedTags.includes(tag.id) ? 'default' : 'secondary'}
                 className="cursor-pointer"
                 onClick={() => toggleTag(tag.id)}
               >
                 {tag.name}
               </Badge>
             ))}
           </div>
         </div>
   
         {selectedTags.length > 0 && (
           <div className="flex flex-wrap gap-2">
             {selectedTags.map(tagId => {
               const tag = availableTags.find(t => t.id === tagId);
               return (
                 <Badge key={tagId} variant="outline" className="gap-1">
                   {tag?.name}
                   <X
                     size={14}
                     className="cursor-pointer"
                     onClick={() => toggleTag(tagId)}
                   />
                 </Badge>
               );
             })}
           </div>
         )}
       </div>
     );
   }
   ```

## Step 3: Update Existing Components

Integrate new features with existing file upload and management:

### A. Update FileList Component
```tsx
// Update client/src/components/FileList.tsx (existing file)
import { FileShareDialog } from './FileShareDialog';
import { FileTagEditor } from './FileTagEditor';

// Add share buttons and tag displays to existing file list items
// The FileList component already has proper structure with:
// - File display with metadata
// - Delete functionality with confirmation
// - Download functionality 
// - Progress tracking
// - Error handling with toast notifications

// Simply add the new sharing and tagging features to the existing action buttons
```

### B. Update useFiles Hook
```tsx
// Update client/src/hooks/useFiles.ts (existing file)
// Add new functions for sharing and tagging:
// - shareFile(fileId, options)
// - addTag(fileId, tagId)
// - removeTag(fileId, tagId)
// - searchFiles(query, tags, fileType)

// The hook already provides:
// - files, loading, error states
// - uploadFile, deleteFile, refreshFiles functions
// - totalSize, totalFiles calculations
```

### C. Update Files Page
```tsx
// Update client/src/pages/Files.tsx (existing file)
// Add new features to existing tabbed interface:
// - Search and filter tab
// - Folder organization (if implementing folders)
// - Bulk operations interface

// The page already has:
// - Storage usage dashboard
// - Plan-based restrictions
// - Upload and manage tabs
// - Integration with useFiles hook
```

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