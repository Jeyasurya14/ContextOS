# backend/app/core/monitoring.py

import time
from collections import defaultdict
from datetime import datetime, timezone

from loguru import logger


class MetricsCollector:
    """In-memory metrics collector for monitoring application health."""

    def __init__(self) -> None:
        """Initialize the metrics collector."""
        self._request_counts: dict[str, int] = defaultdict(int)
        self._error_counts: dict[str, int] = defaultdict(int)
        self._latencies: dict[str, list[float]] = defaultdict(list)
        self._start_time: float = time.time()

    def record_request(self, path: str, method: str, status_code: int, duration_ms: float) -> None:
        """Record a request metric."""
        key = f"{method}:{path}"
        self._request_counts[key] += 1
        self._latencies[key].append(duration_ms)
        if len(self._latencies[key]) > 1000:
            self._latencies[key] = self._latencies[key][-500:]
        if status_code >= 500:
            self._error_counts[key] += 1

    def record_error(self, path: str, error_type: str) -> None:
        """Record an error metric."""
        key = f"error:{path}:{error_type}"
        self._error_counts[key] += 1

    def get_stats(self) -> dict:
        """Get current metrics summary."""
        uptime = time.time() - self._start_time
        total_requests = sum(self._request_counts.values())
        total_errors = sum(self._error_counts.values())

        all_latencies: list[float] = []
        for lat_list in self._latencies.values():
            all_latencies.extend(lat_list)

        avg_latency = (
            sum(all_latencies) / len(all_latencies) if all_latencies else 0.0
        )
        p95_latency = (
            sorted(all_latencies)[int(len(all_latencies) * 0.95)]
            if len(all_latencies) > 20
            else avg_latency
        )

        top_endpoints = sorted(
            self._request_counts.items(), key=lambda x: x[1], reverse=True
        )[:10]

        return {
            "uptime_seconds": round(uptime, 1),
            "total_requests": total_requests,
            "total_errors": total_errors,
            "error_rate": round(total_errors / max(total_requests, 1) * 100, 2),
            "avg_latency_ms": round(avg_latency, 2),
            "p95_latency_ms": round(p95_latency, 2),
            "top_endpoints": [
                {"endpoint": ep, "count": count} for ep, count in top_endpoints
            ],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def reset(self) -> None:
        """Reset all metrics."""
        self._request_counts.clear()
        self._error_counts.clear()
        self._latencies.clear()
        self._start_time = time.time()
        logger.info("Metrics reset")


metrics = MetricsCollector()
