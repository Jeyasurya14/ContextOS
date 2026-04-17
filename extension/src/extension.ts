import * as vscode from 'vscode';
import { ChatViewProvider } from './ChatViewProvider.js';
import {
    githubCreateIssue,
    githubCreatePR,
    linearCreateIssue,
    notionCreatePage,
    slackSendMessage,
    gitCommitPushOpenPR,
} from './actions.js';

export function activate(context: vscode.ExtensionContext) {
    console.log('[ContextOS] Extension activated — v2.2.0');

    // ── Sidebar Webview ──────────────────────────────────────────────────────
    const provider = new ChatViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
    );

    // ── Status bar ───────────────────────────────────────────────────────────
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(hubot) ContextOS';
    statusBarItem.tooltip = 'Click to open ContextOS Assistant';
    statusBarItem.command = 'contextos.chatView.focus';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // ── Helper: update status bar ─────────────────────────────────────────────
    const flashStatus = (text: string, duration = 3000) => {
        statusBarItem.text = text;
        setTimeout(() => { statusBarItem.text = '$(hubot) ContextOS'; }, duration);
    };

    // ────────────────────────────────────────────────────────────────────────
    // Commands
    // ────────────────────────────────────────────────────────────────────────

    // 1. Set API Key
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.setApiKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your ContextOS API Key (ctx_...)',
                ignoreFocusOut: true,
                password: true,
                placeHolder: 'ctx_xxxxxxxxxxxxxxxx',
                validateInput: (value) => {
                    if (!value) return 'API key cannot be empty';
                    if (!value.startsWith('ctx_')) return 'API key must start with "ctx_"';
                    if (value.length < 20) return 'API key seems too short';
                    return null;
                }
            });

            if (apiKey) {
                await context.secrets.store('contextos_api_key', apiKey);
                vscode.window.showInformationMessage('✅ ContextOS API Key saved! The extension is ready.');
                flashStatus('$(hubot) ContextOS ✓');
                // Notify the webview the key is set so it can hide the onboarding banner
                provider.notifyKeySet();
            }
        })
    );

    // 2. Send selected code to chat
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.ask', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText) {
                vscode.window.showInformationMessage('Please select some code first.');
                return;
            }

            await vscode.commands.executeCommand('contextos.chatView.focus');

            const fileName = editor.document.fileName.split(/[\\/]/).pop() ?? editor.document.fileName;
            const languageId = editor.document.languageId;
            const lineStart = selection.start.line + 1;
            const lineEnd = selection.end.line + 1;
            const ctx = `File: \`${fileName}\` (Lines ${lineStart}-${lineEnd})\n\n\`\`\`${languageId}\n${selectedText}\n\`\`\``;
            provider.sendContextToChat(ctx);
        })
    );

    // 3. Explain current file
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.explainFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            await vscode.commands.executeCommand('contextos.chatView.focus');

            const fileName = editor.document.fileName.split(/[\\/]/).pop() ?? editor.document.fileName;
            const fileContent = editor.document.getText();
            const languageId = editor.document.languageId;
            const ctx = `Explain this ${languageId} file:\n\nFile: \`${fileName}\`\n\n\`\`\`${languageId}\n${fileContent}\n\`\`\``;
            provider.sendContextToChat(ctx);
        })
    );

    // 4. Find bugs
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.findBugs', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            await vscode.commands.executeCommand('contextos.chatView.focus');

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            const fileName = editor.document.fileName.split(/[\\/]/).pop() ?? editor.document.fileName;
            const languageId = editor.document.languageId;
            const codeToAnalyze = selectedText || editor.document.getText();
            const scope = selectedText ? 'selected code' : 'entire file';
            const ctx = `Find bugs and potential issues in this ${scope}:\n\nFile: \`${fileName}\`\n\n\`\`\`${languageId}\n${codeToAnalyze}\n\`\`\``;
            provider.sendContextToChat(ctx);
        })
    );

    // 5. Clear cache
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.clearCache', async () => {
            await provider.clearCache();
            vscode.window.showInformationMessage('🗑️ ContextOS cache cleared.');
            flashStatus('$(hubot) ContextOS — cache cleared');
        })
    );

    // 6. Show stats
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.showStats', async () => {
            const stats = provider.getStats();
            const apiKey = await context.secrets.get('contextos_api_key');
            const config = vscode.workspace.getConfiguration('contextos');
            const apiUrl = config.get<string>('apiUrl') || 'https://contextos-api-jxdr.onrender.com';

            const items: vscode.QuickPickItem[] = [
                { label: '$(hubot) ContextOS Stats', kind: vscode.QuickPickItemKind.Separator },
                { label: `$(server) API`, description: apiUrl },
                { label: `$(key) API Key`, description: apiKey ? `Active (${apiKey.slice(0, 12)}…)` : '⚠️ Not set — run "ContextOS: Set API Key"' },
                { label: `$(comment-discussion) Messages`, description: `${stats.messages} in history` },
                { label: `$(pulse) Rate Limit`, description: `${stats.rateLimitRemaining} requests remaining` },
                { label: `$(database) Cache`, description: `${stats.cacheSize} entries` },
                { label: `$(circle-outline) Circuit`, description: stats.circuitState },
                { label: `$(heart) Health`, description: stats.health },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                { label: '$(gear) Open Settings', description: 'Configure ContextOS' },
            ];

            const pick = await vscode.window.showQuickPick(items, {
                title: 'ContextOS — Status & Stats',
                placeHolder: 'Select an option',
            });

            if (pick?.label === '$(gear) Open Settings') {
                vscode.commands.executeCommand('contextos.openSettings');
            }
        })
    );

    // 7. Open settings
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.openSettings', () => {
            vscode.commands.executeCommand(
                'workbench.action.openSettings',
                '@ext:JeyaSuryaM.contextos-copilot'
            );
        })
    );

    // ── Integration action commands ────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.github.createIssue', () => githubCreateIssue(context)),
        vscode.commands.registerCommand('contextos.github.createPR', () => githubCreatePR(context)),
        vscode.commands.registerCommand('contextos.linear.createIssue', () => linearCreateIssue(context)),
        vscode.commands.registerCommand('contextos.notion.createPage', () => notionCreatePage(context)),
        vscode.commands.registerCommand('contextos.slack.sendMessage', () => slackSendMessage(context)),
        vscode.commands.registerCommand('contextos.git.commitPushPR', () => gitCommitPushOpenPR(context)),
    );

    // Meta command: pick any integration action from one palette entry
    context.subscriptions.push(
        vscode.commands.registerCommand('contextos.actions', async () => {
            const pick = await vscode.window.showQuickPick(
                [
                    { label: '$(git-pull-request) GitHub: Create Issue',       command: 'contextos.github.createIssue' },
                    { label: '$(git-merge) GitHub: Create Pull Request',       command: 'contextos.github.createPR' },
                    { label: '$(rocket) Git: Commit, Push & Open PR',          command: 'contextos.git.commitPushPR' },
                    { label: '$(checklist) Linear: Create Issue',              command: 'contextos.linear.createIssue' },
                    { label: '$(notebook) Notion: Create Page',                command: 'contextos.notion.createPage' },
                    { label: '$(comment) Slack: Send Message',                 command: 'contextos.slack.sendMessage' },
                ],
                { title: 'ContextOS Actions', placeHolder: 'Run a workflow against a connected integration' },
            );
            if (pick) vscode.commands.executeCommand((pick as any).command);
        }),
    );

    // ── Config change listener ────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('contextos')) {
                provider.reloadConfig();
                console.log('[ContextOS] Configuration reloaded');
            }
        })
    );

    console.log('[ContextOS] All commands registered successfully');
}

export function deactivate() {
    console.log('[ContextOS] Extension deactivated');
}
