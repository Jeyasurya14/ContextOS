# Change Log

All notable changes to the "ContextOS Copilot" extension will be documented in this file.

## [1.3.7] - 2026-03-28

- Production release with fully functional chat panel
- Complete rewrite of webview UI and message handling
- Fixed all `local-network-access` and CSP issues
- Reliable send button and input field operation
- Proper streaming response parsing
- Ready for VS Code Marketplace publication

## [1.3.5] - 2026-03-28

- Fixed chat panel functionality - send button and input work correctly
- Resolved webview errors: removed `localResourceRoots` causing `local-network-access` warnings
- Implemented dynamic CSP with `connect-src` for API connections
- Cleaned up debug artifacts and test files
- Production-ready build with both OpenRouter and OpenAI backend support

## [1.3.4] - 2026-03-28

- Maintenance update with webview security improvements
- Cleaned up debug artifacts from production build

## [1.3.3] - 2026-03-27

- Fixed webview CSP to include `connect-src` for API requests
- Removed deprecated `localResourceRoots` option causing `local-network-access` warnings
- Removed debug alert from webview initialization
- Resolved `Invalid regular expression` syntax error in webview

## [1.3.2] - 2026-03-27

- Production deployment with OpenRouter API integration
- Mobile responsive design improvements
- Chat UI overhaul
- Extension host performance optimizations

## [1.0.0] - 2026-03-26

- Initial release of ContextOS Copilot
- Added secure API key prompt
- Implemented streaming chat view inside the IDE
- Context-aware answers connected to Notion, Linear, Slack, Google Drive, and GitHub
