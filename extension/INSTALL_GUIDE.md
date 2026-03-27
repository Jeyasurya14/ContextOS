# ContextOS Extension - Install & Setup Guide

## ✅ **Version 2.0.0 - Production Ready**

---

## 📦 **Installation**

### Step 1: Install the Extension

```bash
# From the extension directory:
code --install-extension contextos-copilot-1.3.7.vsix
```

Or in VS Code:
1. Press `Ctrl+Shift+X` (Extensions)
2. Click "..." (More Actions)
3. Select "Install from VSIX..."
4. Choose `contextos-copilot-1.3.7.vsix`

### Step 2: Reload VS Code

- Press `Ctrl+Shift+P`
- Type `Developer: Reload Window`
- Press Enter

---

## 🔐 **Setup API Key**

### Step 1: Get Your ContextOS API Key

1. Go to your **ContextOS dashboard** (usually `https://contextos.learnmade.in/` or your custom URL)
2. Log in to your account
3. Navigate to **Settings** or **API Keys**
4. Generate a new API key
5. Copy the key (it starts with `ctx_`)

### Step 2: Set the API Key in VS Code

1. Press `Ctrl+Shift+P` (Command Palette)
2. Type `ContextOS: Set API Key`
3. Enter your API key (paste it)
4. Click OK

✅ You should see: `✅ ContextOS API Key saved successfully!`

---

## 💬 **Using the Chat Panel**

### Step 1: Open the ContextOS Sidebar

- Click the **robot icon** 🤖 in the Activity Bar (left sidebar)
- Or press `Ctrl+Shift+P` → `ContextOS: Focus Chat View`

### Step 2: Start Chatting

1. **Type your message** in the input box at the bottom
2. **Press Enter** (or click the Send button →)
3. Watch the response stream in real-time

---

## 🎯 **Test It Works!**

Follow this quick test:

1. **Open the sidebar** → You should see:
   - ContextOS logo (orange robot)
   - "Live" badge
   - Welcome message with quick chips
   - "New chat" button at top-right

2. **Type a test message**: `Hello, can you explain what ContextOS does?`

3. **Press Enter** → You should see:
   - ✅ Your message appears on the **right** (orange bubble)
   - ✅ Status bar at bottom shows "Thinking..."
   - ✅ Bot response streams in on the **left**
   - ✅ Response includes proper formatting

4. **Check Developer Console** (optional):
   - Press `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
   - Go to **Console** tab
   - Should see: `[Webview] Chat UI initialized`
   - Should **NOT** see any red errors

---

## ⚙️ **Configuration (Optional)**

### Change API URL

If you're using a custom ContextOS backend:

1. Press `Ctrl+,` (Settings)
2. Search for `contextos.apiUrl`
3. Change from default `https://contextos-api-jxdr.onrender.com` to your URL (e.g., `http://localhost:8000`)
4. Save

Or edit `settings.json` directly:
```json
{
  "contextos.apiUrl": "http://localhost:8000"
}
```

### Other Settings

Access via Settings UI (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `contextos.apiUrl` | `https://contextos-api-jxdr.onrender.com` | ContextOS API base URL |
| `contextos.maxRetries` | `2` | Max retry attempts for failed requests |
| `contextos.timeout` | `120000` | Request timeout (ms) |
| `contextos.enableTelemetry` | `false` | Enable anonymous telemetry |
| `contextos.debugMode` | `false` | Enable debug logging |

---

## 🔧 **Troubleshooting**

### ❌ **"No API key found" error**

**Solution**: Run `ContextOS: Set API Key` again and ensure key starts with `ctx_`

---

### ❌ **Chat panel not showing**

**Solution**:
1. Check if extension is enabled (Extensions view → ContextOS → Enabled)
2. Reload VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`
3. If still not showing, press `Ctrl+Shift+P` → `ContextOS: Focus Chat View`

---

### ❌ **Send button not working / No response**

**Checklist**:
- ✅ API key is set (check status bar shows ✓ when you set it)
- ✅ Backend is accessible (your ContextOS server is running)
- ✅ No errors in Developer Console
- ✅ Not already processing (wait for current response to finish)

---

### ❌ **Network errors / CORS / Timeout**

**Solution**:
1. Check your `contextos.apiUrl` setting is correct
2. Verify backend is running and accessible
3. If using localhost, ensure CORS is enabled on backend
4. Increase timeout: `contextos.timeout` → `300000` (5 minutes)

---

### ❌ **Errors in Console about `local-network-access`**

**Solution**: You're using an old version. Install v1.3.7 or later.

---

## 📊 **Feature Walkthrough**

### Sending a Message

1. Type in the textarea
2. Press `Enter` (or click Send)
3. Message bubbles appear:
   - **Right side**: Your messages (orange)
   - **Left side**: Bot responses (gray)

### Streaming Responses

- Bot responses stream token by token
- You see text appear in real-time
- No waiting for full response

### Context Attachment

Use these commands to send code context:

- **`ContextOS: Send Code to Chat`** - Send selected code
- **`ContextOS: Explain Current File`** - Explain entire file
- **`ContextOS: Find Bugs in Code`** - Bug analysis

### Managing Chat

- **Clear history**: Click "New chat" button (top right)
- **Copy messages**: Hover over message → Click "Copy" button
- **Copy code blocks**: Hover over code block → Click "Copy" button

---

## 🏗️ **How It Works**

### Architecture

```
VS Code Extension (this) ↔ Your ContextOS Backend ↔ LLMs (OpenRouter/OpenAI)
        │                              │
        └── API Key (ctx_...)          └── Handles auth & routing
```

### Components

| Component | Description |
|-----------|-------------|
| **Extension** | VS Code extension (this package) |
| **Webview** | Chat UI panel in sidebar |
| **API Key** | Your ContextOS account key (`ctx_...`) |
| **Backend** | ContextOS server (handles OpenRouter/OpenAI) |
| **LLMs** | Actual AI models (Gemini, GPT-4, etc.) |

**You don't need to know which LLM is used** - the backend handles it automatically.

---

## 🎉 **You're Ready!**

1. ✅ Extension installed
2. ✅ API key configured
3. ✅ Chat panel functional
4. ✅ Streaming responses working

**Start chatting!** Type your first question and press Enter.

---

## 📞 **Support**

If you encounter issues:

1. Check **Developer Console** for errors
2. Verify API key is set correctly
3. Ensure backend is accessible
4. Review this guide's troubleshooting section

---

**Version**: 1.3.7 | **Date**: 2026-03-28
