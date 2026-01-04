# ChatKit Function Definitions

This document explains how to configure the OpenAI Agent with the client-side tool functions for todo management.

## Overview

The todo management system uses **client tools** that execute in the browser and communicate with your Express API. These functions must be configured in your OpenAI Agent Builder.

## Function Definitions

Individual function definitions are stored in separate files for easy copy-pasting:

- `docs/agent-function-getTodos.json`
- `docs/agent-function-createTodo.json`
- `docs/agent-function-updateTodoStatus.json`
- `docs/agent-function-deleteTodo.json`

### Available Functions

1. **getTodos** - Fetch all todos with status and timestamps
2. **createTodo** - Create a new todo (defaults to "open" status)
3. **updateTodoStatus** - Change todo status (open → in_progress → completed)
4. **deleteTodo** - Delete a todo by ID

## Setup Instructions

### 1. Open OpenAI Agent Builder

Go to [https://platform.openai.com/agent-builder](https://platform.openai.com/agent-builder)

### 2. Configure Client Tools

For each function, add it to your agent:

1. Open the corresponding JSON file in `docs/`
2. Click **"Add Client Tool"** in your agent configuration
3. Copy the entire JSON content from the file
4. Paste it into the agent builder
5. Save the function
6. Repeat for all three functions

### 3. Function Details

#### getTodos

```json
{
  "name": "getTodos",
  "description": "Fetch all todo items for the authenticated user. Returns todos with their current status (open, in_progress, or completed) and timestamps.",
  "strict": false,
  "parameters": {
    "type": "object",
    "properties": {},
    "additionalProperties": false,
    "required": []
  }
}
```

**Returns:**
```javascript
{
  success: true,
  todos: [
    {
      id: number,
      text: string,
      status: "open" | "in_progress" | "completed",
      createdAt: string,
      updatedAt: string
    }
  ],
  count: number
}
```

#### createTodo

```json
{
  "name": "createTodo",
  "description": "Create a new todo item for the authenticated user. The todo will be created with 'open' status by default.",
  "strict": false,
  "parameters": {
    "type": "object",
    "properties": {
      "text": {
        "type": "string",
        "description": "The todo item text"
      }
    },
    "additionalProperties": false,
    "required": ["text"]
  }
}
```

**Returns:**
```javascript
{
  success: true,
  todo: {
    id: number,
    text: string,
    status: "open",
    createdAt: string,
    updatedAt: string
  }
}
```

#### updateTodoStatus

```json
{
  "name": "updateTodoStatus",
  "description": "Update the status of an existing todo item. Valid statuses are: 'open' (not started), 'in_progress' (actively working on), or 'completed' (finished).",
  "strict": false,
  "parameters": {
    "type": "object",
    "properties": {
      "id": {
        "type": "number",
        "description": "The ID of the todo item to update"
      },
      "status": {
        "type": "string",
        "enum": ["open", "in_progress", "completed"],
        "description": "The new status for the todo item"
      }
    },
    "additionalProperties": false,
    "required": ["id", "status"]
  }
}
```

**Returns:**
```javascript
{
  success: true,
  todo: {
    id: number,
    text: string,
    status: string,
    updatedAt: string
  }
}
```

#### deleteTodo

```json
{
  "name": "deleteTodo",
  "description": "Delete a todo item by its ID. This permanently removes the todo from the user's list.",
  "strict": false,
  "parameters": {
    "type": "object",
    "properties": {
      "id": {
        "type": "number",
        "description": "The ID of the todo item to delete"
      }
    },
    "additionalProperties": false,
    "required": ["id"]
  }
}
```

**Returns:**
```javascript
{
  success: true,
  message: "Todo deleted successfully",
  deletedId: number
}
```

## Status Workflow

The todo system supports three statuses:

- **open** - Todo is created but not started
- **in_progress** - Actively working on the todo
- **completed** - Todo is finished

Users can click the status icon to cycle through: open → in_progress → completed → open

## Implementation Details

### Client-Side Handler

The client tools are implemented in `client/src/pages/ai-chat.tsx` in the `onClientTool` callback:

```typescript
onClientTool: async ({ name, params }) => {
  switch (name) {
    case 'getTodos': // ...
    case 'createTodo': // ...
    case 'updateTodoStatus': // ...
    case 'deleteTodo': // ...
  }
}
```

### API Endpoints

The backend provides these endpoints:

- `GET /api/items` - Fetch all todos
- `POST /api/items` - Create a new todo
- `PATCH /api/items/:id/status` - Update todo status
- `DELETE /api/items/:id` - Delete a todo

### Database Schema

Todos are stored with:
- `id` (serial) - Primary key
- `item` (text) - Todo text
- `userId` (text) - Owner's Firebase ID
- `status` (enum) - Current status
- `createdAt` (timestamp) - Creation time
- `updatedAt` (timestamp) - Last update time

## Testing the Integration

1. Start your development server
2. Navigate to the AI Chat page
3. Try these commands:
   - "Create a todo to buy groceries"
   - "Show me all my todos"
   - "Mark todo #1 as in progress"
   - "Complete todo #1"
   - "Delete todo #2"

The AI agent should be able to create, read, update, and delete todos through the client tools.
