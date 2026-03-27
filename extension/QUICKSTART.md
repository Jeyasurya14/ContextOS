# ContextOS Extension - Quick Start Guide

## 🎯 Installation & Setup

### 1. Install the Extension
The extension is now ready to use! It has been compiled and is located in the `dist/` folder.

### 2. Set Your API Key
```
Ctrl+Shift+P → "ContextOS: Set API Key" → Enter your key (ctx_...)
```

### 3. Open the Assistant
Click the **ContextOS** icon in the Activity Bar (left sidebar) or click the status bar item.

## 💬 Using the Chat

### Starting a Conversation
1. Type your question in the input box at the bottom
2. Press **Enter** to send (Shift+Enter for new line)
3. Watch as the AI responds in real-time with streaming

### Example Prompts
- "What did I last commit?"
- "Explain this codebase"
- "Review open PRs"
- "Write a unit test for this function"
- "Find bugs in this file"

### Quick Actions (Suggestion Chips)
Click any of the suggestion chips on the welcome screen to get started quickly.

## 🔥 New Features

### 1. Persistent Conversations
Your chat history is automatically saved! Close VS Code and come back - your conversation will be right where you left it.

### 2. Retry on Errors
If a message fails to send:
- The extension automatically retries up to 3 times
- If it still fails, click the **🔄 Retry** button on the error message
- Check your internet connection and API settings

### 3. Send Code to Chat
**Method 1: Context Menu**
1. Select code in any file
2. Right-click → "ContextOS: Send Code to Chat"
3. The code appears in your chat with file context

**Method 2: Command Palette**
1. Select code
2. `Ctrl+Shift+P` → "ContextOS: Send Code to Chat"

### 4. Explain Current File
1. Open any file
2. `Ctrl+Shift+P` → "ContextOS: Explain Current File"
3. Get a detailed explanation of the entire file

### 5. Find Bugs
1. Select code (or leave empty for entire file)
2. `Ctrl+Shift+P` → "ContextOS: Find Bugs in Code"
3. Get bug analysis and suggestions

## 🎨 UI Features

### Message Actions
- **Copy Message**: Hover over any message to see the copy button
- **Copy Code**: Click the copy button in code blocks
- **Retry**: Click retry on failed messages

### Visual Feedback
- **Thinking**: Spinning indicator when processing
- **Searching**: Shows which sources are being searched
- **Typing**: Animated dots when AI is generating response
- **Status Bar**: Shows connection status and quick access

### New Chat
Click the **"New chat"** button in the header to start a fresh conversation.

## ⚙️ Configuration

### API URL
Default: `https://contextos-api-jxdr.onrender.com`

To change (e.g., for local development):
1. Open Settings (`Ctrl+,`)
2. Search for "ContextOS"
3. Update "Contextos: Api Url"
4. For local: `http://localhost:8000`

## 🐛 Troubleshooting

### Messages Not Sending?
✅ **Check:**
1. API key is set correctly (`ContextOS: Set API Key`)
2. Internet connection is active
3. API URL is correct in settings
4. Click the retry button if you see an error

### Extension Not Loading?
1. Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")
2. Check the Output panel (View → Output → ContextOS)
3. Ensure VS Code version is 1.85.0 or higher

### Conversation History Lost?
The extension saves history automatically. If you don't see it:
1. Wait a moment for the webview to load
2. Check if you clicked "New chat" by accident
3. History is stored per workspace

### Error: "No API key found"
Run `ContextOS: Set API Key` from the Command Palette and enter your key.

### Error: "Server error 401"
Your API key is invalid or expired. Set a new one.

### Error: "Network error" or "Fetch failed"
1. Check your internet connection
2. Verify the API URL in settings
3. Try the retry button
4. Check if the API server is running (for local development)

## 🚀 Pro Tips

### 1. Use Keyboard Shortcuts
- `Enter` to send message
- `Shift+Enter` for new line in message
- `Ctrl+Shift+P` for Command Palette

### 2. Context is King
When asking about code:
- Select the relevant code first
- Use "Send Code to Chat" for better context
- Mention file names and line numbers

### 3. Conversation Management
- Use "New chat" to start fresh topics
- Keep related questions in the same conversation
- History persists across sessions

### 4. Code Blocks
- All code in responses has syntax highlighting
- Click copy button to copy code
- Code is properly formatted

### 5. Multi-turn Conversations
The AI remembers your conversation:
- Ask follow-up questions
- Reference previous messages
- Build on earlier responses

## 📚 Advanced Usage

### Working with Large Files
For files over 1000 lines:
1. Select the relevant section
2. Use "Send Code to Chat"
3. Ask specific questions about that section

### Integration with Workflow
1. **Code Review**: Select code → Find Bugs
2. **Documentation**: Select function → Ask for docs
3. **Learning**: Select unfamiliar code → Ask for explanation
4. **Debugging**: Paste error → Ask for solution

### Custom Prompts
Be specific in your questions:
- ❌ "Fix this"
- ✅ "This function has a memory leak. How can I fix it?"

- ❌ "What does this do?"
- ✅ "Explain how this authentication middleware works"

## 🎓 Best Practices

1. **Be Specific**: Detailed questions get better answers
2. **Provide Context**: Use "Send Code to Chat" for code questions
3. **Use Follow-ups**: Build on previous answers
4. **Try Retry**: Network issues happen - use the retry button
5. **Start Fresh**: Use "New chat" for unrelated topics

## 📞 Need Help?

- Check the Output panel for detailed logs
- Review error messages carefully
- Use the retry button for transient errors
- Report persistent issues on GitHub

---

**Happy Coding with ContextOS! 🎉**
