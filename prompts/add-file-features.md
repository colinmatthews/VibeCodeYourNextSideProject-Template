# /add-file-features - Extend File Management

You are a helpful assistant that guides users through extending the existing file management features in their VibeCode Template app. This template already has Firebase Storage integration with file upload, metadata storage, and user-specific file organization.

## What This Command Does

Helps users extend the existing file management system. The template already includes:
- Firebase Storage integration with security rules
- File upload component with drag-and-drop
- File metadata storage in PostgreSQL
- User-specific file organization (`users/{userId}/files/`)
- File size limits (Free: 10MB per file, Pro: 50MB per file)
- File listing and management interface

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
   // Add to shared/schema.ts
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

2. **Create File Sharing Service**
   ```typescript
   // server/services/fileShareService.ts
   import { db } from '../db';
   import { fileShares, files } from '../../shared/schema';
   import { eq } from 'drizzle-orm';
   import { nanoid } from 'nanoid';
   
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

3. **Create File Share API Routes**
   ```typescript
   // Add to server/routes/fileRoutes.ts
   router.post('/files/:id/share', async (req, res) => {
     try {
       const fileId = parseInt(req.params.id);
       const userId = req.user.firebaseId;
       const { shareType, password, expiresAt, allowDownload } = req.body;
       
       // Verify user owns the file
       const file = await fileStorage.getById(fileId);
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
         setShareUrl(data.shareUrl);
       } catch (error) {
         console.error('Error creating share link:', error);
       } finally {
         setIsCreating(false);
       }
     };
   
     const copyToClipboard = async () => {
       await navigator.clipboard.writeText(shareUrl);
       setCopied(true);
       setTimeout(() => setCopied(false), 2000);
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
   // Add to shared/schema.ts
   export const folders = pgTable('folders', {
     id: serial('id').primaryKey(),
     name: text('name').notNull(),
     parentId: integer('parent_id').references(() => folders.id),
     userId: text('user_id').references(() => users.firebaseId),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   
   // Update files table to include folder reference
   // Add this column to existing files table:
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
   
     useEffect(() => {
       fetchFolders();
     }, []);
   
     const fetchFolders = async () => {
       const response = await fetch('/api/folders');
       const data = await response.json();
       setFolders(data);
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
         }
       } catch (error) {
         console.error('Error creating folder:', error);
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
   // Add to shared/schema.ts
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

```tsx
// Update client/src/components/FileList.tsx to include new features
import { FileShareDialog } from './FileShareDialog';
import { FileTagEditor } from './FileTagEditor';

// Add share buttons and tag displays to existing file list items
```

## Step 4: Testing Instructions

1. **Test New Features**
   - [ ] File sharing links work correctly
   - [ ] Folder organization functions properly
   - [ ] Search and filtering work as expected
   - [ ] Tags can be added and removed

2. **Test Integration**
   - [ ] New features work with existing file upload
   - [ ] File limits are still enforced
   - [ ] Security rules still apply
   - [ ] Mobile responsiveness maintained

3. **Test Edge Cases**
   - [ ] Shared link expiration
   - [ ] Password-protected shares
   - [ ] Nested folder operations
   - [ ] Bulk file operations

## Step 5: Next Steps

After implementation:
- [ ] Add file version history
- [ ] Implement file collaboration features
- [ ] Add file preview capabilities
- [ ] Create file analytics and usage reports
- [ ] Add file backup and sync features

## Remember

- Maintain existing Firebase Storage security rules
- Keep file size limits for free/pro users
- Test sharing permissions thoroughly
- Ensure search performance with large file counts
- Backup database before schema changes
- Update file organization incrementally to avoid breaking existing functionality