# Debug the Chat - Check Console Logs

Since you have the API key set and the chat panel is open, let's check what's happening when you click send.

## Step 1: Open DevTools

**With the ContextOS chat panel visible:**

1. **Right-click anywhere** in the chat panel (where the messages appear)
2. Select **"Inspect"** or **"Inspect Element"**
3. DevTools will open in a new panel

**OR**

1. Click inside the ContextOS chat panel
2. Press `Ctrl+Shift+I`

## Step 2: Go to Console Tab

1. In DevTools, click the **"Console"** tab at the top
2. Clear any existing logs (click the 🚫 icon)

## Step 3: Test Sending a Message

1. Type **"test"** in the chat input box
2. Click the **send button** (arrow icon)
3. **Watch the Console tab**

## What to Look For:

### ✅ If Working (Good Signs):
```
Sending message: test
Message sent to extension
Received message from webview: prompt Object {type: "prompt", value: "test"}
Handling prompt: test
API key retrieved: Yes (length: XX)
Sending request to: https://contextos-api-jxdr.onrender.com/api/v1/query
Response status: 200 OK
```

### ❌ If Not Working (Bad Signs):

**No logs at all:**
- JavaScript error preventing code from running
- Event listeners not attached

**Error messages in red:**
- "Cannot read property..."
- "undefined is not a function"
- "Network error"
- "API key not found"

**Logs stop at a certain point:**
- Tells us exactly where it's failing

## Step 4: Share What You See

**Take a screenshot of the Console tab** after clicking send and share it with me.

Or copy and paste the console output here.

---

## Quick Alternative Test

If you can't open DevTools, try this:

1. **Click a suggestion chip** (e.g., "What did I last commit?")
   - Does the text fill the input box? YES/NO
   
2. **Press Enter**
   - Does the message appear in the chat? YES/NO
   - Do you see any error message? YES/NO
   - Do you see a "thinking..." indicator? YES/NO

3. **What exactly happens?**
   - Nothing at all?
   - Input clears but no message appears?
   - Error message appears?
   - Message appears but no response?

Let me know exactly what you observe!
