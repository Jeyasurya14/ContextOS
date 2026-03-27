# Installation Instructions - ContextOS Extension v1.3.0

## ✅ Extension Installed Successfully!

The local VSIX with all fixes has been installed. Follow these steps to use it:

## 🔄 Step 1: Reload VS Code

**IMPORTANT**: You must reload VS Code for the extension to activate.

### Option A: Command Palette
1. Press `Ctrl+Shift+P`
2. Type "Reload Window"
3. Press Enter

### Option B: Close and Reopen
1. Close VS Code completely
2. Reopen VS Code

## 🔑 Step 2: Set Your API Key

After reload:
1. Press `Ctrl+Shift+P`
2. Type "ContextOS: Set API Key"
3. Enter your API key (format: `ctx_...`)
4. You should see a checkmark in the status bar

## 💬 Step 3: Open the Chat

### Method 1: Activity Bar
- Click the ContextOS icon in the left sidebar

### Method 2: Status Bar
- Click "ContextOS" in the bottom status bar

### Method 3: Command Palette
- Press `Ctrl+Shift+P`
- Type "ContextOS"

## ✨ Step 4: Test the Chat

1. **Type a message** in the input box at the bottom
2. **Press Enter** or click the send button
3. **Or click a suggestion chip** like "What did I last commit?"

### Expected Behavior
- Message appears in chat
- AI responds with streaming text
- No errors in console

## 🐛 Debugging

If it still doesn't work:

### 1. Check Console
- Press `Ctrl+Shift+I` to open DevTools
- Go to Console tab
- Look for any errors (red text)
- Look for logs like "Sending message: ..."

### 2. Check Output Panel
- Go to View → Output
- Select "Extension Host" from dropdown
- Look for ContextOS logs

### 3. Verify Installation
```powershell
code --list-extensions | Select-String "contextos"
```

Should show: `jeyasuriyam.contextos-copilot`

### 4. Check Extension Version
- Go to Extensions panel (Ctrl+Shift+X)
- Search "ContextOS"
- Version should be **1.3.0**

## 🔍 What's Different in v1.3.0

✅ Fixed chip click handlers (event delegation)
✅ Fixed send button (proper event handling)
✅ Added comprehensive logging
✅ Changed default API URL to production
✅ Added retry logic with visual feedback
✅ Persistent conversation history

## 📞 If Still Not Working

1. **Uninstall and reinstall**:
   ```powershell
   code --uninstall-extension JeyaSuryaM.contextos-copilot
   code --install-extension contextos-copilot-1.3.0.vsix
   ```

2. **Check API connectivity**:
   - Verify internet connection
   - Check if https://contextos-api-jxdr.onrender.com is accessible

3. **Enable debug mode**:
   - Settings → Search "ContextOS"
   - Enable "Debug Mode"
   - Check console for detailed logs

## ✅ Success Checklist

After reload, you should see:
- [ ] ContextOS icon in Activity Bar
- [ ] ContextOS item in Status Bar
- [ ] Extension version 1.3.0 in Extensions panel
- [ ] Chat panel opens when clicking icon
- [ ] Input box at bottom of chat
- [ ] Suggestion chips visible
- [ ] Send button visible

---

**Current Status**: Extension installed, waiting for VS Code reload

**Next Step**: Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")
