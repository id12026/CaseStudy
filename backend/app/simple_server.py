from __future__ import annotations

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from .artifacts import load_artifacts
from .config import ARTIFACT_FILE, FRONTEND_DIR


def frontend_root() -> Path:
    dist = FRONTEND_DIR / "dist"
    return dist if (dist / "index.html").exists() else FRONTEND_DIR


class ForecastRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path) -> None:
        if not path.exists() or not path.is_file():
            self._send_json({"detail": "Not found"}, status=404)
            return
        body = path.read_bytes()
        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _artifacts(self) -> dict | None:
        return load_artifacts(ARTIFACT_FILE)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        route = unquote(parsed.path)
        payload = self._artifacts()

        if route == "/api/health":
            self._send_json({"status": "ok", "artifacts_ready": ARTIFACT_FILE.exists()})
            return

        if route == "/api/summary":
            if not payload:
                self._send_json({"detail": "No forecast artifacts found."}, status=404)
                return
            self._send_json(
                {
                    "generated_at": payload["generated_at"],
                    "summary": payload["summary"],
                    "model_counts": payload.get("model_counts", {}),
                    "run_status_counts": payload.get("run_status_counts", {}),
                }
            )
            return

        if route == "/api/states":
            if not payload:
                self._send_json({"detail": "No forecast artifacts found."}, status=404)
                return
            self._send_json({"states": sorted(payload["states"].keys())})
            return

        if route.startswith("/api/forecast/"):
            if not payload:
                self._send_json({"detail": "No forecast artifacts found."}, status=404)
                return
            state = route.replace("/api/forecast/", "", 1)
            state_payload = payload["states"].get(state)
            if not state_payload:
                self._send_json({"detail": f"State not found: {state}"}, status=404)
                return
            self._send_json(state_payload)
            return

        if route == "/api/model-comparison":
            if not payload:
                self._send_json({"detail": "No forecast artifacts found."}, status=404)
                return
            rows = []
            for state, state_payload in payload["states"].items():
                for run in state_payload["comparison"]:
                    rows.append(
                        {
                            "state": state,
                            "model_name": run["model_name"],
                            "status": run["status"],
                            "mae": run["metrics"].get("mae"),
                            "rmse": run["metrics"].get("rmse"),
                            "mape": run["metrics"].get("mape"),
                            "smape": run["metrics"].get("smape"),
                            "is_best": run["model_name"] == state_payload["best_model"],
                            "error": run.get("error"),
                        }
                    )
            self._send_json({"rows": rows})
            return

        if route == "/":
            self._send_file(frontend_root() / "index.html")
            return

        root = frontend_root().resolve()
        requested = (root / route.lstrip("/")).resolve()
        if requested.exists() and root in requested.parents:
            self._send_file(requested)
            return
        self._send_file(root / "index.html")

    def do_POST(self) -> None:  # noqa: N802
        if urlparse(self.path).path == "/api/train":
            self._send_json(
                {
                    "status": "not_available",
                    "message": "Use FastAPI/uvicorn or python backend/scripts/train.py for training.",
                },
                status=501,
            )
            return
        self._send_json({"detail": "Not found"}, status=404)


def run(host: str = "127.0.0.1", port: int = 8000) -> None:
    server = ThreadingHTTPServer((host, port), ForecastRequestHandler)
    print(f"Serving dashboard at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
