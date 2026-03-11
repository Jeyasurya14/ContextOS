# backend/app/services/context_assembler.py

import json

from loguru import logger


class ContextAssembler:
    """Assembles retrieved context chunks into a structured prompt for the LLM."""

    MAX_CONTEXT_TOKENS = 6000

    def assemble(
        self,
        retrieved_chunks: list[dict],
        workspace_context: dict | None = None,
    ) -> str:
        """Assemble retrieved chunks and workspace context into a prompt section.

        Args:
            retrieved_chunks: List of chunk dicts from ContextRetriever.
            workspace_context: Optional workspace context from VS Code extension.

        Returns:
            A formatted context string to include in the LLM prompt.
        """
        parts: list[str] = []
        token_budget = self.MAX_CONTEXT_TOKENS

        if workspace_context:
            ws_section = self._format_workspace_context(workspace_context)
            if ws_section:
                ws_tokens = len(ws_section.split())
                if ws_tokens < token_budget // 2:
                    parts.append(ws_section)
                    token_budget -= ws_tokens

        if retrieved_chunks:
            source_groups: dict[str, list[dict]] = {}
            for chunk in retrieved_chunks:
                src = chunk.get("source_type", "unknown")
                if src not in source_groups:
                    source_groups[src] = []
                source_groups[src].append(chunk)

            for source_type, chunks in source_groups.items():
                section_header = self._source_type_header(source_type)
                section_parts: list[str] = [section_header]

                for chunk in chunks:
                    content = chunk.get("content", "")
                    tokens = len(content.split())
                    if tokens > token_budget:
                        content = " ".join(content.split()[:token_budget])
                        tokens = token_budget

                    score = chunk.get("score", 0.0)
                    source_url = chunk.get("source_url", "")
                    section_parts.append(
                        f"[relevance: {score:.2f}] {source_url}\n{content}"
                    )
                    token_budget -= tokens

                    if token_budget <= 0:
                        break

                parts.append("\n\n".join(section_parts))

                if token_budget <= 0:
                    break

        if not parts:
            return "No relevant context found."

        assembled = "\n\n---\n\n".join(parts)
        logger.info("Assembled context: {} chars, {} sections", len(assembled), len(parts))
        return assembled

    def extract_sources(self, retrieved_chunks: list[dict]) -> list[dict]:
        """Extract source citations from retrieved chunks.

        Args:
            retrieved_chunks: List of chunk dicts.

        Returns:
            List of source dicts with type, url, and score.
        """
        seen_urls: set[str] = set()
        sources: list[dict] = []

        for chunk in retrieved_chunks:
            url = chunk.get("source_url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            sources.append({
                "type": chunk.get("source_type", "unknown"),
                "url": url,
                "score": round(chunk.get("score", 0.0), 3),
            })

        return sources[:10]

    @staticmethod
    def _format_workspace_context(workspace_context: dict) -> str:
        """Format VS Code workspace context into a readable section.

        Args:
            workspace_context: Dict from VS Code extension with files, git_log, diagnostics.

        Returns:
            Formatted workspace context string.
        """
        parts: list[str] = ["## Current Workspace Context"]

        active_file = workspace_context.get("active_file")
        if active_file:
            parts.append(
                f"### Active File: {active_file.get('path', 'unknown')}\n"
                f"Language: {active_file.get('language', 'unknown')}\n"
                f"Cursor Line: {active_file.get('cursorLine', 'unknown')}\n"
                f"```\n{active_file.get('content', '')[:2000]}\n```"
            )

        files = workspace_context.get("files", [])
        if files:
            file_list = "\n".join(
                f"- {f.get('path', '')} ({f.get('language', '')})"
                for f in files[:10]
            )
            parts.append(f"### Open Files\n{file_list}")

        diagnostics = workspace_context.get("diagnostics", [])
        if diagnostics:
            diag_list = "\n".join(
                f"- {d.get('file', '')}:{d.get('line', '')} [{d.get('severity', '')}] {d.get('message', '')}"
                for d in diagnostics[:10]
            )
            parts.append(f"### Diagnostics\n{diag_list}")

        git_log = workspace_context.get("git_log", [])
        if git_log:
            log_list = "\n".join(
                f"- {g.get('hash', '')[:7]} {g.get('message', '')} ({g.get('author', '')})"
                for g in git_log[:5]
            )
            parts.append(f"### Recent Git History\n{log_list}")

        folder_structure = workspace_context.get("folderStructure", "")
        if folder_structure:
            parts.append(f"### Folder Structure\n```\n{folder_structure[:1000]}\n```")

        return "\n\n".join(parts)

    @staticmethod
    def _source_type_header(source_type: str) -> str:
        """Get a readable header for a source type."""
        headers = {
            "github_commit": "## GitHub Commits",
            "github_pr": "## GitHub Pull Requests",
            "github_issue": "## GitHub Issues",
            "notion": "## Notion Documents",
            "slack_channel": "## Slack Conversations",
            "slack_message": "## Slack Messages",
            "vscode_file": "## Workspace Files",
        }
        return headers.get(source_type, f"## {source_type}")


context_assembler = ContextAssembler()
