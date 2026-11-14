"""A tiny local receiver for render.html: it saves each finished picture into assets/previews.

Run it from the project folder, then open render.html in a browser served from the local site:

    python scripts/preview-images/receive.py
    http://localhost:8765/scripts/preview-images/render.html

Only writes the four known file names, only from this machine. Stop it with Ctrl+C when done."""
import base64
import http.server
import os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'previews')
NAMES = {'tool-en.jpg', 'tool-ar.jpg', 'plan-en.jpg', 'plan-ar.jpg'}


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        name = self.path.strip('/').split('?')[0]
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('ascii', 'ignore')
        if name not in NAMES or ',' not in body:
            self.send_response(400)
            self._cors()
            self.end_headers()
            return
        data = base64.b64decode(body.split(',', 1)[1])
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(('saved %s %d bytes' % (name, len(data))).encode())

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    http.server.HTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
