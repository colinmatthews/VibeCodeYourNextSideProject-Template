# Engineering Ticket Submission Guide

## Quick Start: Using /linear-ticket Command

This guide walks you through creating engineering tickets using the `/linear-ticket` slash command. Follow these steps to ensure engineers have everything they need to fix issues quickly.

Tickets must be submitted with all required information or will be rejected.

Your ticket will be reviewed within 72 hours.

Two tickets are included in your enrollment. You can purchase an annual support plan for $2000/yr and get two tickets per month, first priority in ticket review, and quarterly 1:1s with Colin. 

Ad hoc tickets are $200 per isssue.

---

## Step 1: Capture Browser Logs

### For Frontend Issues:
1. **Open Developer Tools**
   - Press `F12` or right-click anywhere on the page → Select "Inspect"
   
2. **Navigate to Console Tab**
   - Click on the "Console" tab in Developer Tools
   - Clear existing logs (click the 🚫 icon)
   
3. **Reproduce the Issue**
   - Perform the actions that cause the error
   - Watch for red error messages in the console
   
4. **Save the Logs**
   - Right-click anywhere in the console
   - Select "Save as..." 
   - Name it `console-logs-[date].txt`
   
5. **Capture Network Activity** (if API-related)
   - Click "Network" tab
   - Reproduce the issue again
   - Right-click → "Save all as HAR with content"
   - Name it `network-logs-[date].har`

### For Backend Issues:
```bash
# In your terminal where the server is running:
npm run dev 2>&1 | tee server-logs.txt
# Then reproduce the issue
# Press Ctrl+C to stop and save logs
```

---

## Step 2: Add Collaborator to GitHub Repository

### Adding an Engineer as Collaborator:

1. **Go to Your Repository on GitHub**
   - Navigate to your repository page
   
2. **Access Settings**
   - Click "Settings" tab (rightmost tab under repository name)
   
3. **Manage Access**
   - In left sidebar, click "Manage access" under "Access" section
   - You may need to confirm your password
   
4. **Add the Engineer**
   - Click green "Add people" button
   - Enter the engineer's GitHub username or email (https://github.com/hatchli)
   - Select "Write" permission level
   - Click "Add [username] to this repository"
   
5. **Notify the Engineer**
   - They'll receive an email invitation
   - Share the repository URL with them directly

---

## Step 3: Access Linear Project

### Setting Up Linear Access:

1. **Create Linear Account** (if you don't have one)
   - Go to https://linear.app
   - Sign up with your work email
   
2. **Join/Create Workspace**
   - Join the workspace with this link: https://linear.app/tech-for-product/join/971c2a83e4ff949d8c1a45f8898822c6?s=5
   
3. **Navigate to Your Project**
   - Click on your team name in the sidebar
   - Select Vibe Code Production-Read Side Projects

---

## Step 4: Create the Ticket Using /linear-ticket

### In Your Development Environment:

1. **Open Terminal/Command Line**
   - Navigate to your project directory
   
2. **Use the /linear-ticket Command**
   ```bash
   /linear-ticket
   ```
   
3. **Fill Out the Ticket Form**
   Follow the prompts to provide:

   **A. Issue Summary**
   - One clear sentence describing the problem
   - Example: "File upload fails for images larger than 5MB"
   
   **B. Environment Details**
   - Frontend/Backend/Database issue?
   - Browser name and version
   - When it started happening
   - How many users affected
   
   **C. Steps to Reproduce**
   - List exact steps (1, 2, 3...)
   - Include specific data/files used
   - State expected vs actual results
   
   **D. Attach Your Logs**
   - Upload console-logs-[date].txt
   - Upload network-logs-[date].har
   - Upload server-logs.txt (if backend issue)
   
   **E. Code Investigation** (Claude will help with this)
   - Suspected files and line numbers
   - Recent commits that might be related
   
   **F. Repository Information**
   - Paste your GitHub repository URL
   - Confirm collaborator access granted
   - Mention the engineer's GitHub username

---

## Step 5: Submit and Track

1. **Review Your Ticket**
   - Ensure all sections are complete
   - Verify logs are attached
   - Confirm repository access is set up
   
2. **Submit the Ticket**
   - Click "Create Issue" or press Enter
   - Copy the ticket ID/URL for reference
   
3. **Share with Engineer**
   - Send the Linear ticket URL to the assigned engineer
   - Include your GitHub repository URL

---

## Additional Important Details

### What Makes a Good Ticket:

✅ **DO Include:**
- Exact error messages (copy/paste, don't paraphrase)
- Screenshots or screen recordings
- Specific user actions that trigger the issue
- Business impact (e.g., "Blocking all user signups")
- Any temporary workarounds you've found

❌ **DON'T:**
- Say "it doesn't work" without details
- Forget to test in incognito/private mode
- Submit without checking if issue already exists
- Leave out environment information

### Quick Checklist Before Submitting:

- [ ] Browser logs captured
- [ ] Steps to reproduce documented
- [ ] GitHub collaborator access granted
- [ ] Linear project accessed
- [ ] Error messages copied exactly
- [ ] Screenshots/recordings attached
- [ ] Repository URL included
- [ ] Engineer username noted

### Getting Help:

- **Can't access Linear?** Contact your team lead for an invite
- **GitHub permissions issue?** Ensure you're the repository owner
- **Not sure what logs to collect?** Include everything - better too much than too little

---

## Example Ticket Submission:

```
/linear-ticket

Title: Payment processing fails for amounts over $1000

Summary: Users cannot complete checkout when cart total exceeds $1000, receiving "Payment Failed" error

Environment:
- Type: Frontend/Backend Integration
- Browser: Chrome 119.0.6045.159
- Started: 2024-01-15 2:00 PM EST
- Affected Users: ~50 customers

Steps to Reproduce:
1. Add items to cart totaling >$1000
2. Proceed to checkout
3. Enter valid credit card
4. Click "Complete Purchase"
5. Expected: Payment succeeds
6. Actual: "Payment Failed" error appears

Logs Attached:
- console-logs-20240115.txt
- network-logs-20240115.har
- stripe-webhook-logs.txt

Code Investigation:
- server/routes/payment.ts:156 - Stripe amount validation
- client/src/components/Checkout.tsx:89 - Error handling

Repository:
- URL: https://github.com/johnsmith/VibeCodeYourNextSideProject-Template
- Collaborator: @engineer-username (Write access granted)

Priority: High - Blocking revenue
```

---

## Remember:
The more detailed your ticket, the faster engineers can fix the issue. When in doubt, include more information rather than less!