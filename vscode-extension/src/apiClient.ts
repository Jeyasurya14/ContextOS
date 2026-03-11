// vscode-extension/src/apiClient.ts

import * as vscode from 'vscode';
import axios from 'axios';
import { WorkspaceContext } from './contextCollector';

export interface StreamEvent {
    event: 'thinking' | 'searching' | 'token' | 'sources' | 'done' | 'error';
    message?: string;
    content?: string;
    source?: string;
    count?: number;
    sources?: Array<{ type: string; url: string; score: number }>;
    conversation_id?: string;
}

export class APIClient {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private getApiUrl(): string {
        const config = vscode.workspace.getConfiguration('contextos');
        return config.get<string>('apiUrl', 'http://localhost:8000');
    }

    async saveApiKey(key: string): Promise<void> {
        await this.context.secrets.store('contextos-api-key', key);
    }

    async getApiKey(): Promise<string | undefined> {
        return await this.context.secrets.get('contextos-api-key');
    }

    async clearApiKey(): Promise<void> {
        await this.context.secrets.delete('contextos-api-key');
    }

    async isConnected(): Promise<boolean> {
        const key = await this.getApiKey();
        return !!key && key.startsWith('ctx_');
    }

    async *sendQuery(
        question: string,
        context: WorkspaceContext
    ): AsyncGenerator<StreamEvent> {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            yield { event: 'error', message: 'No API key configured. Run "ContextOS: Connect API Key" first.' };
            return;
        }

        const apiUrl = this.getApiUrl();

        try {
            const response = await axios.post(
                `${apiUrl}/api/v1/query`,
                {
                    question,
                    workspace_context: context,
                    stream: true,
                },
                {
                    headers: {
                        'X-API-Key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'stream',
                    timeout: 120000,
                }
            );

            const stream = response.data;
            let buffer = '';

            for await (const chunk of stream) {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: ')) {
                        continue;
                    }

                    const jsonStr = trimmed.substring(6);
                    if (!jsonStr) {
                        continue;
                    }

                    try {
                        const event: StreamEvent = JSON.parse(jsonStr);
                        yield event;
                    } catch {
                        continue;
                    }
                }
            }

            if (buffer.trim().startsWith('data: ')) {
                const jsonStr = buffer.trim().substring(6);
                try {
                    const event: StreamEvent = JSON.parse(jsonStr);
                    yield event;
                } catch {
                    // ignore incomplete final chunk
                }
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    yield { event: 'error', message: 'Invalid API key. Please reconnect.' };
                } else if (error.code === 'ECONNREFUSED') {
                    yield { event: 'error', message: 'Cannot connect to ContextOS server. Is it running?' };
                } else {
                    yield { event: 'error', message: `API error: ${error.message}` };
                }
            } else {
                yield { event: 'error', message: 'An unexpected error occurred.' };
            }
        }
    }

    async syncWorkspace(context: WorkspaceContext): Promise<{ chunks_added: number }> {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            throw new Error('No API key configured');
        }

        const apiUrl = this.getApiUrl();

        const response = await axios.post(
            `${apiUrl}/api/v1/context/sync`,
            {
                files: context.files,
                git_log: context.gitLog,
                diagnostics: context.diagnostics,
                folderStructure: context.folderStructure,
            },
            {
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }
        );

        return response.data;
    }
}
