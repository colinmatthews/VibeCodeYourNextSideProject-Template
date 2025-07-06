# /feature-planner - Plan and Build New Features

You are a helpful assistant that guides users through planning and implementing new features for their VibeCode Template app. This leverages the existing codebase structure to ensure consistency and proper integration.

## What This Command Does

Helps users plan and build new features using the existing codebase architecture:
- Client-side React components with TypeScript and shadcn/ui
- Server-side Express API routes with proper error handling
- Database operations using Drizzle ORM with PostgreSQL
- Authentication integration with Firebase Auth
- File storage with Firebase Storage (if needed)
- Payment integration with Stripe (if needed)
- Email notifications with SendGrid (if needed)

## Step 1: Understanding the Feature Requirements

Ask these focused questions to understand the scope:

**Feature Type:**
- [ ] What type of feature are you building?
  - a) Data management (CRUD operations)
  - b) User interaction (forms, dashboards, tools)
  - c) Integration (third-party APIs, webhooks)
  - d) Enhancement (existing feature improvements)
  - e) Automation (background jobs, scheduled tasks)

**Data Requirements:**
- [ ] What data does this feature need?
  - New database tables/fields
  - Existing data relationships
  - File uploads or media
  - Third-party data sources
  - User-specific or global data

**User Experience:**
- [ ] How will users interact with this feature?
  - New pages or components
  - Existing page enhancements
  - Modal dialogs or sidebars
  - Mobile-responsive requirements
  - Real-time updates needed

**Integration Needs:**
- [ ] What existing systems does this connect to?
  - Authentication and user management
  - Payment processing
  - File storage
  - Email notifications
  - External APIs
  - Analytics tracking

## Step 2: Codebase Analysis

Before implementing, analyze the existing codebase:

1. **Check Similar Features**
   - Look for existing similar functionality
   - Review patterns and conventions used
   - Identify reusable components and utilities

2. **Database Schema Review**
   - Examine current database structure
   - Check for existing relationships
   - Identify schema changes needed

3. **API Patterns**
   - Review existing API route structure
   - Check authentication patterns
   - Identify error handling conventions

4. **Frontend Architecture**
   - Review component structure and patterns
   - Check routing and navigation
   - Identify UI component usage

## Step 3: Feature Implementation Plan

### Phase 1: Database Layer (if needed)

1. **Schema Design**
   ```typescript
   // Add to shared/schema.ts
   export const [featureName] = pgTable('[table_name]', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     // Add feature-specific fields
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   ```

2. **Database Migration**
   ```bash
   # Push schema changes
   npm run db:push
   
   # Or create migration
   npm run db:generate
   npm run migrate
   ```

### Phase 2: Server Layer

1. **Storage Layer**
   ```typescript
   // server/storage/[featureName]Storage.ts
   import { db } from '../db';
   import { [tableName] } from '../../shared/schema';
   import { eq, and, desc } from 'drizzle-orm';
   
   export const [featureName]Storage = {
     async create(data: CreateData) {
       // Implementation
     },
     
     async getByUserId(userId: string) {
       // Implementation
     },
     
     async update(id: number, data: UpdateData) {
       // Implementation
     },
     
     async delete(id: number) {
       // Implementation
     },
   };
   ```

2. **API Routes with Security**
   ```typescript
   // server/routes/[featureName]Routes.ts
   import express from 'express';
   import { [featureName]Storage } from '../storage/[featureName]Storage';
   import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
   import { requiresOwnership, requiresUserExists } from '../middleware/authHelpers';
   import { z } from 'zod';
   
   const router = express.Router();
   
   // Input validation schemas
   const create[FeatureName]Schema = z.object({
     title: z.string().min(1).max(100),
     description: z.string().max(500).optional(),
     // Add other field validations
   });
   
   const update[FeatureName]Schema = z.object({
     title: z.string().min(1).max(100).optional(),
     description: z.string().max(500).optional(),
     // Add other field validations
   });
   
   // GET /api/[feature] - Get user's items
   router.get('/[feature]', requireAuth, async (req: AuthenticatedRequest, res) => {
     try {
       const userId = req.user!.uid;
       const data = await [featureName]Storage.getByUserId(userId);
       res.json(data);
     } catch (error) {
       console.error('Error fetching [feature]:', error);
       res.status(500).json({ error: 'Failed to fetch [feature]' });
     }
   });
   
   // POST /api/[feature] - Create new item
   router.post('/[feature]', requireAuth, requiresUserExists, async (req: AuthenticatedRequest, res) => {
     try {
       const userId = req.user!.uid;
       
       // Validate input
       const validatedData = create[FeatureName]Schema.parse(req.body);
       
       const data = await [featureName]Storage.create({
         userId,
         ...validatedData,
       });
       res.json(data);
     } catch (error) {
       console.error('Error creating [feature]:', error);
       if (error instanceof z.ZodError) {
         return res.status(400).json({ 
           error: 'Invalid input', 
           details: error.errors 
         });
       }
       res.status(500).json({ error: 'Failed to create [feature]' });
     }
   });
   
   // PUT /api/[feature]/:id - Update item (with ownership verification)
   router.put('/[feature]/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
     try {
       const id = parseInt(req.params.id);
       const userId = req.user!.uid;
       
       if (isNaN(id)) {
         return res.status(400).json({ error: 'Invalid ID' });
       }
       
       // Validate input
       const validatedData = update[FeatureName]Schema.parse(req.body);
       
       // Verify ownership
       const existing = await [featureName]Storage.getById(id);
       if (!existing) {
         return res.status(404).json({ error: 'Item not found' });
       }
       
       if (existing.userId !== userId) {
         return res.status(403).json({ 
           error: 'Access denied: You can only update your own items',
           code: 'auth/access-denied'
         });
       }
       
       const data = await [featureName]Storage.update(id, validatedData);
       res.json(data);
     } catch (error) {
       console.error('Error updating [feature]:', error);
       if (error instanceof z.ZodError) {
         return res.status(400).json({ 
           error: 'Invalid input', 
           details: error.errors 
         });
       }
       res.status(500).json({ error: 'Failed to update [feature]' });
     }
   });
   
   // DELETE /api/[feature]/:id - Delete item (with ownership verification)
   router.delete('/[feature]/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
     try {
       const id = parseInt(req.params.id);
       const userId = req.user!.uid;
       
       if (isNaN(id)) {
         return res.status(400).json({ error: 'Invalid ID' });
       }
       
       // Verify ownership
       const existing = await [featureName]Storage.getById(id);
       if (!existing) {
         return res.status(404).json({ error: 'Item not found' });
       }
       
       if (existing.userId !== userId) {
         return res.status(403).json({ 
           error: 'Access denied: You can only delete your own items',
           code: 'auth/access-denied'
         });
       }
       
       await [featureName]Storage.delete(id);
       res.json({ success: true });
     } catch (error) {
       console.error('Error deleting [feature]:', error);
       res.status(500).json({ error: 'Failed to delete [feature]' });
     }
   });
   
   // GET /api/[feature]/:id - Get single item (with ownership verification)
   router.get('/[feature]/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
     try {
       const id = parseInt(req.params.id);
       const userId = req.user!.uid;
       
       if (isNaN(id)) {
         return res.status(400).json({ error: 'Invalid ID' });
       }
       
       const item = await [featureName]Storage.getById(id);
       if (!item) {
         return res.status(404).json({ error: 'Item not found' });
       }
       
       // Verify ownership
       if (item.userId !== userId) {
         return res.status(403).json({ 
           error: 'Access denied: You can only access your own items',
           code: 'auth/access-denied'
         });
       }
       
       res.json(item);
     } catch (error) {
       console.error('Error fetching [feature]:', error);
       res.status(500).json({ error: 'Failed to fetch [feature]' });
     }
   });
   
   export default router;
   ```

3. **Register Routes**
   ```typescript
   // server/routes/index.ts
   import [featureName]Routes from './[featureName]Routes';
   
   // Register your new feature routes
   app.use('/api', [featureName]Routes);
   ```

4. **Custom Middleware (if needed)**
   ```typescript
   // server/middleware/[featureName]Middleware.ts
   import { Response, NextFunction } from 'express';
   import { AuthenticatedRequest } from './auth';
   import { [featureName]Storage } from '../storage/[featureName]Storage';
   
   /**
    * Middleware to verify ownership of a specific [feature] item
    */
   export async function requires[FeatureName]Ownership(
     req: AuthenticatedRequest,
     res: Response,
     next: NextFunction
   ) {
     if (!req.user) {
       return res.status(401).json({
         error: 'Authentication required',
         code: 'auth/no-token'
       });
     }
   
     const itemId = Number(req.params.id);
     
     if (isNaN(itemId)) {
       return res.status(400).json({
         error: 'Invalid item ID'
       });
     }
   
     try {
       const item = await [featureName]Storage.getById(itemId);
       
       if (!item) {
         return res.status(404).json({
           error: 'Item not found'
         });
       }
   
       // Verify the authenticated user owns this item
       if (item.userId !== req.user.uid) {
         return res.status(403).json({
           error: 'Access denied: You can only access your own items',
           code: 'auth/access-denied'
         });
       }
   
       // Add item to request for use in route handler
       (req as any).[featureName]Item = item;
       next();
     } catch (error) {
       console.error('Error checking [feature] ownership:', error);
       return res.status(500).json({
         error: 'Failed to verify item ownership'
       });
     }
   }
   
   /**
    * Middleware to check premium access (if feature requires premium)
    */
   export async function requiresPremium(
     req: AuthenticatedRequest,
     res: Response,
     next: NextFunction
   ) {
     if (!req.user) {
       return res.status(401).json({
         error: 'Authentication required',
         code: 'auth/no-token'
       });
     }
   
     try {
       const user = await storage.getUserByFirebaseId(req.user.uid);
       
       if (!user) {
         return res.status(404).json({
           error: 'User not found'
         });
       }
   
       if (!user.isPremium) {
         return res.status(403).json({
           error: 'Premium subscription required',
           code: 'premium/required'
         });
       }
   
       next();
     } catch (error) {
       console.error('Error checking premium status:', error);
       return res.status(500).json({
         error: 'Failed to verify premium status'
       });
     }
   }
   ```

### Phase 3: Client Layer

1. **Data Fetching Hook**
   ```tsx
   // client/src/hooks/use[FeatureName].ts
   import { useState, useEffect } from 'react';
   
   export interface [FeatureName]Data {
     id: number;
     // Add type definitions
   }
   
   export function use[FeatureName]() {
     const [data, setData] = useState<[FeatureName]Data[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
   
     const fetchData = async () => {
       try {
         setLoading(true);
         const response = await fetch('/api/[feature]');
         if (!response.ok) {
           throw new Error('Failed to fetch data');
         }
         const result = await response.json();
         setData(result);
       } catch (err) {
         setError(err instanceof Error ? err.message : 'An error occurred');
       } finally {
         setLoading(false);
       }
     };
   
     useEffect(() => {
       fetchData();
     }, []);
   
     const create = async (newData: Omit<[FeatureName]Data, 'id'>) => {
       try {
         const response = await fetch('/api/[feature]', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(newData),
         });
         
         if (!response.ok) {
           throw new Error('Failed to create');
         }
         
         await fetchData(); // Refresh data
         return true;
       } catch (err) {
         setError(err instanceof Error ? err.message : 'Failed to create');
         return false;
       }
     };
   
     const update = async (id: number, updates: Partial<[FeatureName]Data>) => {
       try {
         const response = await fetch(`/api/[feature]/${id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(updates),
         });
         
         if (!response.ok) {
           throw new Error('Failed to update');
         }
         
         await fetchData(); // Refresh data
         return true;
       } catch (err) {
         setError(err instanceof Error ? err.message : 'Failed to update');
         return false;
       }
     };
   
     const remove = async (id: number) => {
       try {
         const response = await fetch(`/api/[feature]/${id}`, {
           method: 'DELETE',
         });
         
         if (!response.ok) {
           throw new Error('Failed to delete');
         }
         
         await fetchData(); // Refresh data
         return true;
       } catch (err) {
         setError(err instanceof Error ? err.message : 'Failed to delete');
         return false;
       }
     };
   
     return {
       data,
       loading,
       error,
       create,
       update,
       remove,
       refresh: fetchData,
     };
   }
   ```

2. **Main Feature Component**
   ```tsx
   // client/src/components/[FeatureName].tsx
   import { useState } from 'react';
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
   import { Button } from './ui/button';
   import { Plus, Edit, Trash2 } from 'lucide-react';
   import { use[FeatureName] } from '../hooks/use[FeatureName]';
   import { [FeatureName]Form } from './[FeatureName]Form';
   
   export function [FeatureName]() {
     const { data, loading, error, create, update, remove } = use[FeatureName]();
     const [showForm, setShowForm] = useState(false);
     const [editingItem, setEditingItem] = useState<number | null>(null);
   
     if (loading) {
       return (
         <div className="flex items-center justify-center p-8">
           <div className="text-gray-500">Loading...</div>
         </div>
       );
     }
   
     if (error) {
       return (
         <div className="p-4 text-red-600 bg-red-50 rounded-md">
           Error: {error}
         </div>
       );
     }
   
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h2 className="text-2xl font-bold">[Feature Name]</h2>
             <p className="text-gray-600">[Feature description]</p>
           </div>
           <Button onClick={() => setShowForm(true)}>
             <Plus size={16} className="mr-2" />
             Add New
           </Button>
         </div>
   
         {showForm && (
           <[FeatureName]Form
             onSubmit={async (data) => {
               const success = await create(data);
               if (success) {
                 setShowForm(false);
               }
             }}
             onCancel={() => setShowForm(false)}
           />
         )}
   
         <div className="grid gap-4">
           {data.map((item) => (
             <Card key={item.id}>
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle>{item.title}</CardTitle>
                   <CardDescription>{item.description}</CardDescription>
                 </div>
                 <div className="flex gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setEditingItem(item.id)}
                   >
                     <Edit size={16} />
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => {
                       if (confirm('Are you sure you want to delete this item?')) {
                         remove(item.id);
                       }
                     }}
                   >
                     <Trash2 size={16} />
                   </Button>
                 </div>
               </CardHeader>
               <CardContent>
                 {/* Display item details */}
               </CardContent>
             </Card>
           ))}
         </div>
   
         {data.length === 0 && (
           <div className="text-center py-8 text-gray-500">
             No items found. Create your first one!
           </div>
         )}
       </div>
     );
   }
   ```

3. **Form Component**
   ```tsx
   // client/src/components/[FeatureName]Form.tsx
   import { useState } from 'react';
   import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { Label } from './ui/label';
   import { Textarea } from './ui/textarea';
   
   interface [FeatureName]FormData {
     title: string;
     description: string;
     // Add form fields
   }
   
   interface [FeatureName]FormProps {
     onSubmit: (data: [FeatureName]FormData) => Promise<void>;
     onCancel: () => void;
     initialData?: [FeatureName]FormData;
   }
   
   export function [FeatureName]Form({ onSubmit, onCancel, initialData }: [FeatureName]FormProps) {
     const [formData, setFormData] = useState<[FeatureName]FormData>(
       initialData || {
         title: '',
         description: '',
       }
     );
     const [submitting, setSubmitting] = useState(false);
   
     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setSubmitting(true);
       try {
         await onSubmit(formData);
       } finally {
         setSubmitting(false);
       }
     };
   
     return (
       <Card>
         <CardHeader>
           <CardTitle>
             {initialData ? 'Edit' : 'Create'} [Feature Name]
           </CardTitle>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="title">Title</Label>
               <Input
                 id="title"
                 value={formData.title}
                 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                 required
               />
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="description">Description</Label>
               <Textarea
                 id="description"
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 rows={3}
               />
             </div>
             
             <div className="flex gap-2">
               <Button type="submit" disabled={submitting}>
                 {submitting ? 'Saving...' : 'Save'}
               </Button>
               <Button type="button" variant="outline" onClick={onCancel}>
                 Cancel
               </Button>
             </div>
           </form>
         </CardContent>
       </Card>
     );
   }
   ```

4. **Page Component (if needed)**
   ```tsx
   // client/src/pages/[FeatureName]Page.tsx
   import { [FeatureName] } from '../components/[FeatureName]';
   
   export function [FeatureName]Page() {
     return (
       <div className="container mx-auto px-4 py-8">
         <[FeatureName] />
       </div>
     );
   }
   ```

5. **Add to Navigation**
   ```tsx
   // client/src/App.tsx
   import { [FeatureName]Page } from './pages/[FeatureName]Page';
   
   // Add route
   <Route path="/[feature]" component={[FeatureName]Page} />
   ```

## Step 4: Integration Enhancements

### Security & Authentication Integration

1. **Always Use Authentication Middleware**
```typescript
// Import required middleware
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requiresOwnership, requiresUserExists } from '../middleware/authHelpers';

// Apply authentication to all routes
router.use(requireAuth);

// Or apply to specific routes
router.get('/[feature]', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.uid; // Firebase UID
  // Route logic here
});
```

2. **Use Ownership Verification**
```typescript
// For user-specific resources, verify ownership
router.get('/users/:firebaseId/[feature]', requireAuth, requiresOwnership, async (req: AuthenticatedRequest, res) => {
  // User can only access their own resources
});

// For item-specific resources, create custom middleware
import { requires[FeatureName]Ownership } from '../middleware/[featureName]Middleware';

router.put('/[feature]/:id', requireAuth, requires[FeatureName]Ownership, async (req: AuthenticatedRequest, res) => {
  // User can only update items they own
  const item = (req as any).[featureName]Item; // Item attached by middleware
});
```

3. **Input Validation & Sanitization**
```typescript
import { z } from 'zod';

// Define validation schemas
const createSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

// Use in routes
try {
  const validatedData = createSchema.parse(req.body);
  // Use validatedData instead of req.body
} catch (error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      details: error.errors 
    });
  }
}
```

4. **Premium Feature Access**
```typescript
// For premium-only features
import { requiresPremium } from '../middleware/[featureName]Middleware';

router.post('/[feature]/premium-action', requireAuth, requiresPremium, async (req: AuthenticatedRequest, res) => {
  // Only premium users can access this endpoint
});
```

### File Storage Integration (if needed)
```typescript
// Add file upload support
import { uploadFile } from '../services/fileService';

// In your route handler
const fileUrl = await uploadFile(req.file, userId);
```

### Payment Integration (if needed)
```typescript
// Add premium feature checks
import { isPremiumUser } from '../services/userService';

// Check user subscription
const user = await isPremiumUser(userId);
if (!user.isPremium) {
  return res.status(403).json({ error: 'Premium feature' });
}
```

### Email Notifications (if needed)
```typescript
// Add email notifications
import { emailNotificationService } from '../services/emailNotificationService';

// Send notification
await emailNotificationService.sendNotification({
  userId,
  category: 'feature',
  subject: 'New [Feature] Created',
  htmlContent: `<p>Your [feature] has been created successfully.</p>`,
});
```

## Step 5: Testing and Validation

### Backend Testing
```bash
# Test API endpoints
curl -X GET http://localhost:5000/api/[feature] \
  -H "Authorization: Bearer [token]"

curl -X POST http://localhost:5000/api/[feature] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"title": "Test", "description": "Test description"}'
```

### Frontend Testing
```typescript
// Test component rendering
// Test form submission
// Test error handling
// Test loading states
```

### Database Testing
```sql
-- Verify data integrity
SELECT * FROM [table_name] WHERE user_id = 'test_user_id';

-- Check relationships
SELECT * FROM [table_name] 
JOIN users ON [table_name].user_id = users.firebase_id;
```

## Step 6: Deployment Checklist

- [ ] Database schema changes deployed
- [ ] Environment variables configured
- [ ] API routes tested in production
- [ ] Frontend components tested
- [ ] Authentication working properly
- [ ] Error handling implemented
- [ ] Mobile responsiveness verified
- [ ] Performance optimized
- [ ] Analytics tracking added (if needed)
- [ ] Documentation updated

## Common Patterns and Best Practices

### Error Handling
```typescript
// Consistent error responses
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ 
    error: 'User-friendly error message',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

### Input Validation
```typescript
// Server-side validation
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500),
});

const validatedData = schema.parse(req.body);
```

### Component Reusability
```tsx
// Use existing UI components
import { Button, Card, Input } from './ui/[component]';

// Follow existing patterns
// Use consistent styling classes
// Implement proper loading states
```

### Database Optimization
```typescript
// Use indexes for frequently queried fields
// Implement proper relationships
// Use transactions for multi-table operations
// Add proper constraints
```

## Security Checklist

**Authentication & Authorization:**
- [ ] All routes use `requireAuth` middleware
- [ ] User ownership is verified for all resource access
- [ ] Firebase UID (`req.user!.uid`) is used consistently
- [ ] Premium features check `isPremium` status
- [ ] Custom middleware follows existing patterns

**Input Validation:**
- [ ] All inputs validated with Zod schemas
- [ ] String inputs are trimmed and length-limited
- [ ] Arrays have maximum length limits
- [ ] File uploads have size and type restrictions
- [ ] SQL injection prevention (Drizzle ORM handles this)

**Error Handling:**
- [ ] Consistent error response format
- [ ] No sensitive data leaked in error messages
- [ ] Proper HTTP status codes used
- [ ] Validation errors include helpful details
- [ ] Server errors logged but not exposed

**Data Access:**
- [ ] Users can only access their own data
- [ ] Database queries include userId filtering
- [ ] Resource IDs are validated (parseInt, isNaN checks)
- [ ] Soft deletes considered if needed
- [ ] Rate limiting implemented for sensitive operations

## Remember

- **Security First** - Always implement authentication and ownership verification
- **Check existing code first** - Look for similar patterns and reuse them
- **Follow established conventions** - Use the same middleware and error patterns
- **Validate everything** - Use Zod schemas for all inputs
- **Test thoroughly** - Verify all CRUD operations and security measures
- **Handle errors gracefully** - Provide good user feedback without exposing internals
- **Mobile-first design** - Ensure components work on all screen sizes
- **Performance matters** - Optimize database queries and API responses
- **User experience** - Provide loading states and clear feedback
- **Documentation** - Comment complex business logic and security decisions

## Common Security Patterns

**Route Protection:**
```typescript
// ✅ Good - Protected route with ownership check
router.get('/[feature]', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.uid;
  const data = await storage.getByUserId(userId);
  res.json(data);
});

// ❌ Bad - No authentication
router.get('/[feature]', async (req, res) => {
  const data = await storage.getAll(); // Returns all users' data!
  res.json(data);
});
```

**Input Validation:**
```typescript
// ✅ Good - Validated input
const schema = z.object({ title: z.string().min(1).max(100) });
const validated = schema.parse(req.body);

// ❌ Bad - Direct use of user input
const title = req.body.title; // Could be anything!
```

**Error Responses:**
```typescript
// ✅ Good - Safe error response
res.status(404).json({ error: 'Item not found' });

// ❌ Bad - Exposes internal details
res.status(500).json({ error: error.message }); // Might expose DB details
```

This systematic approach ensures your new feature integrates seamlessly with the existing VibeCode Template architecture while maintaining the highest security and code quality standards.