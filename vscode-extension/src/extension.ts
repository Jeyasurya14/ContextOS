// vscode-extension/src/extension.ts

import * as vscode from 'vscode';
import { APIClient } from './apiClient';
import { WorkspaceContextCollector } from './contextCollector';
import { SidebarProvider } from './sidebarProvider';

const EXTENSION_VERSION = '1.3.7';

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

function log(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    outputChannel.appendLine(formatted);
    if (level === 'error') {
        console.error(formatted);
    } else if (level === 'warn') {
        console.warn(formatted);
    } else {
        console.log(formatted);
    }
}

export function activate(context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel('ContextOS');
    outputChannel.show();
    
    log(`ContextOS v${EXTENSION_VERSION} activating...`, 'info');

    try {
        const config = vscode.workspace.getConfiguration('contextos');
        const apiUrl = config.get<string>('apiUrl', 'https://contextos-api-jxdr.onrender.com');
        log(`API URL configured: ${apiUrl}`, 'info');

        const apiClient = new APIClient(context);
        const contextCollector = new WorkspaceContextCollector();
        const sidebarProvider = new SidebarProvider(context.extensionUri, apiClient, contextCollector);

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                SidebarProvider.viewType,
                sidebarProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            )
        );

        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBarItem.command = 'contextos.connect';
        context.subscriptions.push(statusBarItem);

        const connectCmd = vscode.commands.registerCommand('contextos.connect', async () => {
            log('Connect command invoked', 'info');
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
                try {
                    await apiClient.saveApiKey(apiKey);
                    await updateStatusBar(apiClient);
                    await sidebarProvider.refresh();
                    vscode.window.showInformationMessage('ContextOS: API key saved successfully.');
                    log('API key saved successfully', 'info');
                } catch (error) {
                    log(`Failed to save API key: ${error}`, 'error');
                    vscode.window.showErrorMessage('ContextOS: Failed to save API key.');
                }
            }
        });

        const syncCmd = vscode.commands.registerCommand('contextos.sync', async () => {
            log('Sync command invoked', 'info');
            const connected = await apiClient.isConnected();
            if (!connected) {
                vscode.window.showWarningMessage('ContextOS: Connect your API key first.');
                return;
            }

            try {
                vscode.window.showInformationMessage('ContextOS: Syncing workspace...');
                const wsContext = contextCollector.collectAll();
                log(`Collected context: ${wsContext.files.length} files`, 'info');
                const result = await apiClient.syncWorkspace(wsContext);
                vscode.window.showInformationMessage(
                    `ContextOS: Synced ${result.chunks_added} chunks from your workspace.`
                );
                log(`Sync completed: ${result.chunks_added} chunks`, 'info');
            } catch (error) {
                log(`Sync failed: ${error}`, 'error');
                vscode.window.showErrorMessage('ContextOS: Failed to sync workspace context.');
            }
        });

        const clearChatCmd = vscode.commands.registerCommand('contextos.clearChat', async () => {
            log('Clear chat command invoked', 'info');
            await sidebarProvider.sendClearChat();
        });

        const openLogsCmd = vscode.commands.registerCommand('contextos.openLogs', () => {
            outputChannel.show();
        });

        context.subscriptions.push(connectCmd, syncCmd, clearChatCmd, openLogsCmd);

        updateStatusBar(apiClient);
        log('ContextOS activated successfully', 'info');
    } catch (error) {
        log(`Activation failed: ${error}`, 'error');
        vscode.window.showErrorMessage(`ContextOS: Failed to activate - ${error}`);
    }
}

async function updateStatusBar(apiClient: APIClient): Promise<void> {
    try {
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
    } catch (error) {
        log(`Failed to update status bar: ${error}`, 'error');
    }
}

export function deactivate(): void {
    log('ContextOS deactivating...', 'info');
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
    log('ContextOS deactivated', 'info');
}
