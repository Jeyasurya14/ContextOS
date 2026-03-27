# How to Debug the ContextOS Extension

## Step 1: Open DevTools in the Chat Panel

### Method 1: Right-Click in Chat Panel
1. Open the ContextOS chat panel (click icon in Activity Bar)
2. **Right-click anywhere** in the chat panel
3. Select **"Inspect"** or **"Inspect Element"**
4. DevTools will open showing the webview

### Method 2: Command Palette
1. Click inside the ContextOS chat panel
2. Press `Ctrl+Shift+P`
3. Type "Developer: Open Webview Developer Tools"
4. Press Enter

### Method 3: Help Menu
1. Go to **Help** → **Toggle Developer Tools**
2. This opens the main DevTools
3. Look for the Console tab

## Step 2: Test and Check Console

Once DevTools is open:

1. **Click the Console tab** at the top
2. **Type a message** in the chat input box (e.g., "hello")
3. **Press Enter** or click the send button
4. **Look for these logs**:
   - "Sending message: hello"
   - "Message sent to extension"
   - "Received message from webview: prompt"

## What to Look For:

### ✅ Good Signs:
```
Sending message: hello
Message sent to extension
```

### ❌ Bad Signs (Errors):
- Red error messages
- "undefined is not a function"
- "Cannot read property..."
- No logs at all when clicking send

## Step 3: Share What You See

Take a screenshot or copy the console output and share it with me.

---

## Alternative: Test in Extension Development Host

If the above doesn't work, let's test in development mode:

1. **Open the extension folder** in VS Code:
   ```
   File → Open Folder → C:\Users\jeyas\OneDrive\Desktop\contextos\extension
   ```

2. **Press F5** - This opens Extension Development Host

3. **In the new window**:
   - Set API key: `Ctrl+Shift+P` → "ContextOS: Set API Key"
   - Open ContextOS chat
   - Try sending a message

4. **Check the original VS Code window**:
   - Go to View → Output
   - Select "Extension Host" from dropdown
   - Look for logs

---

## Quick Test: Does the Input Work?

1. Open ContextOS chat
2. Click in the input box at the bottom
3. Type some text
4. Can you type? Does text appear?
5. Press Enter - what happens?
6. Click a suggestion chip - does it fill the input?

Let me know what happens at each step!
