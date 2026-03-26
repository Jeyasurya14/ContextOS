import * as vscode from 'vscode';
import { ChatViewProvider } from './ChatViewProvider.js';

export function activate(context: vscode.ExtensionContext) {
    // Register the Sidebar Webview
    const provider = new ChatViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
    );

    // Command to securely store X-API-Key locally in VS Code
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.setApiKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your ContextOS API Key (ctx_...)',
                ignoreFocusOut: true,
                password: true,
            });

            if (apiKey) {
                await context.secrets.store('contextos_api_key', apiKey);
                vscode.window.showInformationMessage('ContextOS API Key saved successfully!');
            }
        })
    );

    // Command to inject highlighted code block into the sidebar
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.ask', async () => {
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
        })
    );
}
