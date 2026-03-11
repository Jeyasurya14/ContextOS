# backend/app/services/intent_classifier.py

from loguru import logger


class IntentClassifier:
    """Classifies user queries to determine which context sources to search."""

    SOURCE_KEYWORDS = {
        "github": [
            "commit", "commits", "push", "pull request", "pr", "prs",
            "merge", "branch", "repo", "repository", "issue", "issues",
            "git", "github", "diff", "code review", "changelog",
        ],
        "notion": [
            "notion", "page", "pages", "document", "documents", "doc",
            "docs", "wiki", "knowledge base", "notes", "note",
            "database", "table", "board",
        ],
        "slack": [
            "slack", "message", "messages", "channel", "channels",
            "conversation", "conversations", "chat", "thread",
            "discussed", "said", "mentioned", "dm", "direct message",
        ],
        "vscode": [
            "file", "files", "code", "function", "class", "variable",
            "error", "bug", "warning", "diagnostic", "workspace",
            "editor", "vscode", "vs code", "current file", "open file",
            "project structure", "folder",
        ],
    }

    SOURCE_TYPE_MAP = {
        "github": ["github_commit", "github_pr", "github_issue"],
        "notion": ["notion"],
        "slack": ["slack_channel", "slack_message"],
        "vscode": ["vscode_file"],
    }

    def classify(self, query: str) -> dict:
        """Classify a user query to determine intent and relevant sources.

        Args:
            query: The user's natural language query.

        Returns:
            Dict with keys:
                sources: list of source_type strings to search
                confidence: float 0-1 indicating classification confidence
                needs_workspace: bool indicating if workspace context is needed
        """
        if not query or not query.strip():
            return {
                "sources": list(self._all_source_types()),
                "confidence": 0.0,
                "needs_workspace": False,
            }

        query_lower = query.lower()
        matched_sources: dict[str, int] = {}

        for source, keywords in self.SOURCE_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in query_lower:
                    score += 1
            if score > 0:
                matched_sources[source] = score

        if not matched_sources:
            logger.debug("No specific source matched for query, searching all")
            return {
                "sources": list(self._all_source_types()),
                "confidence": 0.3,
                "needs_workspace": self._needs_workspace(query_lower),
            }

        sorted_sources = sorted(matched_sources.items(), key=lambda x: x[1], reverse=True)
        total_keywords = sum(v for v in matched_sources.values())
        max_keywords = max(matched_sources.values())
        confidence = min(0.9, 0.4 + (max_keywords * 0.15))

        source_types: list[str] = []
        for source_name, _ in sorted_sources:
            source_types.extend(self.SOURCE_TYPE_MAP.get(source_name, []))

        logger.info(
            "Classified query sources={}, confidence={:.2f}",
            [s[0] for s in sorted_sources], confidence,
        )

        return {
            "sources": source_types,
            "confidence": confidence,
            "needs_workspace": self._needs_workspace(query_lower),
        }

    def _all_source_types(self) -> list[str]:
        """Return all possible source types."""
        types: list[str] = []
        for source_types in self.SOURCE_TYPE_MAP.values():
            types.extend(source_types)
        return types

    @staticmethod
    def _needs_workspace(query_lower: str) -> bool:
        """Determine if the query needs current workspace context."""
        workspace_signals = [
            "current", "this file", "my code", "open file", "workspace",
            "project", "here", "this function", "this class", "error in",
            "bug in", "fix", "debug", "right now",
        ]
        return any(signal in query_lower for signal in workspace_signals)


intent_classifier = IntentClassifier()
