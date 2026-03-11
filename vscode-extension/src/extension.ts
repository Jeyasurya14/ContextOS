// vscode-extension/src/extension.ts

import * as vscode from 'vscode';
import { APIClient } from './apiClient';
import { WorkspaceContextCollector } from './contextCollector';
import { SidebarProvider } from './sidebarProvider';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
    const apiClient = new APIClient(context);
    const contextCollector = new WorkspaceContextCollector();
    const sidebarProvider = new SidebarProvider(context.extensionUri, apiClient, contextCollector);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'contextos.connect';
    context.subscriptions.push(statusBarItem);

    const connectCmd = vscode.commands.registerCommand('contextos.connect', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your ContextOS API Key',
            placeHolder: 'ctx_xxxxxxxxxxxxxxxxxxxxxxxx',
            password: true,
            validateInput: (value: string) => {
                if (!value || !value.startsWith('ctx_')) {
                    return 'API key must start with "ctx_"';
                }
                return null;
            },
        });

        if (apiKey) {
            await apiClient.saveApiKey(apiKey);
            await updateStatusBar(apiClient);
            await sidebarProvider.refresh();
            vscode.window.showInformationMessage('ContextOS: API key saved successfully.');
        }
    });

    const syncCmd = vscode.commands.registerCommand('contextos.sync', async () => {
        const connected = await apiClient.isConnected();
        if (!connected) {
            vscode.window.showWarningMessage('ContextOS: Connect your API key first.');
            return;
        }

        try {
            const wsContext = contextCollector.collectAll();
            const result = await apiClient.syncWorkspace(wsContext);
            vscode.window.showInformationMessage(
                `ContextOS: Synced ${result.chunks_added} chunks from your workspace.`
            );
        } catch {
            vscode.window.showErrorMessage('ContextOS: Failed to sync workspace context.');
        }
    });

    const clearChatCmd = vscode.commands.registerCommand('contextos.clearChat', async () => {
        await sidebarProvider.sendClearChat();
    });

    context.subscriptions.push(connectCmd, syncCmd, clearChatCmd);

    updateStatusBar(apiClient);
}

async function updateStatusBar(apiClient: APIClient): Promise<void> {
    const connected = await apiClient.isConnected();
    if (connected) {
        statusBarItem.text = '$(circle-filled) ContextOS';
        statusBarItem.color = '#3fb950';
        statusBarItem.tooltip = 'ContextOS: Connected';
    } else {
        statusBarItem.text = '$(circle-outline) ContextOS: Not Connected';
        statusBarItem.color = '#8b949e';
        statusBarItem.tooltip = 'Click to connect ContextOS API key';
    }
    statusBarItem.show();
}

export function deactivate(): void {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
