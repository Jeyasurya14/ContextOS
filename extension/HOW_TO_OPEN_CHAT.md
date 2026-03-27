# How to Open the ContextOS Chat Panel

## ⚠️ You're Looking at the Wrong Screen!

The screenshot shows the **Extension Details Page** - this is just information ABOUT the extension.

You need to open the **actual chat panel** to use it.

## ✅ How to Open the Chat Panel

### Method 1: Activity Bar Icon (Easiest)
1. Look at the **LEFT SIDEBAR** of VS Code
2. Find the **ContextOS icon** (should look like a robot/hexagon)
3. **Click it**
4. The chat panel will open on the left side

### Method 2: Status Bar
1. Look at the **BOTTOM RIGHT** of VS Code
2. Find "**ContextOS**" text in the status bar
3. **Click it**
4. The chat panel will open

### Method 3: Command Palette
1. Press `Ctrl+Shift+P`
2. Type: **"ContextOS"**
3. Select: **"ContextOS: Assistant"** or **"Focus on ContextOS Assistant View"**
4. The chat panel will open

## What You Should See

When the chat panel opens, you should see:

```
┌─────────────────────────────┐
│ 🤖 CONTEXTOS    [New chat]  │
├─────────────────────────────┤
│                             │
│   ContextOS Assistant       │
│                             │
│   Your project-aware AI...  │
│                             │
│  [What did I last commit?]  │
│  [Explain this codebase]    │
│  [What's in my Notion?]     │
│  [Review open PRs]          │
│  [Write a unit test]        │
│  [Find bugs in this file]   │
│                             │
├─────────────────────────────┤
│ [Type message here...] [→]  │
│ Enter · Shift+Enter new line│
└─────────────────────────────┘
```

## Before You Test

**IMPORTANT**: Set your API key first!

1. Press `Ctrl+Shift+P`
2. Type: `ContextOS: Set API Key`
3. Enter your API key (starts with `ctx_`)
4. Wait for success message

## Then Test the Chat

1. **Click a suggestion chip** (e.g., "What did I last commit?")
   - The text should fill the input box
2. **Press Enter**
   - Message should appear in chat
   - AI should respond

OR

1. **Type "hello"** in the input box
2. **Press Enter** or click the send button (→)
3. Message should appear and AI should respond

---

**Close the extension details tab and open the actual chat panel using one of the methods above!**
