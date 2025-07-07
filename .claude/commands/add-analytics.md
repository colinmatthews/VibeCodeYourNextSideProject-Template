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

## Step 2: Implementation Guidelines

### Research Existing Patterns First
Before implementing analytics, examine the existing codebase:

1. **Authentication Patterns**
   - Look at how user authentication is handled in `client/src/hooks/use-auth.ts`
   - Examine user state management for identification patterns
   - Study existing user data handling for privacy compliance

2. **Routing Patterns**
   - Check the routing setup in `client/src/App.tsx`
   - Look at existing page components for navigation tracking
   - Study how page transitions are handled

3. **Component Architecture**
   - Examine existing UI components for event handling patterns
   - Look at how user interactions are tracked (forms, buttons, etc.)
   - Study existing loading states and error handling

4. **Environment Configuration**
   - Check how other external services are configured (Firebase, Stripe)
   - Look at existing environment variable patterns
   - Study service integration approaches

### Basic PostHog Setup Implementation

If user wants basic analytics:

1. **Install Dependencies**
   ```bash
   npm install posthog-js
   npm install @types/posthog-js --save-dev
   ```

2. **PostHog Service Integration**
   - Create `client/src/lib/analytics.ts` following existing service patterns
   - Use environment variables similar to Firebase configuration
   - Implement initialization logic following existing client-side service setup
   - Add error handling and fallbacks like other external services

3. **Analytics Provider Setup**
   - Create analytics context following existing auth context patterns
   - Implement user identification using existing user state management
   - Add privacy controls following existing user preferences patterns
   - Use React hooks pattern similar to existing custom hooks

4. **Page View Tracking**
   - Integrate with existing router setup in `App.tsx`
   - Use existing page component patterns for automatic tracking
   - Follow existing navigation handling for route changes
   - Implement tracking similar to existing state updates

5. **Event Tracking Implementation**
   - Add event tracking to existing form submissions
   - Integrate with existing button click handlers
   - Use existing component event patterns for custom tracking
   - Follow existing error handling for tracking failures

### Advanced Analytics Implementation

If user wants comprehensive tracking:

1. **User Journey Tracking**
   - Use existing authentication flow for user lifecycle events
   - Integrate with existing onboarding flow tracking
   - Follow existing user state changes for behavior tracking
   - Use existing subscription status for conversion tracking

2. **Feature Usage Analytics**
   - Integrate with existing component usage patterns
   - Track existing feature interactions (file uploads, payments, etc.)
   - Use existing loading states for performance tracking
   - Follow existing error tracking for failure analysis

3. **Custom Business Events**
   - Add tracking to existing business logic (payments, subscriptions)
   - Use existing database patterns for event correlation
   - Follow existing API call patterns for server-side tracking
   - Integrate with existing user action flows

## Step 3: Environment Configuration

Add PostHog configuration following existing environment patterns:
- Look at how Firebase and Stripe keys are configured
- Use the same naming conventions and validation approaches
- Add configuration to existing environment setup
- Follow existing service configuration documentation

## Step 4: Privacy and Compliance

Implement privacy controls following existing patterns:
- Use existing user preferences system for tracking consent
- Follow existing data handling practices for GDPR compliance
- Integrate with existing privacy policy and terms
- Use existing user settings patterns for opt-in/opt-out controls

## Step 5: Testing and Validation

Test analytics implementation following existing patterns:
1. **Development Testing**
   - Use existing development environment setup
   - Follow existing testing patterns for external services
   - Test user identification using existing auth testing
   - Validate event tracking using existing component testing

2. **User Experience Testing**
   - Test performance impact using existing performance monitoring
   - Verify privacy controls using existing user settings testing
   - Test error scenarios using existing error handling testing
   - Validate mobile experience using existing responsive testing

## Step 6: Integration Points

Key areas to integrate analytics:

1. **Authentication Events**
   - User registration (use existing auth flow patterns)
   - Login/logout (follow existing session management)
   - Profile updates (integrate with existing user forms)

2. **Business Events**
   - Payment events (integrate with existing Stripe handlers)
   - Subscription changes (use existing subscription logic)
   - Feature usage (track existing component interactions)

3. **User Experience Events**
   - Page navigation (use existing routing patterns)
   - Form interactions (integrate with existing form handling)
   - Error occurrences (use existing error tracking)

## Implementation Notes

When integrating PostHog:
- **Follow Existing Service Patterns**: Use the same initialization and configuration approach
- **Maintain Performance**: Implement lazy loading and error boundaries like other services
- **Respect Privacy**: Follow existing user data handling and consent patterns
- **Use TypeScript**: Maintain type safety consistent with existing code
- **Handle Errors Gracefully**: Use existing error handling and fallback patterns

## Key Integration Considerations

1. **Performance**: Load analytics asynchronously following existing service loading patterns
2. **Privacy**: Implement user consent using existing preference management
3. **Development**: Use environment flags following existing development/production patterns
4. **Testing**: Add analytics testing using existing testing infrastructure
5. **Monitoring**: Track analytics errors using existing error reporting

## Remember

- **Study existing service integrations** before implementing analytics
- **Follow established patterns** for external service configuration
- **Maintain user privacy** using existing consent and preference systems
- **Test thoroughly** across different user flows and scenarios
- **Monitor performance impact** using existing performance tracking
- **Document configuration** following existing service documentation patterns
- **Use existing error handling** for analytics failures and fallbacks
- **Integrate with existing user flows** rather than creating separate tracking