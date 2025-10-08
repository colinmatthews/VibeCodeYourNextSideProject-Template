# ChatKit AI Agent Setup Guide

This guide shows you how to set up the AI Agent feature using OpenAI's ChatKit - a managed AI chat service that's much faster to set up than building everything from scratch.

## Quick Setup (5 Minutes)

### Prerequisites
1. **OpenAI API Key** - Already in your `.env` as `OPENAI_API_KEY`
2. **OpenAI Account** - Access to https://platform.openai.com

## Step-by-Step Setup

### Step 1: Create Your Agent in Agent Builder

1. **Go to Agent Builder**: https://platform.openai.com/agent-builder

2. **Click "Create New Agent"** (or "New Workflow")

3. **Configure the basics**:
   - **Name**: "Todo Assistant" (or anything you want)
   - **Model**: `gpt-4o-mini` (cheaper) or `gpt-4o` (smarter)
   - **Instructions**: Paste this:
     ```
     You are a helpful assistant for managing todos.
     When users ask to create a todo, use the createTodo tool.
     Be friendly and concise.
     ```

4. **Click "Publish"** (important! Agent won't work in draft mode)

### Step 2: Get Your Workflow ID

1. After publishing, you'll see a **Workflow ID** like: `wf_abc123xyz`
2. **Copy it!** You'll need it in the next step.

### Step 3: Add to Environment Variables

1. Open your `.env` file
2. Add this line (replace with your actual workflow ID):
   ```bash
   OPENAI_CHATKIT_WORKFLOW_ID="wf_abc123xyz"
   ```
3. Save the file

### Step 4: Restart Your Server

```bash
# Stop the server (Ctrl+C or Cmd+C)
npm run dev
```

### Step 5: Test It!

1. Go to **http://localhost:4000/ai-agent**
2. Log in (if you haven't already)
3. Start chatting! 🎉

That's it! ChatKit is now fully working.

---

## Common Issues

### "Error generating response"
**Problem**: Agent shows loading then says there was an error

**Fix**: Make sure you clicked **"Publish"** in Agent Builder. Draft agents don't work!

### "ChatKit Not Configured"
**Problem**: Yellow warning page saying ChatKit is not configured

**Fix**:
1. Check `.env` has `OPENAI_CHATKIT_WORKFLOW_ID="wf_..."`
2. Make sure workflow ID starts with `wf_`
3. Restart your server after adding it

### Page loads but chat doesn't appear
**Problem**: Blank space where chat should be

**Fix**:
1. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. Check browser console for errors
3. Verify workflow ID is correct

### React ref warning in console
**Problem**: Warning about "callback ref" in console

**Fix**: This is a harmless bug in ChatKit library itself. Ignore it - doesn't affect functionality.

---

## How It Works (Technical)

### What Happens Behind the Scenes

1. **You visit `/ai-agent`**
   - Frontend calls your backend: `POST /api/chatkit/session`
   - Backend verifies you're logged in (Firebase Auth)

2. **Backend creates a session**
   - Calls OpenAI: `POST https://api.openai.com/v1/chatkit/sessions`
   - Sends: Your workflow ID + user ID
   - Gets back: A secure client token

3. **ChatKit component connects**
   - Uses the token to connect to OpenAI's servers
   - Loads your agent (based on workflow ID)
   - Chat is now live!

4. **Messages flow through OpenAI**
   - Your messages → OpenAI servers
   - Agent processes them
   - Responses stream back to your browser
   - All message history stored by OpenAI (not in your database)

### Key Differences from AI Chat

| Aspect | AI Chat | AI Agent (ChatKit) |
|--------|---------|-------------------|
| **Where messages live** | Your PostgreSQL | OpenAI's servers |
| **Who manages UI** | You build it | ChatKit provides it |
| **Who manages state** | You track threads/messages | OpenAI handles everything |
| **Setup complexity** | High (250 lines) | Low (50 lines) |
| **Flexibility** | Maximum | Limited but faster |

### When to Use Each

**Use AI Chat when:**
- You need full control over data
- You have complex custom workflows
- You want data to live in your database
- You're building something unique

**Use AI Agent (ChatKit) when:**
- You want to ship fast
- Standard chat is good enough
- You're okay with OpenAI managing state
- You want less code to maintain

---

## Resources

- **Agent Builder**: https://platform.openai.com/agent-builder
- **ChatKit Docs**: https://openai.github.io/chatkit-js/
- **OpenAI API Docs**: https://platform.openai.com/docs

---

## Summary

You just learned two approaches to AI chat:

1. **AI Chat** - Full control, more code, your database
2. **AI Agent** - Managed service, less code, OpenAI's infrastructure

Both are production-ready. Choose based on your needs:
- Need data control? → AI Chat
- Need speed? → AI Agent

For most side projects and prototypes, **AI Agent (ChatKit) is the faster choice**.
