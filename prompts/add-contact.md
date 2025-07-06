# /add-contact - Add Contact/Support Features

You are a helpful assistant that guides users through adding contact and support features to their VibeCode Template app. This leverages existing database, email, and form handling capabilities.

## What This Command Does

Helps users add contact and support functionality using existing integrations:
- Database (PostgreSQL via Render) for storing inquiries
- Email system (SendGrid) for notifications
- Form handling patterns already established in the codebase
- User authentication system

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Contact Method:**
- [ ] How should users contact you?
  - a) Simple contact form (name, email, message)
  - b) Support ticket system with categories
  - c) FAQ section with contact fallback
  - d) Live chat widget (requires external service)

**Information Needed:**
- [ ] What information do you need from users?
  - Basic: name, email, message
  - Detailed: issue category, priority, user account info
  - Custom: specific fields for your business

**Response Management:**
- [ ] How do you want to handle inquiries?
  - Email notification to you
  - Admin dashboard to view/respond
  - Both email and dashboard
  - Integration with external support tools

## Step 2: Implementation Based on User Answers

### Option A: Simple Contact Form

If user wants a basic contact form:

1. **Create Contact Database Schema**
   ```typescript
   // Add to shared/schema.ts
   export const contacts = pgTable('contacts', {
     id: serial('id').primaryKey(),
     name: text('name').notNull(),
     email: text('email').notNull(),
     message: text('message').notNull(),
     status: text('status').$type<'new' | 'replied' | 'closed'>().default('new'),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   ```

2. **Create Contact Storage Layer**
   ```typescript
   // server/storage/contactStorage.ts
   import { db } from '../db';
   import { contacts } from '../../shared/schema';
   import { eq } from 'drizzle-orm';
   
   export const contactStorage = {
     async create(data: {
       name: string;
       email: string;
       message: string;
     }) {
       const [contact] = await db.insert(contacts).values(data).returning();
       return contact;
     },
     
     async getAll() {
       return await db.select().from(contacts).orderBy(contacts.createdAt);
     },
     
     async getById(id: number) {
       const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
       return contact;
     },
     
     async updateStatus(id: number, status: 'new' | 'replied' | 'closed') {
       await db.update(contacts)
         .set({ status, updatedAt: new Date() })
         .where(eq(contacts.id, id));
     }
   };
   ```

3. **Create Contact API Route**
   ```typescript
   // server/routes/contactRoutes.ts
   import express from 'express';
   import { contactStorage } from '../storage/contactStorage';
   import { sendContactNotification } from '../services/emailService';
   
   const router = express.Router();
   
   router.post('/contact', async (req, res) => {
     try {
       const { name, email, message } = req.body;
       
       // Validate input
       if (!name || !email || !message) {
         return res.status(400).json({ error: 'All fields are required' });
       }
       
       // Save to database
       const contact = await contactStorage.create({ name, email, message });
       
       // Send notification email
       await sendContactNotification(contact);
       
       res.status(201).json({ 
         message: 'Contact message sent successfully',
         id: contact.id 
       });
       
     } catch (error) {
       console.error('Error saving contact message:', error);
       res.status(500).json({ error: 'Failed to send message' });
     }
   });
   
   // Admin route to view contacts
   router.get('/contacts', async (req, res) => {
     try {
       const contacts = await contactStorage.getAll();
       res.json(contacts);
     } catch (error) {
       res.status(500).json({ error: 'Failed to fetch contacts' });
     }
   });
   
   export default router;
   ```

4. **Create Contact Form Component**
   ```tsx
   // client/src/components/ContactForm.tsx
   import { useState } from 'react';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { Textarea } from './ui/textarea';
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
   
   export function ContactForm() {
     const [formData, setFormData] = useState({
       name: '',
       email: '',
       message: ''
     });
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
   
     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setIsSubmitting(true);
       setSubmitStatus(null);
       
       try {
         const response = await fetch('/api/contact', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(formData),
         });
   
         if (response.ok) {
           setSubmitStatus('success');
           setFormData({ name: '', email: '', message: '' });
         } else {
           setSubmitStatus('error');
         }
       } catch (error) {
         setSubmitStatus('error');
       }
       
       setIsSubmitting(false);
     };
   
     return (
       <Card className="w-full max-w-md mx-auto">
         <CardHeader>
           <CardTitle>Contact Us</CardTitle>
           <CardDescription>
             Send us a message and we'll get back to you soon.
           </CardDescription>
         </CardHeader>
         <CardContent>
           {submitStatus === 'success' && (
             <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
               Message sent successfully! We'll get back to you soon.
             </div>
           )}
           
           {submitStatus === 'error' && (
             <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
               Something went wrong. Please try again.
             </div>
           )}
           
           <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <Input
                 type="text"
                 placeholder="Your Name"
                 value={formData.name}
                 onChange={(e) => setFormData({...formData, name: e.target.value})}
                 required
               />
             </div>
             
             <div>
               <Input
                 type="email"
                 placeholder="Your Email"
                 value={formData.email}
                 onChange={(e) => setFormData({...formData, email: e.target.value})}
                 required
               />
             </div>
             
             <div>
               <Textarea
                 placeholder="Your Message"
                 value={formData.message}
                 onChange={(e) => setFormData({...formData, message: e.target.value})}
                 rows={4}
                 required
               />
             </div>
             
             <Button type="submit" disabled={isSubmitting} className="w-full">
               {isSubmitting ? 'Sending...' : 'Send Message'}
             </Button>
           </form>
         </CardContent>
       </Card>
     );
   }
   ```

5. **Create Contact Page**
   ```tsx
   // client/src/pages/ContactPage.tsx
   import { ContactForm } from '../components/ContactForm';
   
   export function ContactPage() {
     return (
       <div className="container mx-auto px-4 py-8">
         <div className="max-w-2xl mx-auto text-center mb-8">
           <h1 className="text-3xl font-bold mb-4">Get in Touch</h1>
           <p className="text-gray-600">
             Have a question or need help? We'd love to hear from you.
           </p>
         </div>
         
         <ContactForm />
         
         <div className="mt-8 text-center">
           <p className="text-sm text-gray-500">
             You can also reach us at{' '}
             <a href="mailto:hello@yourdomain.com" className="text-blue-600 hover:underline">
               hello@yourdomain.com
             </a>
           </p>
         </div>
       </div>
     );
   }
   ```

### Option B: Support Ticket System

If user wants a support ticket system:

1. **Enhanced Database Schema**
   ```typescript
   // Add to shared/schema.ts
   export const supportTickets = pgTable('support_tickets', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     subject: text('subject').notNull(),
     message: text('message').notNull(),
     category: text('category').$type<'bug' | 'feature' | 'billing' | 'general'>().default('general'),
     priority: text('priority').$type<'low' | 'medium' | 'high'>().default('medium'),
     status: text('status').$type<'open' | 'in_progress' | 'closed'>().default('open'),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   
   export const ticketReplies = pgTable('ticket_replies', {
     id: serial('id').primaryKey(),
     ticketId: integer('ticket_id').references(() => supportTickets.id),
     userId: text('user_id').references(() => users.firebaseId),
     message: text('message').notNull(),
     isStaff: boolean('is_staff').default(false),
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```

2. **Support Ticket Component**
   ```tsx
   // client/src/components/SupportTicketForm.tsx
   import { useState } from 'react';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { Textarea } from './ui/textarea';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
   
   export function SupportTicketForm() {
     const [ticket, setTicket] = useState({
       subject: '',
       message: '',
       category: 'general',
       priority: 'medium'
     });
     
     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       
       const response = await fetch('/api/support/tickets', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(ticket),
       });
       
       if (response.ok) {
         alert('Support ticket created successfully!');
         setTicket({ subject: '', message: '', category: 'general', priority: 'medium' });
       }
     };
     
     return (
       <form onSubmit={handleSubmit} className="space-y-4">
         <Input
           placeholder="Subject"
           value={ticket.subject}
           onChange={(e) => setTicket({...ticket, subject: e.target.value})}
           required
         />
         
         <div className="grid grid-cols-2 gap-4">
           <Select value={ticket.category} onValueChange={(value) => setTicket({...ticket, category: value})}>
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="general">General</SelectItem>
               <SelectItem value="bug">Bug Report</SelectItem>
               <SelectItem value="feature">Feature Request</SelectItem>
               <SelectItem value="billing">Billing</SelectItem>
             </SelectContent>
           </Select>
           
           <Select value={ticket.priority} onValueChange={(value) => setTicket({...ticket, priority: value})}>
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="low">Low</SelectItem>
               <SelectItem value="medium">Medium</SelectItem>
               <SelectItem value="high">High</SelectItem>
             </SelectContent>
           </Select>
         </div>
         
         <Textarea
           placeholder="Describe your issue..."
           value={ticket.message}
           onChange={(e) => setTicket({...ticket, message: e.target.value})}
           rows={6}
           required
         />
         
         <Button type="submit" className="w-full">
           Create Support Ticket
         </Button>
       </form>
     );
   }
   ```

### Option C: FAQ Section

If user wants an FAQ section:

1. **FAQ Component**
   ```tsx
   // client/src/components/FAQ.tsx
   import { useState } from 'react';
   import { ChevronDown, ChevronUp } from 'lucide-react';
   
   const faqs = [
     {
       question: "How do I get started?",
       answer: "After signing up, you can access your dashboard and explore all available features. Check out our getting started guide for detailed instructions."
     },
     {
       question: "What's included in the Pro plan?",
       answer: "The Pro plan includes unlimited projects, priority support, advanced analytics, and exclusive features."
     },
     {
       question: "How do I cancel my subscription?",
       answer: "You can cancel your subscription anytime from your billing settings. Your access will continue until the end of your billing period."
     }
   ];
   
   export function FAQ() {
     const [openIndex, setOpenIndex] = useState<number | null>(null);
   
     return (
       <div className="max-w-2xl mx-auto">
         <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
         
         <div className="space-y-4">
           {faqs.map((faq, index) => (
             <div key={index} className="border rounded-lg p-4">
               <button
                 className="flex justify-between items-center w-full text-left"
                 onClick={() => setOpenIndex(openIndex === index ? null : index)}
               >
                 <span className="font-medium">{faq.question}</span>
                 {openIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
               </button>
               
               {openIndex === index && (
                 <div className="mt-3 text-gray-600">
                   {faq.answer}
                 </div>
               )}
             </div>
           ))}
         </div>
         
         <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center">
           <p className="mb-2">Still have questions?</p>
           <Button asChild>
             <a href="/contact">Contact Support</a>
           </Button>
         </div>
       </div>
     );
   }
   ```

## Step 3: Email Notifications

Add to your email service:

```typescript
// server/services/emailService.ts
export async function sendContactNotification(contact: {
  id: number;
  name: string;
  email: string;
  message: string;
}) {
  const msg = {
    to: 'support@yourdomain.com', // Your support email
    from: 'noreply@yourdomain.com',
    subject: `New Contact Message from ${contact.name}`,
    html: `
      <h3>New Contact Message</h3>
      <p><strong>From:</strong> ${contact.name} (${contact.email})</p>
      <p><strong>Message:</strong></p>
      <p>${contact.message}</p>
      <p><strong>Contact ID:</strong> ${contact.id}</p>
    `,
  };
  
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending contact notification:', error);
  }
}
```

## Step 4: Admin Dashboard (Optional)

Create an admin page to manage contacts:

```tsx
// client/src/pages/AdminContacts.tsx
import { useState, useEffect } from 'react';

export function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  
  useEffect(() => {
    fetchContacts();
  }, []);
  
  const fetchContacts = async () => {
    const response = await fetch('/api/contacts');
    const data = await response.json();
    setContacts(data);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Contact Messages</h1>
      
      <div className="space-y-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">{contact.name}</h3>
                <p className="text-sm text-gray-600">{contact.email}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                contact.status === 'new' ? 'bg-blue-100 text-blue-800' :
                contact.status === 'replied' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {contact.status}
              </span>
            </div>
            <p className="text-gray-700 mb-2">{contact.message}</p>
            <p className="text-xs text-gray-500">
              {new Date(contact.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Step 5: Testing Instructions

1. **Test Contact Form**
   - [ ] Fill out and submit the form
   - [ ] Check that data is saved to database
   - [ ] Verify email notification is sent
   - [ ] Test form validation

2. **Test Responsive Design**
   - [ ] Check form works on mobile
   - [ ] Verify layout on different screen sizes
   - [ ] Test accessibility features

3. **Test Email Delivery**
   - [ ] Confirm emails arrive in inbox
   - [ ] Check spam folder if not received
   - [ ] Test email formatting

## Step 6: Next Steps

After implementation:
- [ ] Add auto-responder emails to users
- [ ] Create email templates for different categories
- [ ] Add file attachment capability
- [ ] Set up response tracking and analytics

## Remember

- Always validate and sanitize user input
- Use the existing UI components for consistency
- Test email delivery thoroughly
- Consider adding rate limiting for form submissions
- Provide clear feedback to users about their message status
- Follow up on contact inquiries promptly