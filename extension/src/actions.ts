// extension/src/actions.ts
// Client-side helpers for the /api/v1/actions/* backend endpoints.
// Each command prompts the user for the minimum required inputs, calls the
// backend using the stored API key, and shows a toast with the result.

import * as vscode from 'vscode';

const API_KEY_SECRET = 'contextos_api_key';

function getApiUrl(): string {
    return vscode.workspace
        .getConfiguration('contextos')
        .get<string>('apiUrl') || 'https://contextos-api-jxdr.onrender.com';
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    const key = await context.secrets.get(API_KEY_SECRET);
    if (!key) {
        const choice = await vscode.window.showWarningMessage(
            'ContextOS API key not set. Set it now?',
            'Set API Key',
            'Cancel',
        );
        if (choice === 'Set API Key') {
            await vscode.commands.executeCommand('contextos.setApiKey');
        }
        return undefined;
    }
    return key;
}

async function apiCall<T = any>(
    context: vscode.ExtensionContext,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
): Promise<T | null> {
    const apiKey = await getApiKey(context);
    if (!apiKey) return null;

    const url = `${getApiUrl()}${path}`;
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            let message = `${response.status} ${response.statusText}`;
            try {
                const parsed = JSON.parse(detail);
                message = parsed.detail || message;
            } catch { /* noop */ }
            vscode.window.showErrorMessage(`ContextOS: ${message}`);
            return null;
        }

        return (await response.json()) as T;
    } catch (e: any) {
        vscode.window.showErrorMessage(`ContextOS: Network error — ${e?.message ?? 'unknown'}`);
        return null;
    }
}

// ── Input helpers ──────────────────────────────────────────────────────────
async function pickFromList<T extends { label: string }>(
    title: string,
    items: T[],
    placeHolder = 'Select an option',
): Promise<T | undefined> {
    if (items.length === 0) {
        vscode.window.showWarningMessage(`${title}: nothing to pick from.`);
        return undefined;
    }
    return vscode.window.showQuickPick(items, { title, placeHolder, matchOnDescription: true });
}

function openUrl(url?: string) {
    if (url) vscode.env.openExternal(vscode.Uri.parse(url));
}

// ─── GIT WORKFLOW (commit + push + open PR) ────────────────────────────────

type GitRepository = {
    rootUri: vscode.Uri;
    state: {
        HEAD?: { name?: string; upstream?: { name?: string; remote?: string } };
        workingTreeChanges: unknown[];
        indexChanges: unknown[];
        remotes: Array<{ name: string; fetchUrl?: string; pushUrl?: string }>;
    };
    add: (resources: vscode.Uri[]) => Promise<void>;
    commit: (message: string, opts?: { all?: boolean }) => Promise<void>;
    push: (remote?: string, branch?: string, setUpstream?: boolean) => Promise<void>;
};

function parseGitHubRemote(url: string): string | null {
    // Handles git@github.com:owner/repo(.git) and https://github.com/owner/repo(.git)
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
    return m ? `${m[1]}/${m[2]}` : null;
}

async function getActiveGitRepository(): Promise<GitRepository | null> {
    const gitExt = vscode.extensions.getExtension<any>('vscode.git');
    if (!gitExt) {
        vscode.window.showErrorMessage('VS Code Git extension not found.');
        return null;
    }
    const api = (gitExt.isActive ? gitExt.exports : await gitExt.activate()).getAPI(1);
    const repos: GitRepository[] = api.repositories;

    if (!repos || repos.length === 0) {
        vscode.window.showErrorMessage('No Git repository open in this workspace.');
        return null;
    }
    if (repos.length === 1) return repos[0];

    const pick = await vscode.window.showQuickPick(
        repos.map((r, i) => ({ label: r.rootUri.fsPath, _index: i })),
        { title: 'Select Git repository', placeHolder: 'Multiple repos detected' },
    );
    return pick ? repos[(pick as any)._index] : null;
}

export async function gitCommitPushOpenPR(context: vscode.ExtensionContext) {
    const repo = await getActiveGitRepository();
    if (!repo) return;

    const branch = repo.state.HEAD?.name;
    if (!branch) {
        vscode.window.showErrorMessage('Could not determine current Git branch (detached HEAD?).');
        return;
    }
    if (branch === 'main' || branch === 'master') {
        const confirm = await vscode.window.showWarningMessage(
            `You are on "${branch}". PRs usually come from feature branches. Continue anyway?`,
            'Continue', 'Cancel',
        );
        if (confirm !== 'Continue') return;
    }

    // Detect GitHub remote
    const origin = repo.state.remotes.find(r => r.name === 'origin') ?? repo.state.remotes[0];
    const remoteUrl = origin?.pushUrl || origin?.fetchUrl || '';
    const repoFullName = parseGitHubRemote(remoteUrl);
    if (!repoFullName) {
        vscode.window.showErrorMessage('Origin remote is not a GitHub repository; cannot open PR.');
        return;
    }

    const hasChanges =
        repo.state.workingTreeChanges.length > 0 || repo.state.indexChanges.length > 0;

    // Commit step (skip if nothing to commit)
    if (hasChanges) {
        const message = await vscode.window.showInputBox({
            prompt: 'Commit message',
            placeHolder: 'feat: describe what changed',
            ignoreFocusOut: true,
            validateInput: v => v.trim() ? null : 'Commit message required',
        });
        if (!message) return;
        try {
            await repo.commit(message, { all: true });
        } catch (e: any) {
            vscode.window.showErrorMessage(`Commit failed: ${e?.message ?? e}`);
            return;
        }
    }

    // PR metadata
    const title = await vscode.window.showInputBox({
        prompt: 'Pull request title',
        value: repo.state.HEAD?.name?.replace(/[-_/]/g, ' ') ?? '',
        ignoreFocusOut: true,
        validateInput: v => v.trim() ? null : 'Title required',
    });
    if (!title) return;

    const body = await vscode.window.showInputBox({
        prompt: 'Pull request description (optional)', ignoreFocusOut: true,
    });

    const base = await vscode.window.showInputBox({
        prompt: 'Base branch',
        value: 'main',
        ignoreFocusOut: true,
    });
    if (!base) return;

    // Push step
    try {
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: `Pushing ${branch}…` },
            async () => {
                const hasUpstream = !!repo.state.HEAD?.upstream;
                await repo.push('origin', branch, !hasUpstream);
            },
        );
    } catch (e: any) {
        vscode.window.showErrorMessage(`Push failed: ${e?.message ?? e}`);
        return;
    }

    // Open PR via backend
    const result = await apiCall<{ number: number; html_url: string }>(
        context, 'POST', '/api/v1/actions/github/pr',
        { repo: repoFullName, title, head: branch, base, body: body ?? '' },
    );
    if (!result) return;

    const action = await vscode.window.showInformationMessage(
        `Committed, pushed, and opened PR ${repoFullName}#${result.number}`,
        'Open in browser',
    );
    if (action === 'Open in browser') openUrl(result.html_url);
}

// ─── GITHUB ────────────────────────────────────────────────────────────────

export async function githubCreateIssue(context: vscode.ExtensionContext) {
    const repos = await apiCall<Array<{ full_name: string; description: string | null }>>(
        context, 'GET', '/api/v1/actions/github/repos',
    );
    if (!repos) return;

    const repoPick = await pickFromList(
        'GitHub · Select a repository',
        repos.map(r => ({ label: r.full_name, description: r.description ?? '' })),
    );
    if (!repoPick) return;

    const title = await vscode.window.showInputBox({
        prompt: 'Issue title',
        placeHolder: 'Bug: Login button stays disabled after OAuth',
        ignoreFocusOut: true,
        validateInput: v => v.trim() ? null : 'Title required',
    });
    if (!title) return;

    const body = await vscode.window.showInputBox({
        prompt: 'Issue body (optional, Markdown supported)',
        placeHolder: 'Steps to reproduce…',
        ignoreFocusOut: true,
    });

    const result = await apiCall<{ number: number; html_url: string }>(
        context, 'POST', '/api/v1/actions/github/issue',
        { repo: repoPick.label, title, body: body ?? '' },
    );
    if (!result) return;

    const action = await vscode.window.showInformationMessage(
        `Created ${repoPick.label}#${result.number}`,
        'Open',
    );
    if (action === 'Open') openUrl(result.html_url);
}

export async function githubCreatePR(context: vscode.ExtensionContext) {
    const repos = await apiCall<Array<{ full_name: string; default_branch: string }>>(
        context, 'GET', '/api/v1/actions/github/repos',
    );
    if (!repos) return;

    const repoPick = await pickFromList(
        'GitHub · Select a repository',
        repos.map(r => ({ label: r.full_name, description: `base: ${r.default_branch}` })),
    );
    if (!repoPick) return;

    const defaultBase = repos.find(r => r.full_name === repoPick.label)?.default_branch || 'main';

    const title = await vscode.window.showInputBox({
        prompt: 'PR title', ignoreFocusOut: true,
        validateInput: v => v.trim() ? null : 'Title required',
    });
    if (!title) return;

    const head = await vscode.window.showInputBox({
        prompt: 'Source (head) branch — the branch with your changes',
        placeHolder: 'feature/my-branch',
        ignoreFocusOut: true,
        validateInput: v => v.trim() ? null : 'Head branch required',
    });
    if (!head) return;

    const base = await vscode.window.showInputBox({
        prompt: 'Target (base) branch',
        value: defaultBase,
        ignoreFocusOut: true,
    });
    if (!base) return;

    const body = await vscode.window.showInputBox({
        prompt: 'PR description (optional)', ignoreFocusOut: true,
    });

    const result = await apiCall<{ number: number; html_url: string }>(
        context, 'POST', '/api/v1/actions/github/pr',
        { repo: repoPick.label, title, head, base, body: body ?? '' },
    );
    if (!result) return;

    const action = await vscode.window.showInformationMessage(
        `Opened PR ${repoPick.label}#${result.number}`,
        'Open',
    );
    if (action === 'Open') openUrl(result.html_url);
}

// ─── LINEAR ────────────────────────────────────────────────────────────────

export async function linearCreateIssue(context: vscode.ExtensionContext) {
    const teams = await apiCall<Array<{ id: string; key: string; name: string }>>(
        context, 'GET', '/api/v1/actions/linear/teams',
    );
    if (!teams) return;

    const teamPick = await pickFromList(
        'Linear · Select a team',
        teams.map(t => ({ label: t.name, description: t.key, _id: t.id })),
    );
    if (!teamPick) return;

    const title = await vscode.window.showInputBox({
        prompt: 'Issue title', ignoreFocusOut: true,
        validateInput: v => v.trim() ? null : 'Title required',
    });
    if (!title) return;

    const description = await vscode.window.showInputBox({
        prompt: 'Description (optional, Markdown supported)',
        ignoreFocusOut: true,
    });

    const result = await apiCall<{ identifier: string; url: string }>(
        context, 'POST', '/api/v1/actions/linear/issue',
        { team_id: (teamPick as any)._id, title, description: description ?? '' },
    );
    if (!result) return;

    const action = await vscode.window.showInformationMessage(
        `Created Linear issue ${result.identifier}`,
        'Open',
    );
    if (action === 'Open') openUrl(result.url);
}

// ─── NOTION ────────────────────────────────────────────────────────────────

export async function notionCreatePage(context: vscode.ExtensionContext) {
    const title = await vscode.window.showInputBox({
        prompt: 'Notion page title', ignoreFocusOut: true,
        validateInput: v => v.trim() ? null : 'Title required',
    });
    if (!title) return;

    // Use selected editor text as content if available
    const editor = vscode.window.activeTextEditor;
    let content = '';
    if (editor && !editor.selection.isEmpty) {
        content = editor.document.getText(editor.selection);
    } else {
        const typed = await vscode.window.showInputBox({
            prompt: 'Page content (optional). Tip: select text in editor first to auto-fill.',
            ignoreFocusOut: true,
        });
        content = typed ?? '';
    }

    const result = await apiCall<{ url: string; id: string }>(
        context, 'POST', '/api/v1/actions/notion/page',
        { title, content },
    );
    if (!result) return;

    const action = await vscode.window.showInformationMessage(
        `Notion page created`,
        'Open',
    );
    if (action === 'Open') openUrl(result.url);
}

// ─── SLACK ─────────────────────────────────────────────────────────────────

export async function slackSendMessage(context: vscode.ExtensionContext) {
    const channels = await apiCall<Array<{ id: string; name: string; is_private: boolean }>>(
        context, 'GET', '/api/v1/actions/slack/channels',
    );
    if (!channels) return;

    const channelPick = await pickFromList(
        'Slack · Select a channel',
        channels.map(c => ({
            label: `${c.is_private ? '🔒' : '#'} ${c.name}`,
            description: c.id,
            _id: c.id,
        })),
    );
    if (!channelPick) return;

    const text = await vscode.window.showInputBox({
        prompt: 'Message',
        placeHolder: 'Heads up — pushed a fix to staging',
        ignoreFocusOut: true,
        validateInput: v => v.trim() ? null : 'Message required',
    });
    if (!text) return;

    const result = await apiCall<{ ts: string }>(
        context, 'POST', '/api/v1/actions/slack/message',
        { channel: (channelPick as any)._id, text },
    );
    if (!result) return;

    vscode.window.showInformationMessage(`Sent to Slack · ${channelPick.label}`);
}
