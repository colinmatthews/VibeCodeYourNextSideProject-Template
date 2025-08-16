# Linear Engineering Ticket Guide

## Overview
This guide outlines the process for creating comprehensive Linear tickets for engineering issues, ensuring engineers have all necessary information to quickly understand and resolve problems.

IMPORTANT: When using this workflow, do not make code changes. Only document the issue.

FIRST: tell the user you will write a Linear ticket for them.
REQUIRED: Logs must be included

## Before Creating a Ticket

### 1. Information Collection Checklist
Gather the following before creating your ticket:

- [ ] **Error Messages**: Copy exact error messages, including stack traces
- [ ] **Steps to Reproduce**: Document the exact sequence of actions that trigger the issue
- [ ] **Environment Details**:
  - Browser and version (if frontend issue)
  - Node.js version (if backend issue)
  - Operating system
  - Database version (if applicable)
- [ ] **User Impact**: How many users affected? Is there a workaround?
- [ ] **Timeline**: When did the issue first occur? Is it intermittent or consistent?
- [ ] **Screenshots/Videos**: Visual evidence of the issue occurring

### 2. Log Collection

#### Frontend Logs
```bash
# Browser console logs
1. Open Developer Tools (F12 or right-click → Inspect)
2. Navigate to Console tab
3. Reproduce the issue
4. Right-click in console → Save as...
```

#### Backend Logs
```bash
# Server logs (local development)
npm run dev 2>&1 | tee server-logs.txt

# Production logs (if using PM2)
pm2 logs [app-name] --lines 1000 > production-logs.txt

# Database query logs (if relevant)
# Check server/logs/ directory for query logs
```

#### Network Logs
```bash
# Export HAR file from browser
1. Open Network tab in Developer Tools
2. Reproduce the issue
3. Right-click → Save all as HAR with content
```

## Code Review Requirements

### 1. Identify Affected Code
Before submitting, attempt to locate the problematic code:

```bash
# Search for error messages in codebase
grep -r "error message text" ./src ./server

# Find related components/files
find . -name "*ComponentName*" -type f

# Check recent changes
git log --oneline -n 20
git diff HEAD~5
```

### 2. Review Related Code
Document findings in the ticket:
- File paths and line numbers (e.g., `server/storage/FileStorage.ts:45`)
- Relevant function/component names
- Any suspicious patterns or potential bugs identified
- Related pull requests or recent changes

## Suggested Solutions

### Required Analysis
Every ticket should include:

1. **Root Cause Hypothesis**
   - What you believe is causing the issue
   - Supporting evidence from logs/code

2. **Proposed Solutions** (at least 2 options)
   ```markdown
   ## Solution A: [Quick Fix]
   - Description: [What needs to be changed]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Estimated effort: [Hours/Days]
   
   ## Solution B: [Proper Fix]
   - Description: [More comprehensive approach]
   - Pros: [Long-term benefits]
   - Cons: [Implementation complexity]
   - Estimated effort: [Hours/Days]
   ```

3. **Testing Approach**
   - How to verify the fix works
   - Edge cases to consider
   - Regression testing needed

## GitHub Repository Access

### Repository Link
**Main Repository**: [https://github.com/[your-username]/VibeCodeYourNextSideProject-Template](https://github.com/[your-username]/VibeCodeYourNextSideProject-Template)

### Adding Collaborators
To grant an engineer access to work on the issue:

1. **Navigate to Repository Settings**
   ```
   Repository → Settings → Manage access → Add people
   ```

2. **Invite Collaborator**
   - Click "Add people"
   - Enter engineer's GitHub username or email
   - Select permission level (typically "Write" for engineers)
   - Send invitation

3. **Alternative: Create a Fork**
   If you prefer engineers work on forks:
   ```bash
   # Engineer should:
   1. Fork the repository
   2. Clone their fork
   3. Add upstream remote:
      git remote add upstream https://github.com/[your-username]/VibeCodeYourNextSideProject-Template.git
   4. Create feature branch:
      git checkout -b fix/linear-ticket-id
   ```

## Linear Ticket Template

```markdown
## Issue Summary
[One sentence description of the problem]

## Environment
- **Type**: [Frontend/Backend/Database/Integration]
- **Severity**: [Critical/High/Medium/Low]
- **Affected Users**: [Number or percentage]
- **First Occurrence**: [Date/Time]
- **Frequency**: [Always/Often/Sometimes/Once]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Expected result]
4. [Actual result]

## Error Details
```
[Paste complete error message/stack trace here]
```

## Logs
[Attach or link to collected logs]
- Console logs: [attachment]
- Server logs: [attachment]
- Network HAR: [attachment]

## Code Investigation
**Suspected Files**:
- `path/to/file.ts:123` - [Why this file is relevant]
- `path/to/another.tsx:45` - [Why this file is relevant]

**Recent Changes**:
- Commit: [hash] - [description]
- PR: #[number] - [title]

## Proposed Solutions

### Option 1: [Title]
**Approach**: [Description]
**Effort**: [X hours]
**Risk**: [Low/Medium/High]

### Option 2: [Title]
**Approach**: [Description]
**Effort**: [X hours]
**Risk**: [Low/Medium/High]

## Repository Access
- **Repo**: https://github.com/[username]/VibeCodeYourNextSideProject-Template
- **Branch**: [feature/fix branch if created]
- **Collaborator Access**: [Granted/Pending/Not Required]

## Additional Context
[Any other relevant information, screenshots, or references]

## Acceptance Criteria
- [ ] Issue no longer reproducible
- [ ] Tests added/updated
- [ ] No regression in related features
- [ ] Documentation updated if needed
```

## Best Practices

### DO's
✅ Include exact error messages and stack traces  
✅ Provide minimal reproduction steps  
✅ Search existing tickets before creating new ones  
✅ Link related tickets or PRs  
✅ Update ticket as new information becomes available  
✅ Test proposed solutions locally if possible  

### DON'Ts
❌ Submit vague descriptions like "it's broken"  
❌ Forget to include environment details  
❌ Skip the code investigation step  
❌ Create duplicate tickets  
❌ Leave out user impact assessment  
❌ Forget to grant repository access  

## Quick Commands Reference

```bash
# Collect all logs for a ticket
mkdir linear-ticket-$(date +%Y%m%d)
cd linear-ticket-$(date +%Y%m%d)

# Capture server logs
npm run dev 2>&1 | tee server.log

# Export recent git history
git log --oneline -n 50 > git-history.txt
git diff HEAD~10 > recent-changes.diff

# Find error occurrences
grep -r "ERROR" ../server/ > error-locations.txt

# Package everything
cd ..
tar -czf linear-ticket-$(date +%Y%m%d).tar.gz linear-ticket-$(date +%Y%m%d)/
```

## Support

For questions about this process:
1. Check the team's engineering wiki
2. Ask in #engineering-support Slack channel
3. Contact the on-call engineer

Remember: A well-documented ticket saves engineering time and gets issues resolved faster!