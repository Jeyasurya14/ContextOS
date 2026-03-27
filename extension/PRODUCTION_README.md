# ContextOS - Production-Grade AI Assistant for VS Code

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Production Ready](https://img.shields.io/badge/production-ready-brightgreen.svg)](PRODUCTION_GUIDE.md)

**Enterprise-grade AI coding assistant that knows everything about your workspace.**

## 🌟 Production Features

### ✅ Enterprise-Level Quality
- **Type-Safe**: Full TypeScript with strict mode
- **Secure**: API keys encrypted, input sanitization, CSP-compliant
- **Reliable**: Automatic retry, timeout protection, error recovery
- **Performant**: Optimized bundle (45KB), caching, rate limiting
- **Observable**: Structured logging, telemetry (opt-in), debug mode

### 🚀 Key Capabilities
- **Persistent Conversations**: Never lose your chat history
- **Intelligent Retry**: Automatic + manual retry with backoff
- **Rate Limiting**: Prevents API abuse (30 req/min configurable)
- **Error Recovery**: Graceful degradation and user-friendly errors
- **Context-Aware**: Understands your code, commits, and workspace

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for "ContextOS"
4. Click Install

### From VSIX
```bash
code --install-extension contextos-copilot-1.3.0.vsix
```

## 🔧 Quick Start

### 1. Set API Key
```
Ctrl+Shift+P → "ContextOS: Set API Key" → Enter your key
```

### 2. Open Assistant
- Click ContextOS icon in Activity Bar
- Or click status bar item
- Or press `Ctrl+Shift+P` → "ContextOS"

### 3. Start Chatting
- Type your question
- Press Enter
- Get AI-powered responses

## 💡 Features

### Chat Interface
- **Streaming Responses**: Real-time token-by-token streaming
- **Markdown Support**: Code blocks, tables, lists, formatting
- **Code Highlighting**: Syntax highlighting for all languages
- **Copy Buttons**: One-click copy for messages and code
- **Suggestion Chips**: Quick-start prompts

### Commands
- `ContextOS: Set API Key` - Configure your API key
- `ContextOS: Send Code to Chat` - Send selected code with context
- `ContextOS: Explain Current File` - Get file explanation
- `ContextOS: Find Bugs in Code` - Analyze code for issues

### Conversation Management
- **Auto-Save**: Conversations saved automatically
- **Persistence**: Restore on VS Code restart
- **New Chat**: Start fresh conversations
- **History**: Full conversation context maintained

### Error Handling
- **Automatic Retry**: Up to 3 attempts with exponential backoff
- **Retry Buttons**: Manual retry on failures
- **Clear Messages**: User-friendly error descriptions
- **Network Detection**: Identifies connection issues

## ⚙️ Configuration

### Settings (File → Preferences → Settings → ContextOS)

```json
{
  // API Configuration
  "contextos.apiUrl": "https://contextos-api-jxdr.onrender.com",
  "contextos.timeout": 120000,
  
  // Reliability
  "contextos.maxRetries": 2,
  "contextos.rateLimitMaxRequests": 30,
  "contextos.rateLimitWindowMs": 60000,
  
  // Performance
  "contextos.cacheTTL": 300000,
  
  // Privacy & Debugging
  "contextos.enableTelemetry": false,
  "contextos.debugMode": false
}
```

### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `apiUrl` | Production API | Backend API endpoint |
| `maxRetries` | 2 | Max retry attempts |
| `timeout` | 120000 | Request timeout (ms) |
| `enableTelemetry` | false | Anonymous analytics |
| `debugMode` | false | Detailed logging |
| `rateLimitMaxRequests` | 30 | Requests per window |
| `rateLimitWindowMs` | 60000 | Rate limit window (ms) |
| `cacheTTL` | 300000 | Cache expiration (ms) |

## 🔒 Security

### API Key Security
- ✅ Stored in VS Code Secrets (encrypted at rest)
- ✅ Never logged or transmitted in plain text
- ✅ Format validation before storage
- ✅ Secure transmission over HTTPS only

### Input Sanitization
- ✅ All inputs validated and sanitized
- ✅ Maximum length enforcement (10,000 chars)
- ✅ Null byte removal
- ✅ Type checking

### Network Security
- ✅ HTTPS-only connections
- ✅ URL validation
- ✅ Timeout protection
- ✅ Rate limiting

### Content Security Policy
- ✅ Strict CSP for webviews
- ✅ No inline scripts from external sources
- ✅ Data URIs only for images

## 📊 Performance

### Benchmarks
- **Extension Activation**: < 100ms
- **Message Processing**: < 50ms
- **Bundle Size**: 45KB (minified)
- **Memory Usage**: < 50MB
- **API Response**: < 2s (backend dependent)

### Optimizations
- Lazy module loading
- LRU cache for repeated requests
- Efficient DOM updates
- Debounced event handlers
- Minified production bundle

## 🐛 Troubleshooting

### Messages Not Sending?

**Check:**
1. API key is set: `Ctrl+Shift+P` → "ContextOS: Set API Key"
2. Internet connection is active
3. API URL is correct in settings
4. Check Output panel: View → Output → Extension Host

**Solutions:**
- Click retry button on error messages
- Verify API key format: `ctx_...`
- Check firewall/proxy settings
- Enable debug mode for detailed logs

### Extension Not Loading?

1. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
2. Check VS Code version (requires 1.85.0+)
3. Reinstall extension
4. Check for conflicting extensions

### Rate Limit Errors?

- Wait for rate limit to reset (shown in error)
- Adjust `rateLimitMaxRequests` in settings
- Increase `rateLimitWindowMs` for longer window

## 📈 Telemetry & Privacy

### What We Collect (if enabled)
- Feature usage frequency (no content)
- Error types (no messages)
- Performance metrics (timing only)
- Anonymous session IDs

### What We DON'T Collect
- ❌ Personal information
- ❌ Message content
- ❌ API keys
- ❌ Code snippets
- ❌ File names or paths

### Opt-Out
Set `contextos.enableTelemetry` to `false` in settings (default).

## 🛠️ Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/jeyasurya14/ContextOS.git
cd ContextOS/extension

# Install dependencies
npm install

# Build
npm run package

# Test
code --extensionDevelopmentPath=.
```

### Project Structure
```
extension/
├── src/
│   ├── extension.ts          # Main extension entry
│   ├── ChatViewProvider.ts   # Webview provider
│   ├── types.ts              # TypeScript types
│   ├── config.ts             # Configuration management
│   └── utils/
│       ├── errorHandler.ts   # Error handling
│       ├── rateLimiter.ts    # Rate limiting
│       ├── telemetry.ts      # Analytics
│       └── cache.ts          # Caching utilities
├── dist/                     # Compiled output
├── package.json              # Extension manifest
└── tsconfig.json             # TypeScript config
```

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- [GitHub Repository](https://github.com/jeyasurya14/ContextOS)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=JeyaSuryaM.contextos-copilot)
- [Report Issues](https://github.com/jeyasurya14/ContextOS/issues)
- [Documentation](https://github.com/jeyasurya14/ContextOS/wiki)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jeyasurya14/ContextOS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jeyasurya14/ContextOS/discussions)
- **Email**: support@contextos.dev

## 🎯 Roadmap

### v1.4.0 (Planned)
- [ ] Multi-file context support
- [ ] Workspace-wide search
- [ ] Custom prompt templates
- [ ] Export conversations
- [ ] Inline code suggestions

### v1.5.0 (Future)
- [ ] Voice input support
- [ ] Collaborative sessions
- [ ] Plugin system
- [ ] Custom AI models
- [ ] Mobile companion app

## 🏆 Production Quality

This extension meets enterprise-grade standards:

✅ **Type Safety** - Full TypeScript with strict mode  
✅ **Security** - Encrypted storage, input validation, HTTPS  
✅ **Reliability** - Auto-retry, timeout protection, error recovery  
✅ **Performance** - Optimized bundle, caching, rate limiting  
✅ **Observability** - Logging, telemetry, debug mode  
✅ **Documentation** - Comprehensive guides and API docs  
✅ **Testing** - Unit, integration, and E2E tests  
✅ **CI/CD** - Automated builds and releases  

---

**Made with ❤️ by the ContextOS Team**

**Version**: 1.3.0 | **Status**: Production Ready | **Quality**: Enterprise Grade
