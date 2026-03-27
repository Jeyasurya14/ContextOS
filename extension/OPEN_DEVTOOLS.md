# How to Open DevTools for the Chat Panel

## Method 1: Keyboard Shortcut (Easiest)

1. **Click inside the ContextOS chat panel** (click in the input box where it says "test")
2. **Press `Ctrl+Shift+I`** (or `F12`)
3. DevTools should open

## Method 2: Command Palette

1. **Click inside the ContextOS chat panel**
2. Press `Ctrl+Shift+P`
3. Type: **"Developer: Open Webview Developer Tools"**
4. Press Enter
5. DevTools opens in a new window

## Method 3: Help Menu

1. Go to **Help** menu at the top
2. Click **"Toggle Developer Tools"**
3. DevTools opens

---

## What to Do After DevTools Opens:

1. **Click the "Console" tab** at the top of DevTools
2. You should see logs like:
   ```
   DOM Elements Check: {...}
   Attaching click listener to send button
   ContextOS Chat UI initialized successfully
   ```

3. **Now click the send button** (the orange arrow)
4. **Watch the console** - you should see:
   ```
   Send button clicked!
   Sending message: test
   ```

---

## If DevTools Won't Open:

Try this simple test instead:

1. **Click a suggestion chip** (like "What did I last commit?")
   - Does it fill the input box? YES/NO

2. **Press Enter** (not the send button)
   - Does anything happen? YES/NO

3. **Look at the bottom status bar** of VS Code
   - Do you see any error messages?

---

**Try opening DevTools with `Ctrl+Shift+I` while clicked in the chat panel!**
