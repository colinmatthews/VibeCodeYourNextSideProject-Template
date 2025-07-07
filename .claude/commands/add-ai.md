# /add-ai - Add AI Features with AI SDK

You are a helpful assistant that guides users through adding AI features to their VibeCode Template app using the Vercel AI SDK. This leverages existing authentication, database, and API patterns to integrate AI services with a unified interface.

## What This Command Does

Helps users add AI functionality using existing integrations:
- User authentication system for personalized AI experiences
- Database (Neon PostgreSQL) for storing AI conversations and usage
- API routing patterns for AI service integration
- File storage (Firebase) for AI-generated content
- Existing form and UI components

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**AI Feature Type:**
- [ ] What should the AI do?
  - a) Chat assistant/customer support bot
  - b) Content generation (text, blog posts, descriptions)
  - c) Image generation or analysis
  - d) Data analysis and insights
  - e) Writing assistance (editing, summarizing)
  - f) Custom AI for your specific business

**AI Service:**
- [ ] Which AI service do you prefer?
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic Claude (Claude 3, Claude 2)
  - Google Gemini
  - Mistral AI
  - Cohere
  - Multiple providers (AI SDK makes switching easy)

**Integration Location:**
- [ ] Where should the AI feature appear?
  - New dedicated AI page
  - Integration into existing pages
  - Modal/popup interface
  - Chat widget in corner

## Step 2: Implementation Guidelines

### Research Existing Patterns First
Before implementing, examine the existing codebase:

1. **Database Schema Patterns**
   - Look at `shared/schema.ts` for table structure examples
   - Follow the existing foreign key patterns (referencing `users.firebaseId`)
   - Use similar field types and naming conventions

2. **API Route Patterns**
   - Examine files in `server/routes/` for route structure
   - Follow the existing authentication middleware pattern
   - Use the same error handling approach as other routes

3. **Component Patterns** 
   - Look at existing components in `client/src/components/` for UI patterns
   - Use the same shadcn/ui components and styling approaches
   - Follow the established loading state and error handling patterns

4. **Database Access Patterns**
   - Check `server/storage/` for existing data access methods
   - Follow the same pattern of separating database logic from routes
   - Use consistent transaction and error handling approaches

### Option A: Chat Assistant Implementation

If user wants a chat assistant:

1. **Database Schema Design**
   - Examine existing user-related tables in `shared/schema.ts`
   - Create tables following the same patterns: `ai_conversations`, `ai_messages`, `ai_usage`
   - Use foreign key references to `users.firebaseId` like other tables
   - Follow existing timestamp and serial ID patterns

2. **Install Dependencies**
   ```bash
   npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google @ai-sdk/mistral
   ```

3. **AI Service Integration**
   - Create `server/services/aiService.ts` following patterns from other service files
   - Use environment variables pattern from existing services
   - Implement error handling similar to existing service methods
   - Add provider switching logic with fallbacks

4. **API Routes**
   - Create `server/routes/aiRoutes.ts` following existing route file patterns
   - Use the same authentication middleware as other protected routes
   - Implement usage limits checking similar to file upload limits
   - Add streaming endpoints following Node.js streaming patterns

5. **Frontend Components**
   - Create `client/src/components/AIChat.tsx` using existing component patterns
   - Use the same form handling patterns from other forms in the app
   - Implement real-time streaming using patterns similar to file upload progress
   - Follow the existing loading state and error handling UI patterns

### Option B: Content Generation Implementation

If user wants content generation:

1. **Backend Implementation**
   - Add content generation methods to the AI service
   - Create specific API endpoints for different content types
   - Use existing form validation patterns for input sanitization
   - Implement content storage using existing database patterns

2. **Frontend Implementation**
   - Create content generation forms using existing form components
   - Use the same validation and error handling patterns
   - Implement content preview and editing using existing text handling
   - Add export functionality following existing file download patterns

### Option C: Image Generation Implementation

If user wants image generation:

1. **Integration with File Storage**
   - Use existing Firebase Storage patterns for generated images
   - Follow the same file metadata storage approach
   - Implement image display using existing image handling patterns
   - Use the same file management UI components

2. **API Implementation**
   - Create image generation endpoints following existing file upload patterns
   - Use similar progress tracking for generation status
   - Implement download functionality using existing file serving methods

## Step 3: Environment Configuration

Add AI service API keys following existing environment variable patterns:
- Look at how other services (Firebase, Stripe) are configured in `.env`
- Use the same naming conventions and documentation style
- Add validation for required keys following existing patterns

## Step 4: Usage Limits and Pricing

Implement usage tracking following existing patterns:
- Examine how file storage limits are implemented for users
- Use the same premium user checking logic
- Follow existing subscription-based feature gating patterns
- Implement similar error messages and upgrade prompts

## Step 5: Testing Guidelines

Test AI integration following existing testing patterns:
1. **Backend Testing**
   - Test API endpoints using the same approach as other endpoints
   - Verify authentication and authorization following existing security tests
   - Test usage limits using existing limit testing patterns

2. **Frontend Testing**
   - Test components using existing component testing approaches
   - Verify form validation following existing validation testing
   - Test responsive design using existing mobile testing patterns

## Step 6: Integration Considerations

When integrating AI features:
- **Follow Existing Architecture**: Use the same separation of concerns
- **Maintain Consistency**: Follow established UI/UX patterns
- **Security**: Use existing authentication and validation patterns
- **Performance**: Implement caching and optimization like other features
- **Error Handling**: Use consistent error messaging and recovery

## AI SDK Implementation Notes

When using the AI SDK:
- Leverage the unified API for provider switching
- Implement streaming following Node.js stream patterns
- Use TypeScript types consistently with existing code
- Handle provider errors gracefully with fallbacks
- Implement cost tracking following existing usage tracking patterns

## Key Integration Points

1. **Authentication**: Use existing Firebase auth patterns
2. **Database**: Follow existing Drizzle ORM patterns
3. **API**: Use existing Express route and middleware patterns
4. **UI**: Follow existing shadcn/ui and styling patterns
5. **State Management**: Use existing React Query patterns
6. **Error Handling**: Follow existing error boundary and toast patterns

## Remember

- **Study the existing codebase first** before implementing new features
- **Follow established patterns** rather than creating new approaches
- **Maintain consistency** with existing authentication, styling, and data handling
- **Test thoroughly** using existing testing approaches
- **Monitor costs** and implement appropriate usage limits
- **Document your changes** following existing documentation patterns
- **Use existing components** and utilities wherever possible
- **Follow existing security practices** for API endpoints and data handling