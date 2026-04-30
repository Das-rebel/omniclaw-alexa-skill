#!/usr/bin/env python3
"""
OmniCloud Fresh - WhatsApp API via OpenClaw
Listens on Mac, exposed via Cloudflare Tunnel to Cloud Run
"""

import subprocess
import json
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import sys
import time

# Config
PORT = 3000
CLOUD_AI_URL = "https://alexa-handler-338789220059.asia-south1.run.app/alexa"
CLIENT_PHONE = "+917977110915"

class OmniHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[{time.strftime('%H:%M:%S')}] {fmt % args}")
    
    def send_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_GET(self):
        if self.path == '/health':
            self.send_json({"status": "ok", "service": "omniclaw-fresh", "port": PORT})
        elif self.path == '/status':
            self.send_json({
                "whatsapp": "check_openclaw",
                "cloud_ai": CLOUD_AI_URL,
                "client": CLIENT_PHONE
            })
        else:
            self.send_json({"message": "OmniCloud API", "version": "1.0"})
    
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length))
        except:
            return self.send_json({"error": "Invalid JSON"}, 400)
        
        if self.path == '/send':
            result = send_whatsapp(data.get('to', CLIENT_PHONE), data.get('message', ''))
            self.send_json(result)
        
        elif self.path == '/process':
            text = data.get('text', '')
            from_jid = data.get('from', CLIENT_PHONE)
            
            # Get AI response
            ai_response = call_cloud_ai(text)
            
            # Send reply
            send_result = send_whatsapp(from_jid, ai_response)
            
            self.send_json({
                "success": send_result.get('success'),
                "ai_response": ai_response,
                "sent": send_result.get('success')
            })
        
        elif self.path == '/ai':
            text = data.get('text', '')
            response = call_cloud_ai(text)
            self.send_json({"response": response})
        
        else:
            self.send_json({"error": "Unknown endpoint"}, 404)


def send_whatsapp(target, message):
    """Send WhatsApp message via OpenClaw"""
    if not message:
        return {"success": False, "error": "Empty message"}
    
    try:
        # Escape quotes
        safe_msg = message.replace('"', '\\"')
        cmd = f'openclaw message send --target {target} --message "{safe_msg}" --channel whatsapp'
        
        result = subprocess.run(
            cmd, shell=True, 
            capture_output=True, text=True, 
            timeout=30
        )
        
        if result.returncode == 0:
            return {"success": True, "target": target}
        else:
            return {"success": False, "error": result.stderr or "Failed"}
    
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def call_cloud_ai(text):
    """Call Cloud Run AI"""
    try:
        data = json.dumps({"text": text}).encode()
        req = urllib.request.Request(
            CLOUD_AI_URL,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
            return result.get('response', {}).get('outputSpeech', {}).get('text', 'OK')
    except Exception as e:
        return f"Cloud AI error: {e}"


def keep_alive():
    """Keep server running"""
    while True:
        time.sleep(60)


if __name__ == '__main__':
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                 OMNICLOUD FRESH API SERVER                    ║
╠══════════════════════════════════════════════════════════════╣
║  Port: {PORT}                                                     ║
║  Cloud AI: {CLOUD_AI_URL}                  ║
║  Client: {CLIENT_PHONE}                                        ║
╠══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║    GET  /health    - Health check                             ║
║    GET  /status    - Status info                             ║
║    POST /send      - Send WhatsApp (to, message)             ║
║    POST /process   - Process message (from, text)            ║
║    POST /ai        - Get AI response (text)                   ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    server = HTTPServer(('', PORT), OmniHandler)
    print(f"Server running on http://localhost:{PORT}")
    
    # Keep alive thread
    threading.Thread(target=keep_alive, daemon=True).start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()
