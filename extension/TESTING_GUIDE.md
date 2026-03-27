# Testing Guide - ContextOS Extension v1.3.0

## 🔍 How to Test the Extension

### Step 1: Launch Extension Development Host

1. Open the extension folder in VS Code
2. Press **F5** to launch Extension Development Host
3. A new VS Code window will open with the extension loaded

### Step 2: Open the ContextOS Panel

**Method 1: Activity Bar**
- Click the ContextOS icon in the Activity Bar (left sidebar)

**Method 2: Status Bar**
- Click the "ContextOS" item in the status bar (bottom right)

**Method 3: Command Palette**
- Press `Ctrl+Shift+P`
- Type "ContextOS" and select any command

### Step 3: Set Your API Key

1. Press `Ctrl+Shift+P`
2. Type "ContextOS: Set API Key"
3. Enter your API key (format: `ctx_...`)
4. You should see a confirmation message

### Step 4: Test Message Sending

#### Test 1: Send a Simple Message
1. Type "Hello" in the input box
2. Press **Enter** or click the send button
3. **Expected**: Message appears, AI responds

#### Test 2: Click Predefined Questions
1. Click any of the suggestion chips (e.g., "What did I last commit?")
2. **Expected**: Question fills the input box
3. Press Enter to send
4. **Expected**: AI responds

#### Test 3: Multi-line Message
1. Type a message
2. Press **Shift+Enter** to add a new line
3. Type more text
4. Press **Enter** to send
5. **Expected**: Multi-line message sends correctly

### Step 5: Check Console for Debugging

1. In the Extension Development Host window:
   - Press `Ctrl+Shift+I` to open DevTools
   - Go to the **Console** tab
   - You should see logs like:
     ```
     Sending message: Hello
     Message sent to extension
     Received message from webview: prompt
     Handling prompt: Hello
     API key retrieved: Yes (length: XX)
     API URL: https://contextos-api-jxdr.onrender.com
     Sending request to: ...
     Response status: 200 OK
     ```

2. In the main VS Code window (where you pressed F5):
   - Go to **View → Output**
   - Select "Extension Host" from the dropdown
   - Check for any errors

### Step 6: Test Error Scenarios

#### Test 1: No API Key
1. Don't set an API key (or clear it)
2. Try to send a message
3. **Expected**: Error message "No API key found..."

#### Test 2: Invalid API Key
1. Set an invalid API key
2. Send a message
3. **Expected**: Error with retry button

#### Test 3: Network Error
1. Disconnect internet
2. Send a message
3. **Expected**: Error with retry button
4. Reconnect internet
5. Click retry button
6. **Expected**: Message sends successfully

### Step 7: Test New Commands

#### Test 1: Send Code to Chat
1. Open any code file
2. Select some code
3. Right-click → "ContextOS: Send Code to Chat"
4. **Expected**: Chat opens with code context

#### Test 2: Explain Current File
1. Open any file
2. Press `Ctrl+Shift+P`
3. Run "ContextOS: Explain Current File"
4. **Expected**: Chat opens with file explanation request

#### Test 3: Find Bugs
1. Open a file with code
2. Select some code (or leave empty)
3. Press `Ctrl+Shift+P`
4. Run "ContextOS: Find Bugs in Code"
5. **Expected**: Chat opens with bug analysis request

### Step 8: Test Persistence

1. Send a few messages
2. Close VS Code completely
3. Reopen VS Code
4. Open ContextOS panel
5. **Expected**: Previous conversation is restored

## 🐛 Troubleshooting

### Issue: Messages Not Sending

**Check Console Logs:**
1. Open DevTools Console (Ctrl+Shift+I)
2. Look for errors in red
3. Check what step is failing

**Common Causes:**
- ❌ No API key set
- ❌ Invalid API key
- ❌ Wrong API URL in settings
- ❌ Network/firewall blocking requests
- ❌ Backend server is down

**Solutions:**
1. Verify API key is set: `ContextOS: Set API Key`
2. Check API URL in settings (should be `https://contextos-api-jxdr.onrender.com`)
3. Check internet connection
4. Look at console logs for specific error

### Issue: Chips Not Clickable

**Check:**
1. Open DevTools Console
2. Click a chip
3. Look for "Sending message: [chip text]" in console
4. If you see the log but nothing happens, it's a backend issue
5. If you don't see the log, it's a frontend issue

**Solution:**
- Reload the webview: Close and reopen ContextOS panel
- Check console for JavaScript errors

### Issue: Send Button Not Working

**Check:**
1. Type a message
2. Click send button
3. Check console for "Sending message: ..." log
4. If no log appears, there's a JavaScript error

**Solution:**
- Check DevTools Console for errors
- Reload the extension (Ctrl+R in Extension Development Host)

### Issue: No Response from AI

**Check Console Logs:**
```
Sending request to: https://...
Response status: XXX
```

**If status is 200:**
- Response should stream in
- Check for "token" events in console
- If no tokens, backend might not be streaming

**If status is 4XX/5XX:**
- Check API key validity
- Check backend server status
- Look at error message in console

## 📊 Expected Console Output

### Successful Message Flow:
```
Sending message: Hello
Message sent to extension
Received message from webview: prompt Object {type: "prompt", value: "Hello"}
Handling prompt: Hello
Processing started, isProcessing: true
API key retrieved: Yes (length: 24)
API URL: https://contextos-api-jxdr.onrender.com
Attempt 1 of 3
Posting to webview: Object {type: "thinking", value: "Thinking…"}
Sending request to: https://contextos-api-jxdr.onrender.com/api/v1/query
Request body: Object {question: "Hello", stream: true, conversation_id: null}
Response status: 200 OK
Posting to webview: Object {type: "token", value: "Hello"}
Posting to webview: Object {type: "token", value: "!"}
Posting to webview: Object {type: "done"}
Processing ended, isProcessing: false
```

### Error Flow (No API Key):
```
Sending message: Hello
Message sent to extension
Received message from webview: prompt Object {type: "prompt", value: "Hello"}
Handling prompt: Hello
Processing started, isProcessing: true
API key retrieved: No
No API key found, showing error
Posting to webview: Object {type: "error", value: "No API key found...", canRetry: false}
```

## ✅ Success Criteria

- ✅ Extension loads without errors
- ✅ ContextOS panel opens
- ✅ Can set API key
- ✅ Can send messages via input box
- ✅ Can send messages via chip clicks
- ✅ Messages appear in chat
- ✅ AI responses stream in
- ✅ Errors show with retry buttons
- ✅ Retry button works
- ✅ Conversation persists across restarts
- ✅ New commands work (Explain File, Find Bugs)
- ✅ Status bar integration works

## 🔧 Advanced Debugging

### Enable Verbose Logging

The extension now has comprehensive logging. Check:

1. **Webview Console** (Ctrl+Shift+I in Extension Development Host)
   - All frontend events
   - Message sending
   - Button clicks

2. **Extension Host Output** (View → Output → Extension Host)
   - Backend processing
   - API calls
   - Error details

### Test API Connection Manually

```bash
# Test if backend is reachable
curl https://contextos-api-jxdr.onrender.com/health

# Test API endpoint (replace YOUR_API_KEY)
curl -X POST https://contextos-api-jxdr.onrender.com/api/v1/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"question":"Hello","stream":false}'
```

### Check Settings

1. Open Settings (Ctrl+,)
2. Search for "ContextOS"
3. Verify "Contextos: Api Url" is correct
4. Default should be: `https://contextos-api-jxdr.onrender.com`

## 📞 Report Issues

If you find bugs, include:
1. Console logs (both webview and extension host)
2. Steps to reproduce
3. Expected vs actual behavior
4. VS Code version
5. Extension version (1.3.0)
