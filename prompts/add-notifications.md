# /add-notifications - Add User Notifications

You are a helpful assistant that guides users through adding notification features to their VibeCode Template app. This leverages existing user authentication, database, and email systems to create a comprehensive notification system.

## What This Command Does

Helps users add notification functionality using existing integrations:
- User authentication system for user-specific notifications
- Database (Render PostgreSQL) for storing notification data
- Email system (SendGrid) for email notifications
- Real-time updates using WebSockets or Server-Sent Events
- Existing UI components for notification display

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Notification Types:**
- [ ] What notifications do users need?
  - a) In-app notifications (bell icon with dropdown)
  - b) Email notifications for important events
  - c) Real-time notifications (live updates)
  - d) Push notifications (browser notifications)
  - e) Scheduled notifications (reminders, digests)

**Notification Triggers:**
- [ ] When should notifications be sent?
  - User account changes (profile, subscription)
  - System events (payments, uploads, AI completions)
  - User interactions (mentions, shares, comments)
  - Scheduled events (weekly summaries, reminders)
  - Admin announcements

**User Control:**
- [ ] How much control should users have?
  - Simple on/off toggle for all notifications
  - Granular control by notification type
  - Frequency settings (instant, daily digest, weekly)
  - Channel preferences (in-app, email, both)

## Step 2: Implementation Based on User Answers

### Option A: In-App Notifications

If user wants in-app notification system:

1. **Create Notifications Database Schema**
   ```typescript
   // Add to shared/schema.ts
   export const notifications = pgTable('notifications', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     type: text('type').$type<'info' | 'success' | 'warning' | 'error'>().default('info'),
     category: text('category'), // 'payment', 'account', 'system', 'feature'
     title: text('title').notNull(),
     message: text('message').notNull(),
     actionUrl: text('action_url'), // Optional link for the notification
     actionText: text('action_text'), // Text for the action button
     isRead: boolean('is_read').default(false),
     createdAt: timestamp('created_at').defaultNow(),
     expiresAt: timestamp('expires_at'), // Optional expiration
   });
   
   export const notificationPreferences = pgTable('notification_preferences', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     category: text('category'), // 'payment', 'account', 'system', 'feature'
     inApp: boolean('in_app').default(true),
     email: boolean('email').default(true),
     frequency: text('frequency').$type<'instant' | 'daily' | 'weekly' | 'never'>().default('instant'),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   ```

2. **Create Notification Service**
   ```typescript
   // server/services/notificationService.ts
   import { db } from '../db';
   import { notifications, notificationPreferences } from '../../shared/schema';
   import { eq, and, desc } from 'drizzle-orm';
   import { sendNotificationEmail } from './emailService';
   
   export interface CreateNotificationData {
     userId: string;
     type: 'info' | 'success' | 'warning' | 'error';
     category: string;
     title: string;
     message: string;
     actionUrl?: string;
     actionText?: string;
     expiresAt?: Date;
   }
   
   export const notificationService = {
     async create(data: CreateNotificationData) {
       // Get user preferences for this category
       const [preferences] = await db
         .select()
         .from(notificationPreferences)
         .where(
           and(
             eq(notificationPreferences.userId, data.userId),
             eq(notificationPreferences.category, data.category)
           )
         );
   
       // Create in-app notification if enabled
       if (!preferences || preferences.inApp) {
         const [notification] = await db
           .insert(notifications)
           .values(data)
           .returning();
   
         // Emit real-time notification if user is online
         this.emitRealTimeNotification(data.userId, notification);
       }
   
       // Send email notification if enabled
       if (!preferences || preferences.email) {
         await sendNotificationEmail(data.userId, data.title, data.message, data.actionUrl);
       }
   
       return notification;
     },
   
     async getUserNotifications(userId: string, limit: number = 20) {
       return await db
         .select()
         .from(notifications)
         .where(eq(notifications.userId, userId))
         .orderBy(desc(notifications.createdAt))
         .limit(limit);
     },
   
     async markAsRead(notificationId: number, userId: string) {
       await db
         .update(notifications)
         .set({ isRead: true })
         .where(
           and(
             eq(notifications.id, notificationId),
             eq(notifications.userId, userId)
           )
         );
     },
   
     async markAllAsRead(userId: string) {
       await db
         .update(notifications)
         .set({ isRead: true })
         .where(eq(notifications.userId, userId));
     },
   
     async getUnreadCount(userId: string): Promise<number> {
       const result = await db
         .select({ count: sql<number>`count(*)` })
         .from(notifications)
         .where(
           and(
             eq(notifications.userId, userId),
             eq(notifications.isRead, false)
           )
         );
       
       return result[0]?.count || 0;
     },
   
     async deleteNotification(notificationId: number, userId: string) {
       await db
         .delete(notifications)
         .where(
           and(
             eq(notifications.id, notificationId),
             eq(notifications.userId, userId)
           )
         );
     },
   
     // Real-time notification emission (implement based on your WebSocket setup)
     emitRealTimeNotification(userId: string, notification: any) {
       // If you're using Socket.IO:
       // io.to(`user:${userId}`).emit('notification', notification);
       
       // If you're using Server-Sent Events:
       // sseConnections.get(userId)?.send(JSON.stringify(notification));
       
       console.log(`Real-time notification sent to user ${userId}:`, notification);
     }
   };
   ```

3. **Create Notification API Routes**
   ```typescript
   // server/routes/notificationRoutes.ts
   import express from 'express';
   import { notificationService } from '../services/notificationService';
   
   const router = express.Router();
   
   router.get('/notifications', async (req, res) => {
     try {
       const userId = req.user.firebaseId;
       const limit = parseInt(req.query.limit as string) || 20;
       
       const notifications = await notificationService.getUserNotifications(userId, limit);
       const unreadCount = await notificationService.getUnreadCount(userId);
       
       res.json({
         notifications,
         unreadCount,
       });
     } catch (error) {
       console.error('Error fetching notifications:', error);
       res.status(500).json({ error: 'Failed to fetch notifications' });
     }
   });
   
   router.put('/notifications/:id/read', async (req, res) => {
     try {
       const notificationId = parseInt(req.params.id);
       const userId = req.user.firebaseId;
       
       await notificationService.markAsRead(notificationId, userId);
       res.json({ success: true });
     } catch (error) {
       console.error('Error marking notification as read:', error);
       res.status(500).json({ error: 'Failed to mark notification as read' });
     }
   });
   
   router.put('/notifications/read-all', async (req, res) => {
     try {
       const userId = req.user.firebaseId;
       await notificationService.markAllAsRead(userId);
       res.json({ success: true });
     } catch (error) {
       console.error('Error marking all notifications as read:', error);
       res.status(500).json({ error: 'Failed to mark notifications as read' });
     }
   });
   
   router.delete('/notifications/:id', async (req, res) => {
     try {
       const notificationId = parseInt(req.params.id);
       const userId = req.user.firebaseId;
       
       await notificationService.deleteNotification(notificationId, userId);
       res.json({ success: true });
     } catch (error) {
       console.error('Error deleting notification:', error);
       res.status(500).json({ error: 'Failed to delete notification' });
     }
   });
   
   export default router;
   ```

4. **Create Notification Components**
   ```tsx
   // client/src/components/NotificationBell.tsx
   import { useState, useEffect } from 'react';
   import { Bell, Check, X } from 'lucide-react';
   import { Button } from './ui/button';
   import { Badge } from './ui/badge';
   import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
   import { ScrollArea } from './ui/scroll-area';
   
   interface Notification {
     id: number;
     type: 'info' | 'success' | 'warning' | 'error';
     title: string;
     message: string;
     actionUrl?: string;
     actionText?: string;
     isRead: boolean;
     createdAt: string;
   }
   
   export function NotificationBell() {
     const [notifications, setNotifications] = useState<Notification[]>([]);
     const [unreadCount, setUnreadCount] = useState(0);
     const [isOpen, setIsOpen] = useState(false);
   
     useEffect(() => {
       fetchNotifications();
       
       // Set up polling for new notifications
       const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds
       return () => clearInterval(interval);
     }, []);
   
     const fetchNotifications = async () => {
       try {
         const response = await fetch('/api/notifications');
         const data = await response.json();
         setNotifications(data.notifications);
         setUnreadCount(data.unreadCount);
       } catch (error) {
         console.error('Error fetching notifications:', error);
       }
     };
   
     const markAsRead = async (notificationId: number) => {
       try {
         await fetch(`/api/notifications/${notificationId}/read`, {
           method: 'PUT',
         });
         
         setNotifications(prev =>
           prev.map(n =>
             n.id === notificationId ? { ...n, isRead: true } : n
           )
         );
         setUnreadCount(prev => Math.max(0, prev - 1));
       } catch (error) {
         console.error('Error marking notification as read:', error);
       }
     };
   
     const markAllAsRead = async () => {
       try {
         await fetch('/api/notifications/read-all', {
           method: 'PUT',
         });
         
         setNotifications(prev =>
           prev.map(n => ({ ...n, isRead: true }))
         );
         setUnreadCount(0);
       } catch (error) {
         console.error('Error marking all notifications as read:', error);
       }
     };
   
     const deleteNotification = async (notificationId: number) => {
       try {
         await fetch(`/api/notifications/${notificationId}`, {
           method: 'DELETE',
         });
         
         setNotifications(prev =>
           prev.filter(n => n.id !== notificationId)
         );
         
         const notification = notifications.find(n => n.id === notificationId);
         if (notification && !notification.isRead) {
           setUnreadCount(prev => Math.max(0, prev - 1));
         }
       } catch (error) {
         console.error('Error deleting notification:', error);
       }
     };
   
     const getTypeColor = (type: string) => {
       switch (type) {
         case 'success': return 'text-green-600';
         case 'warning': return 'text-yellow-600';
         case 'error': return 'text-red-600';
         default: return 'text-blue-600';
       }
     };
   
     return (
       <Popover open={isOpen} onOpenChange={setIsOpen}>
         <PopoverTrigger asChild>
           <Button variant="ghost" size="sm" className="relative">
             <Bell size={20} />
             {unreadCount > 0 && (
               <Badge 
                 variant="destructive" 
                 className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
               >
                 {unreadCount > 99 ? '99+' : unreadCount}
               </Badge>
             )}
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-80 p-0" align="end">
           <div className="flex items-center justify-between p-4 border-b">
             <h3 className="font-semibold">Notifications</h3>
             {unreadCount > 0 && (
               <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                 <Check size={16} className="mr-1" />
                 Mark all read
               </Button>
             )}
           </div>
           
           <ScrollArea className="h-96">
             {notifications.length === 0 ? (
               <div className="p-4 text-center text-gray-500">
                 No notifications yet
               </div>
             ) : (
               <div className="space-y-1">
                 {notifications.map((notification) => (
                   <div
                     key={notification.id}
                     className={`p-3 border-b last:border-b-0 hover:bg-gray-50 ${
                       !notification.isRead ? 'bg-blue-50' : ''
                     }`}
                   >
                     <div className="flex items-start justify-between">
                       <div className="flex-1 space-y-1">
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${getTypeColor(notification.type)}`} />
                           <p className="text-sm font-medium">{notification.title}</p>
                           {!notification.isRead && (
                             <div className="w-2 h-2 bg-blue-500 rounded-full" />
                           )}
                         </div>
                         <p className="text-xs text-gray-600">{notification.message}</p>
                         <p className="text-xs text-gray-400">
                           {new Date(notification.createdAt).toLocaleDateString()}
                         </p>
                         {notification.actionUrl && (
                           <Button
                             variant="link"
                             size="sm"
                             className="h-auto p-0 text-blue-600"
                             onClick={() => {
                               if (!notification.isRead) {
                                 markAsRead(notification.id);
                               }
                               window.location.href = notification.actionUrl!;
                             }}
                           >
                             {notification.actionText || 'View'}
                           </Button>
                         )}
                       </div>
                       <div className="flex gap-1">
                         {!notification.isRead && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => markAsRead(notification.id)}
                           >
                             <Check size={14} />
                           </Button>
                         )}
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => deleteNotification(notification.id)}
                         >
                           <X size={14} />
                         </Button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </ScrollArea>
         </PopoverContent>
       </Popover>
     );
   }
   ```

### Option B: Notification Preferences

If user wants granular notification controls:

1. **Create Notification Preferences Component**
   ```tsx
   // client/src/components/NotificationPreferences.tsx
   import { useState, useEffect } from 'react';
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
   import { Switch } from './ui/switch';
   import { Label } from './ui/label';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
   import { Button } from './ui/button';
   
   interface NotificationPreference {
     category: string;
     inApp: boolean;
     email: boolean;
     frequency: 'instant' | 'daily' | 'weekly' | 'never';
   }
   
   const notificationCategories = [
     { id: 'account', name: 'Account Updates', description: 'Changes to your account and profile' },
     { id: 'payment', name: 'Billing & Payments', description: 'Payment confirmations and billing issues' },
     { id: 'system', name: 'System Notifications', description: 'System maintenance and updates' },
     { id: 'feature', name: 'Feature Updates', description: 'New features and improvements' },
   ];
   
   export function NotificationPreferences() {
     const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
     const [loading, setLoading] = useState(true);
     const [saving, setSaving] = useState(false);
   
     useEffect(() => {
       fetchPreferences();
     }, []);
   
     const fetchPreferences = async () => {
       try {
         const response = await fetch('/api/notification-preferences');
         const data = await response.json();
         
         // Convert array to object for easier manipulation
         const prefsObj = data.reduce((acc: any, pref: any) => {
           acc[pref.category] = pref;
           return acc;
         }, {});
         
         // Fill in defaults for missing categories
         notificationCategories.forEach(cat => {
           if (!prefsObj[cat.id]) {
             prefsObj[cat.id] = {
               category: cat.id,
               inApp: true,
               email: true,
               frequency: 'instant',
             };
           }
         });
         
         setPreferences(prefsObj);
       } catch (error) {
         console.error('Error fetching preferences:', error);
       } finally {
         setLoading(false);
       }
     };
   
     const updatePreference = (category: string, field: keyof NotificationPreference, value: any) => {
       setPreferences(prev => ({
         ...prev,
         [category]: {
           ...prev[category],
           [field]: value,
         },
       }));
     };
   
     const savePreferences = async () => {
       setSaving(true);
       try {
         await fetch('/api/notification-preferences', {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(Object.values(preferences)),
         });
       } catch (error) {
         console.error('Error saving preferences:', error);
       } finally {
         setSaving(false);
       }
     };
   
     if (loading) {
       return <div>Loading preferences...</div>;
     }
   
     return (
       <div className="space-y-6">
         <Card>
           <CardHeader>
             <CardTitle>Notification Preferences</CardTitle>
             <CardDescription>
               Choose how and when you want to receive notifications
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-6">
               {notificationCategories.map((category) => {
                 const pref = preferences[category.id];
                 return (
                   <div key={category.id} className="space-y-3">
                     <div>
                       <h4 className="font-medium">{category.name}</h4>
                       <p className="text-sm text-gray-600">{category.description}</p>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="flex items-center space-x-2">
                         <Switch
                           id={`${category.id}-inapp`}
                           checked={pref?.inApp || false}
                           onCheckedChange={(checked) =>
                             updatePreference(category.id, 'inApp', checked)
                           }
                         />
                         <Label htmlFor={`${category.id}-inapp`}>In-app</Label>
                       </div>
                       
                       <div className="flex items-center space-x-2">
                         <Switch
                           id={`${category.id}-email`}
                           checked={pref?.email || false}
                           onCheckedChange={(checked) =>
                             updatePreference(category.id, 'email', checked)
                           }
                         />
                         <Label htmlFor={`${category.id}-email`}>Email</Label>
                       </div>
                       
                       <Select
                         value={pref?.frequency || 'instant'}
                         onValueChange={(value) =>
                           updatePreference(category.id, 'frequency', value)
                         }
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="instant">Instant</SelectItem>
                           <SelectItem value="daily">Daily digest</SelectItem>
                           <SelectItem value="weekly">Weekly digest</SelectItem>
                           <SelectItem value="never">Never</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                 );
               })}
             </div>
             
             <div className="mt-6">
               <Button onClick={savePreferences} disabled={saving}>
                 {saving ? 'Saving...' : 'Save Preferences'}
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

### Option C: Real-Time Notifications

If user wants real-time notifications:

1. **Set up Server-Sent Events**
   ```typescript
   // server/routes/sseRoutes.ts
   import express from 'express';
   
   const router = express.Router();
   const sseConnections = new Map<string, any>();
   
   router.get('/notifications/stream', (req, res) => {
     const userId = req.user.firebaseId;
     
     // Set up SSE headers
     res.writeHead(200, {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache',
       'Connection': 'keep-alive',
       'Access-Control-Allow-Origin': '*',
     });
   
     // Store connection
     sseConnections.set(userId, res);
   
     // Send initial connection confirmation
     res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
   
     // Clean up on disconnect
     req.on('close', () => {
       sseConnections.delete(userId);
     });
   });
   
   export { router as sseRouter, sseConnections };
   ```

2. **Create Real-Time Hook**
   ```tsx
   // client/src/hooks/useRealTimeNotifications.ts
   import { useEffect, useState } from 'react';
   
   export function useRealTimeNotifications() {
     const [isConnected, setIsConnected] = useState(false);
   
     useEffect(() => {
       const eventSource = new EventSource('/api/notifications/stream');
   
       eventSource.onopen = () => {
         setIsConnected(true);
       };
   
       eventSource.onmessage = (event) => {
         try {
           const notification = JSON.parse(event.data);
           
           if (notification.type === 'notification') {
             // Handle new notification
             showBrowserNotification(notification);
             
             // Update notification state in your app
             // This could trigger a refetch of notifications
             window.dispatchEvent(new CustomEvent('new-notification', {
               detail: notification
             }));
           }
         } catch (error) {
           console.error('Error parsing SSE message:', error);
         }
       };
   
       eventSource.onerror = () => {
         setIsConnected(false);
       };
   
       return () => {
         eventSource.close();
       };
     }, []);
   
     return { isConnected };
   }
   
   function showBrowserNotification(notification: any) {
     if ('Notification' in window && Notification.permission === 'granted') {
       new Notification(notification.title, {
         body: notification.message,
         icon: '/favicon.ico',
       });
     }
   }
   ```

## Step 3: Common Notification Triggers

Add notification triggers throughout your app:

```typescript
// Example: In payment success handler
await notificationService.create({
  userId: user.firebaseId,
  type: 'success',
  category: 'payment',
  title: 'Payment Successful',
  message: 'Your Pro subscription has been activated.',
  actionUrl: '/dashboard',
  actionText: 'Go to Dashboard',
});

// Example: In file upload completion
await notificationService.create({
  userId: user.firebaseId,
  type: 'info',
  category: 'feature',
  title: 'File Upload Complete',
  message: `${fileName} has been uploaded successfully.`,
  actionUrl: '/files',
  actionText: 'View Files',
});
```

## Step 4: Testing Instructions

1. **Test Notification Creation**
   - [ ] Create notifications from various triggers
   - [ ] Verify they appear in the notification bell
   - [ ] Check email notifications are sent
   - [ ] Test notification preferences

2. **Test Real-Time Updates**
   - [ ] Verify new notifications appear instantly
   - [ ] Test browser notifications (if implemented)
   - [ ] Check connection handling

3. **Test User Experience**
   - [ ] Mark notifications as read/unread
   - [ ] Delete notifications
   - [ ] Test notification preferences
   - [ ] Verify mobile responsiveness

## Step 5: Next Steps

After implementation:
- [ ] Add notification batching for high-volume events
- [ ] Implement push notifications for mobile
- [ ] Add notification analytics
- [ ] Create notification templates
- [ ] Set up automated notification cleanup

## Remember

- Respect user preferences and provide easy opt-out
- Don't overwhelm users with too many notifications
- Make notifications actionable with clear next steps
- Test notification delivery across different email providers
- Provide fallbacks if real-time connections fail
- Consider timezone-appropriate timing for scheduled notifications