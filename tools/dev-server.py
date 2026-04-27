#!/usr/bin/env python3
"""
VOXEN dev server — replacement for `python3 -m http.server`.

Why: Python's built-in http.server serves `.md` and other text files
without a UTF-8 charset header, so browsers display Chinese as 亂碼.
This server sets `charset=utf-8` for all text-like files.

Usage:
    cd ~/VOXEN
    python3 tools/dev-server.py             # port 8000
    python3 tools/dev-server.py 8080        # custom port

Then open: http://localhost:8000/docs/platform-dashboard.html
"""

import http.server
import socketserver
import sys
import os


# Map file extensions → Content-Type with explicit utf-8 charset
UTF8_TYPES = {
    ".md":   "text/markdown; charset=utf-8",
    ".txt":  "text/plain; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".htm":  "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".mjs":  "application/javascript; charset=utf-8",
    ".svg":  "image/svg+xml; charset=utf-8",
    ".xml":  "application/xml; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml":  "text/yaml; charset=utf-8",
    ".ts":   "text/plain; charset=utf-8",
    ".tsx":  "text/plain; charset=utf-8",
    ".sh":   "text/plain; charset=utf-8",
    ".py":   "text/plain; charset=utf-8",
}


class UTF8Handler(http.server.SimpleHTTPRequestHandler):
    """Serves all text-like files with explicit utf-8 charset."""

    # Override the extensions_map class attribute
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **UTF8_TYPES,
    }

    def end_headers(self):
        # Disable caching so iterations show up immediately
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        # Quieter log output
        sys.stderr.write(
            f"\033[90m[{self.log_date_time_string()}]\033[0m {format % args}\n"
        )


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = UTF8Handler

    cwd = os.getcwd()
    print(f"\n  📡 VOXEN dev server")
    print(f"  📁 Serving:  {cwd}")
    print(f"  🌐 URL:      http://localhost:{port}/")
    print(f"  📄 Dashboard: http://localhost:{port}/docs/platform-dashboard.html")
    print(f"\n  ⌨  Ctrl+C to stop\n")

    with socketserver.TCPServer(("", port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Bye 👋\n")


if __name__ == "__main__":
    main()
