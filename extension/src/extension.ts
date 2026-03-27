import * as vscode from 'vscode';
import { ChatViewProvider } from './ChatViewProvider.js';

export function activate(context: vscode.ExtensionContext) {
    console.log('ContextOS extension is now active!');
    
    // Register the Sidebar Webview
    const provider = new ChatViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
    );

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(hubot) ContextOS';
    statusBarItem.tooltip = 'Click to open ContextOS Assistant';
    statusBarItem.command = 'contextos.chatView.focus';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Command to securely store X-API-Key locally in VS Code
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.setApiKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your ContextOS API Key (ctx_...)',
                ignoreFocusOut: true,
                password: true,
                placeHolder: 'ctx_xxxxxxxxxxxxxxxx',
                validateInput: (value) => {
                    if (!value) {
                        return 'API key cannot be empty';
                    }
                    if (!value.startsWith('ctx_')) {
                        return 'API key should start with "ctx_"';
                    }
                    return null;
                }
            });

            if (apiKey) {
                await context.secrets.store('contextos_api_key', apiKey);
                vscode.window.showInformationMessage('✅ ContextOS API Key saved successfully!');
                statusBarItem.text = '$(hubot) ContextOS ✓';
                setTimeout(() => {
                    statusBarItem.text = '$(hubot) ContextOS';
                }, 3000);
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
                const languageId = editor.document.languageId;
                
                // Focus the sidebar if it's not open
                await vscode.commands.executeCommand('contextos.chatView.focus');
                
                if (selectedText) {
                    const lineStart = selection.start.line + 1;
                    const lineEnd = selection.end.line + 1;
                    const context = `File: \`${fileName}\` (Lines ${lineStart}-${lineEnd})\n\n\`\`\`${languageId}\n${selectedText}\n\`\`\``;
                    provider.sendContextToChat(context);
                } else {
                    vscode.window.showInformationMessage('Please select some code first');
                }
            }
        })
    );

    // Command to explain current file
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.explainFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const fileName = editor.document.fileName;
                const fileContent = editor.document.getText();
                const languageId = editor.document.languageId;
                
                await vscode.commands.executeCommand('contextos.chatView.focus');
                
                const context = `Explain this ${languageId} file:\n\nFile: \`${fileName}\`\n\n\`\`\`${languageId}\n${fileContent}\n\`\`\``;
                provider.sendContextToChat(context);
            }
        })
    );

    // Command to find bugs in selection or file
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.findBugs', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const selection = editor.selection;
                const selectedText = editor.document.getText(selection);
                const fileName = editor.document.fileName;
                const languageId = editor.document.languageId;
                
                await vscode.commands.executeCommand('contextos.chatView.focus');
                
                const codeToAnalyze = selectedText || editor.document.getText();
                const scope = selectedText ? 'selected code' : 'entire file';
                const context = `Find potential bugs and issues in this ${scope}:\n\nFile: \`${fileName}\`\n\n\`\`\`${languageId}\n${codeToAnalyze}\n\`\`\``;
                provider.sendContextToChat(context);
            }
        })
    );
}

export function deactivate() {
    console.log('ContextOS extension is now deactivated');
}
