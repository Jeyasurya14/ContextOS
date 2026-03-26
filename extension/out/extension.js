"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const ChatViewProvider_js_1 = require("./ChatViewProvider.js");
function activate(context) {
    // Register the Sidebar Webview
    const provider = new ChatViewProvider_js_1.ChatViewProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatViewProvider_js_1.ChatViewProvider.viewType, provider));
    // Command to securely store X-API-Key locally in VS Code
    context.subscriptions.push(vscode.commands.registerCommand('contextos.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your ContextOS API Key (ctx_...)',
            ignoreFocusOut: true,
            password: true,
        });
        if (apiKey) {
            await context.secrets.store('contextos_api_key', apiKey);
            vscode.window.showInformationMessage('ContextOS API Key saved successfully!');
        }
    }));
    // Command to inject highlighted code block into the sidebar
    context.subscriptions.push(vscode.commands.registerCommand('contextos.ask', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            const fileName = editor.document.fileName;
            // Focus the sidebar if it's not open
            await vscode.commands.executeCommand('contextos.chatView.focus');
            if (selectedText) {
                provider.sendContextToChat(`File: \`${fileName}\`\n\n\`\`\`\n${selectedText}\n\`\`\``);
            }
        }
    }));
}
//# sourceMappingURL=extension.js.map