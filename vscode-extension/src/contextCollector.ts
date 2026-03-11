// vscode-extension/src/contextCollector.ts

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface FileInfo {
    path: string;
    content: string;
    language: string;
    isActive: boolean;
}

interface GitLogEntry {
    hash: string;
    message: string;
    author: string;
    date: string;
    diff: string;
}

interface DiagnosticEntry {
    file: string;
    line: number;
    severity: string;
    message: string;
}

interface ActiveFileInfo {
    path: string;
    content: string;
    language: string;
    cursorLine: number;
}

export interface WorkspaceContext {
    files: FileInfo[];
    folderStructure: string;
    gitLog: GitLogEntry[];
    diagnostics: DiagnosticEntry[];
    activeFile: ActiveFileInfo | null;
}

const EXCLUDED_PATTERNS = [
    'node_modules', '.git', 'venv', '__pycache__',
    'dist', 'build', '.next', '.venv', 'env',
    '.mypy_cache', '.pytest_cache', '.tox',
];

const MAX_FILES = 20;
const MAX_FILE_SIZE = 50 * 1024;

export class WorkspaceContextCollector {
    /**
     * Collect all workspace context: open files, folder structure, git log,
     * diagnostics, and active file info.
     */
    collectAll(): WorkspaceContext {
        return {
            files: this.collectOpenFiles(),
            folderStructure: this.collectFolderStructure(),
            gitLog: this.collectGitLog(),
            diagnostics: this.collectDiagnostics(),
            activeFile: this.collectActiveFile(),
        };
    }

    private collectOpenFiles(): FileInfo[] {
        const files: FileInfo[] = [];
        const activeEditor = vscode.window.activeTextEditor;

        for (const doc of vscode.workspace.textDocuments) {
            if (files.length >= MAX_FILES) {
                break;
            }

            if (doc.uri.scheme !== 'file') {
                continue;
            }

            const filePath = doc.uri.fsPath;
            if (this.isExcluded(filePath)) {
                continue;
            }

            const content = doc.getText();
            if (content.length > MAX_FILE_SIZE) {
                continue;
            }

            files.push({
                path: vscode.workspace.asRelativePath(doc.uri),
                content: content,
                language: doc.languageId,
                isActive: activeEditor?.document.uri.fsPath === filePath,
            });
        }

        return files;
    }

    private collectFolderStructure(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return '';
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const lines: string[] = [];

        try {
            this.buildTree(rootPath, '', 0, 2, lines);
        } catch {
            return '';
        }

        return lines.join('\n');
    }

    private buildTree(
        dirPath: string,
        prefix: string,
        depth: number,
        maxDepth: number,
        lines: string[]
    ): void {
        if (depth > maxDepth || lines.length > 200) {
            return;
        }

        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dirPath, { withFileTypes: true });
        } catch {
            return;
        }

        const filtered = entries.filter(
            (e) => !EXCLUDED_PATTERNS.includes(e.name) && !e.name.startsWith('.')
        );

        filtered.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) { return -1; }
            if (!a.isDirectory() && b.isDirectory()) { return 1; }
            return a.name.localeCompare(b.name);
        });

        for (let i = 0; i < filtered.length; i++) {
            const entry = filtered[i];
            const isLast = i === filtered.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const childPrefix = isLast ? '    ' : '│   ';

            if (entry.isDirectory()) {
                lines.push(`${prefix}${connector}${entry.name}/`);
                this.buildTree(
                    path.join(dirPath, entry.name),
                    prefix + childPrefix,
                    depth + 1,
                    maxDepth,
                    lines
                );
            } else {
                lines.push(`${prefix}${connector}${entry.name}`);
            }
        }
    }

    private collectGitLog(): GitLogEntry[] {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [];
        }

        const cwd = workspaceFolders[0].uri.fsPath;

        try {
            const logOutput = execSync(
                'git log --oneline -10 --format="%H|%s|%an|%ai"',
                { cwd, encoding: 'utf-8', timeout: 5000 }
            ).trim();

            if (!logOutput) {
                return [];
            }

            const entries: GitLogEntry[] = [];

            for (const line of logOutput.split('\n')) {
                const parts = line.split('|');
                if (parts.length < 4) {
                    continue;
                }

                const hash = parts[0];
                const message = parts[1];
                const author = parts[2];
                const date = parts[3];

                let diff = '';
                try {
                    diff = execSync(
                        `git diff --stat ${hash}^..${hash}`,
                        { cwd, encoding: 'utf-8', timeout: 3000 }
                    ).trim();
                    if (diff.length > 500) {
                        diff = diff.substring(0, 500);
                    }
                } catch {
                    diff = '';
                }

                entries.push({ hash, message, author, date, diff });
            }

            return entries;
        } catch {
            return [];
        }
    }

    private collectDiagnostics(): DiagnosticEntry[] {
        const diagnostics: DiagnosticEntry[] = [];
        const allDiagnostics = vscode.languages.getDiagnostics();

        for (const [uri, diags] of allDiagnostics) {
            if (diagnostics.length >= 20) {
                break;
            }

            for (const diag of diags) {
                if (diagnostics.length >= 20) {
                    break;
                }

                if (
                    diag.severity !== vscode.DiagnosticSeverity.Error &&
                    diag.severity !== vscode.DiagnosticSeverity.Warning
                ) {
                    continue;
                }

                diagnostics.push({
                    file: vscode.workspace.asRelativePath(uri),
                    line: diag.range.start.line + 1,
                    severity: diag.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
                    message: diag.message,
                });
            }
        }

        return diagnostics;
    }

    private collectActiveFile(): ActiveFileInfo | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }

        const doc = editor.document;
        if (doc.uri.scheme !== 'file') {
            return null;
        }

        const content = doc.getText();
        if (content.length > MAX_FILE_SIZE) {
            return {
                path: vscode.workspace.asRelativePath(doc.uri),
                content: content.substring(0, MAX_FILE_SIZE),
                language: doc.languageId,
                cursorLine: editor.selection.active.line + 1,
            };
        }

        return {
            path: vscode.workspace.asRelativePath(doc.uri),
            content: content,
            language: doc.languageId,
            cursorLine: editor.selection.active.line + 1,
        };
    }

    private isExcluded(filePath: string): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return EXCLUDED_PATTERNS.some((pattern) => normalizedPath.includes(`/${pattern}/`));
    }
}
