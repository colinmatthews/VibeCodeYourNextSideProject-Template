# /add-analytics - Add PostHog Analytics

You are a helpful assistant that guides users through adding PostHog analytics to their VibeCode Template app. This leverages existing user authentication and page structure to implement privacy-compliant user behavior tracking.

## What This Command Does

Helps users integrate PostHog analytics using existing integrations:
- User authentication system for user identification
- Existing page routing structure for page view tracking
- Component architecture for event tracking
- Privacy-compliant data collection practices
- PostHog handles all analytics data storage and visualization

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Analytics Goals:**
- [ ] What do you want to track?
  - a) Basic page views and user sessions
  - b) Feature usage and user engagement
  - c) Conversion funnel (signup → paid user)
  - d) User behavior flows and patterns
  - e) Custom business events specific to your app

**Privacy Level:**
- [ ] How privacy-conscious should tracking be?
  - Full tracking with user identification
  - Anonymous tracking only
  - Opt-in tracking with user consent
  - Minimal tracking (GDPR/CCPA compliant)

**Key Metrics:**
- [ ] What specific events matter to your business?
  - User registration and onboarding
  - Feature adoption and usage
  - Payment and subscription events
  - User retention and engagement
  - Custom actions specific to your app

## Step 2: Implementation Based on User Answers

### Option A: Basic PostHog Setup

If user wants basic analytics:

1. **Install PostHog**
   ```bash
   npm install posthog-js
   npm install @types/posthog-js --save-dev
   ```

2. **Create PostHog Service**
   ```typescript
   // client/src/lib/analytics.ts
   import posthog from 'posthog-js';
   
   class AnalyticsService {
     private initialized = false;
   
     init() {
       if (typeof window !== 'undefined' && !this.initialized) {
         posthog.init(import.meta.env.VITE_POSTHOG_API_KEY!, {
           api_host: import.meta.env.VITE_POSTHOG_API_HOST || 'https://app.posthog.com',
           // Privacy-friendly settings
           capture_pageview: false, // We'll handle this manually
           capture_pageleave: false,
           disable_session_recording: false, // Set to true for more privacy
           autocapture: false, // Disable automatic event capture
           
           // GDPR compliance
           opt_out_capturing_by_default: false,
           respect_dnt: true,
           
           // Performance
           loaded: (posthog) => {
             if (import.meta.env.DEV) {
               console.log('PostHog loaded');
             }
           }
         });
         
         this.initialized = true;
       }
     }
   
     identify(userId: string, userProperties?: Record<string, any>) {
       if (this.initialized) {
         posthog.identify(userId, userProperties);
       }
     }
   
     track(event: string, properties?: Record<string, any>) {
       if (this.initialized) {
         posthog.capture(event, properties);
       }
     }
   
     trackPageView(pageName: string, properties?: Record<string, any>) {
       if (this.initialized) {
         posthog.capture('$pageview', {
           $current_url: window.location.href,
           page: pageName,
           ...properties
         });
       }
     }
   
     setUserProperties(properties: Record<string, any>) {
       if (this.initialized) {
         posthog.people.set(properties);
       }
     }
   
     reset() {
       if (this.initialized) {
         posthog.reset();
       }
     }
   
     // Privacy controls
     optOut() {
       if (this.initialized) {
         posthog.opt_out_capturing();
       }
     }
   
     optIn() {
       if (this.initialized) {
         posthog.opt_in_capturing();
       }
     }
   }
   
   export const analytics = new AnalyticsService();
   ```

3. **Initialize Analytics in App**
   ```tsx
   // Update client/src/App.tsx
   import { useEffect } from 'react';
   import { analytics } from './lib/analytics';
   import { useAuth } from './hooks/useAuth';
   
   function App() {
     const { user } = useAuth();
   
     useEffect(() => {
       // Initialize PostHog
       analytics.init();
     }, []);
   
     useEffect(() => {
       // Identify user when they log in
       if (user) {
         analytics.identify(user.firebaseId, {
           email: user.email,
           firstName: user.firstName,
           lastName: user.lastName,
           subscriptionType: user.subscriptionType,
           isPremium: user.isPremium,
         });
       } else {
         // Reset when user logs out
         analytics.reset();
       }
     }, [user]);
   
     // ... rest of your app
   }
   ```

4. **Add Page View Tracking**
   ```tsx
   // Create client/src/hooks/usePageTracking.ts
   import { useEffect } from 'react';
   import { useLocation } from 'wouter';
   import { analytics } from '../lib/analytics';
   
   export function usePageTracking() {
     const [location] = useLocation();
   
     useEffect(() => {
       // Map routes to readable page names
       const pageMap: Record<string, string> = {
         '/': 'Landing Page',
         '/dashboard': 'Dashboard',
         '/profile': 'Profile',
         '/settings': 'Settings',
         '/pricing': 'Pricing',
         '/files': 'Files',
       };
   
       const pageName = pageMap[location] || location;
       analytics.trackPageView(pageName);
     }, [location]);
   }
   
   // Use in your main App component
   // function App() {
   //   usePageTracking();
   //   // ... rest of app
   // }
   ```

### Option B: Feature Usage Tracking

If user wants to track feature usage:

1. **Create Event Tracking Hook**
   ```tsx
   // client/src/hooks/useAnalytics.ts
   import { useCallback } from 'react';
   import { analytics } from '../lib/analytics';
   
   export function useAnalytics() {
     const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
       analytics.track(event, properties);
     }, []);
   
     const trackFeatureUsage = useCallback((feature: string, action: string, metadata?: any) => {
       analytics.track('feature_used', {
         feature,
         action,
         ...metadata
       });
     }, []);
   
     const trackUserAction = useCallback((action: string, context?: any) => {
       analytics.track('user_action', {
         action,
         context,
         timestamp: new Date().toISOString()
       });
     }, []);
   
     const trackConversion = useCallback((conversionType: string, value?: number) => {
       analytics.track('conversion', {
         conversion_type: conversionType,
         value,
         timestamp: new Date().toISOString()
       });
     }, []);
   
     return {
       trackEvent,
       trackFeatureUsage,
       trackUserAction,
       trackConversion,
     };
   }
   ```

2. **Add Tracking to Components**
   ```tsx
   // Example: Update client/src/components/FileUpload.tsx
   import { useAnalytics } from '../hooks/useAnalytics';
   
   export function FileUpload() {
     const { trackFeatureUsage } = useAnalytics();
   
     const handleFileUpload = async (files: File[]) => {
       // Track file upload attempt
       trackFeatureUsage('file_management', 'upload_started', {
         file_count: files.length,
         total_size: files.reduce((sum, file) => sum + file.size, 0),
         file_types: files.map(f => f.type)
       });
   
       try {
         // ... existing upload logic
         
         // Track successful upload
         trackFeatureUsage('file_management', 'upload_completed', {
           file_count: files.length,
           success: true
         });
       } catch (error) {
         // Track failed upload
         trackFeatureUsage('file_management', 'upload_failed', {
           error: error.message
         });
       }
     };
   
     // ... rest of component
   }
   ```

3. **Track Payment Events**
   ```tsx
   // Update payment-related components
   import { useAnalytics } from '../hooks/useAnalytics';
   
   export function UpgradeButton() {
     const { trackConversion, trackUserAction } = useAnalytics();
   
     const handleUpgradeClick = () => {
       trackUserAction('upgrade_button_clicked', {
         location: 'pricing_page',
         current_plan: 'free'
       });
       
       // ... existing upgrade logic
     };
   
     const handleUpgradeSuccess = () => {
       trackConversion('subscription_upgrade', 9.99);
       trackUserAction('subscription_activated', {
         plan: 'pro',
         payment_method: 'stripe'
       });
     };
   
     // ... rest of component
   }
   ```

### Option C: PostHog Dashboard Access

If user wants to view analytics:

1. **Direct users to PostHog Dashboard**
   - All analytics visualization is available in the PostHog dashboard
   - No need to build custom dashboards - PostHog provides comprehensive insights
   - Users can access: https://app.posthog.com or their self-hosted instance
   
2. **Key PostHog Features Available:**
   - Real-time analytics dashboard
   - Custom insights and queries
   - Funnel analysis
   - User paths and journeys
   - Cohort analysis
   - Feature flags
   - A/B testing
   - Session recordings (if enabled)
   - Heatmaps

## Step 3: Privacy and Compliance

1. **Add Privacy Controls**
   ```tsx
   // client/src/components/PrivacySettings.tsx
   import { useState, useEffect } from 'react';
   import { Switch } from './ui/switch';
   import { Label } from './ui/label';
   import { analytics } from '../lib/analytics';
   
   export function PrivacySettings() {
     const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
   
     useEffect(() => {
       const stored = localStorage.getItem('analytics-enabled');
       const enabled = stored !== 'false';
       setAnalyticsEnabled(enabled);
       
       if (!enabled) {
         analytics.optOut();
       }
     }, []);
   
     const toggleAnalytics = (enabled: boolean) => {
       setAnalyticsEnabled(enabled);
       localStorage.setItem('analytics-enabled', enabled.toString());
       
       if (enabled) {
         analytics.optIn();
       } else {
         analytics.optOut();
       }
     };
   
     return (
       <div className="space-y-4">
         <div className="flex items-center space-x-2">
           <Switch
             id="analytics"
             checked={analyticsEnabled}
             onCheckedChange={toggleAnalytics}
           />
           <Label htmlFor="analytics">
             Enable analytics to help improve the app
           </Label>
         </div>
         <p className="text-sm text-gray-600">
           We use analytics to understand how you use our app and improve it. 
           No personal data is shared with third parties.
         </p>
       </div>
     );
   }
   ```

## Step 4: Environment Variables

Add to `.env`:

```env
# PostHog Analytics
VITE_POSTHOG_API_KEY="phc_your_project_api_key"
VITE_POSTHOG_API_HOST="https://app.posthog.com"
POSTHOG_API_KEY="phc_your_project_api_key"  # For server-side
```

## Step 5: Testing Instructions

1. **Test Analytics Setup**
   - [ ] PostHog receives events
   - [ ] Page views are tracked correctly
   - [ ] User identification works
   - [ ] Feature usage tracking functions

2. **Test Privacy Controls**
   - [ ] Opt-out prevents tracking
   - [ ] Opt-in resumes tracking
   - [ ] Settings persist across sessions

3. **Verify Data Quality**
   - [ ] Events have proper properties
   - [ ] User properties are accurate
   - [ ] No sensitive data is tracked

## Step 6: Next Steps

After implementation:
- [ ] Access your PostHog dashboard to view analytics
- [ ] Create custom insights in PostHog for your specific metrics
- [ ] Set up alerts in PostHog for important events
- [ ] Configure funnels in PostHog to track conversion paths
- [ ] Use PostHog's built-in features for A/B testing and feature flags

## Common Analytics Events to Track

**User Journey:**
- `user_signed_up`
- `user_completed_onboarding`
- `user_upgraded_to_pro`

**Feature Usage:**
- `feature_used` (with feature name)
- `file_uploaded`
- `ai_query_made`
- `payment_attempted`

**Business Metrics:**
- `conversion` (with type and value)
- `subscription_cancelled`
- `support_ticket_created`

## Remember

- Respect user privacy and provide opt-out options
- Only track data that's useful for improving your product
- Regularly review and clean up tracked events
- Use PostHog's built-in privacy features
- Test analytics in development mode first
- Monitor analytics performance impact on your app