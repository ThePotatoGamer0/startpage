import http.server
import ssl
import os
import json
import subprocess
import base64
import urllib.parse
import re
import time
import psutil
import threading
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Global Caches ---
last_known_art = ""
last_known_title = ""

cached_system_stats = {}
cached_media_state = {"active": False}
cached_clipboard = []

STATIC_GPU_NAMES = {}
active_clients = {}

def initialize_hardware():
    global STATIC_GPU_NAMES
    try:
        drm_dir = "/sys/class/drm"
        if os.path.exists(drm_dir):
            for card in os.listdir(drm_dir):
                if card.startswith("card") and not "-" in card:
                    name = f"AMD {card}"
                    uevent_file = os.path.join(drm_dir, card, "device", "uevent")
                    if os.path.exists(uevent_file):
                        with open(uevent_file, 'r') as f:
                            uevent_data = f.read()
                        match = re.search(r'PCI_SLOT_NAME=(.+)', uevent_data)
                        if match:
                            pci_slot = match.group(1)
                            try:
                                lspci_out = subprocess.check_output(['lspci', '-s', pci_slot], stderr=subprocess.DEVNULL).decode().strip()
                                brackets = re.findall(r'\[(.*?)\]', lspci_out)
                                if len(brackets) >= 2: name = brackets[-1].split('/')[0].strip()
                                elif "controller:" in lspci_out: name = lspci_out.split("controller:")[1].split("(rev")[0].strip()
                            except: pass
                    STATIC_GPU_NAMES[card] = name
    except: pass

    try:
        nv_output = subprocess.check_output(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader,nounits'], stderr=subprocess.DEVNULL, timeout=1).decode().strip()
        for i, line in enumerate(nv_output.split('\n')):
            if line.strip(): STATIC_GPU_NAMES[f"nvidia_{i}"] = line.strip().replace("NVIDIA ", "")
    except: pass

def get_clipboard_text():
    try:
        out = subprocess.check_output(['wl-paste', '-n', '-t', 'text/plain'], timeout=0.2, stderr=subprocess.DEVNULL)
        text = out.decode('utf-8').strip()
        return text if text else None
    except: return None

def get_cpu_temp():
    if not hasattr(psutil, "sensors_temperatures"): return 0
    temps = psutil.sensors_temperatures()
    if not temps: return 0
    for name in ['k10temp', 'coretemp', 'zenpower', 'acpitz', 'cpu_thermal']:
        if name in temps and len(temps[name]) > 0: return temps[name][0].current
    first_key = list(temps.keys())[0]
    return temps[first_key][0].current

def get_gpu_loads():
    gpus = []
    try:
        nv_output = subprocess.check_output(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'], stderr=subprocess.DEVNULL, timeout=0.4).decode().strip()
        for i, line in enumerate(nv_output.split('\n')):
            if line.strip().isdigit():
                name = STATIC_GPU_NAMES.get(f"nvidia_{i}", f"NVIDIA {i}")
                gpus.append({"name": name, "load": int(line.strip())})
    except: pass

    try:
        drm_dir = "/sys/class/drm"
        if os.path.exists(drm_dir):
            for card in os.listdir(drm_dir):
                if card.startswith("card") and not "-" in card:
                    load_file = os.path.join(drm_dir, card, "device", "gpu_busy_percent")
                    if os.path.exists(load_file):
                        try:
                            with open(load_file, 'r') as f: load = int(f.read().strip())
                            name = STATIC_GPU_NAMES.get(card, f"AMD {card}")
                            gpus.append({"name": name, "load": load})
                        except: pass
    except: pass
    return gpus

def get_art_data(url):
    if not url: return ""
    try:
        if url.startswith('file://'):
            if any(x in url.lower() for x in ['firefox', 'brave', 'chromium', 'chrome']): return ""
            filepath = urllib.parse.unquote(url[7:])
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f: encoded = base64.b64encode(f.read()).decode('utf-8')
                ext = filepath.split('.')[-1].lower()
                mime = 'image/png' if ext == 'png' else 'image/jpeg'
                return f"data:{mime};base64,{encoded}"
        return url
    except: return ""

def get_media_state():
    global last_known_art, last_known_title
    try:
        players_output = subprocess.check_output(['playerctl', '-l'], timeout=0.4, stderr=subprocess.DEVNULL).decode().strip()
        players = [p for p in players_output.split('\n') if p]
    except: players = []

    if any('plasma-browser-integration' in p for p in players):
        players = [p for p in players if not p.startswith('firefox')]

    best_player, best_status, best_title, best_artist, best_art = None, "Stopped", "", "", ""

    for player in players:
        try:
            cmd = ['playerctl', '--player='+player, 'metadata', '-f', '{{status}}|||{{title}}|||{{artist}}|||{{mpris:artUrl}}']
            output = subprocess.check_output(cmd, timeout=0.4, stderr=subprocess.DEVNULL).decode().strip()
            if output:
                parts = output.split('|||')
                if len(parts) == 4:
                    st, t, a, art = parts
                    if st == "Playing" or (a.strip() and not best_title):
                        best_player, best_status, best_title, best_artist, best_art = player, st, t, a, art
                        if st == "Playing": break 
        except: continue

    if not best_title: return {"active": False}
    if best_title == "YouTube Music" and best_artist: best_title, best_artist = best_artist, best_title

    art_data = get_art_data(best_art)
    if best_title == last_known_title and not art_data and last_known_art: art_data = last_known_art
    elif art_data: last_known_art, last_known_title = art_data, best_title

    return { "active": True, "status": best_status, "title": best_title, "artist": best_artist, "artUrl": art_data }

def background_data_loop():
    global cached_system_stats, cached_media_state, cached_clipboard
    initialize_hardware()
    last_net_time = time.time()
    last_net_io = psutil.net_io_counters()
    psutil.cpu_percent(interval=None) 
    
    while True:
        try:
            current_time = time.time()
            current_io = psutil.net_io_counters()
            dt = current_time - last_net_time
            if dt > 0:
                up_bytes_sec = (current_io.bytes_sent - last_net_io.bytes_sent) / dt
                down_bytes_sec = (current_io.bytes_recv - last_net_io.bytes_recv) / dt
            else:
                up_bytes_sec = down_bytes_sec = 0
                
            up_mb_s, down_mb_s = up_bytes_sec / (1024 * 1024), down_bytes_sec / (1024 * 1024)
            last_net_time, last_net_io = current_time, current_io
            ram, disk = psutil.virtual_memory(), psutil.disk_usage('/')

            cached_system_stats = {
                "cpu": {"load": psutil.cpu_percent(interval=None), "temp": get_cpu_temp()},
                "gpu": get_gpu_loads(),
                "ram": {"used": ram.used, "free": ram.available, "total": ram.total},
                "disk": {"used": disk.used, "free": disk.free, "total": disk.total},
                "network": {"up": round(up_mb_s, 2), "down": round(down_mb_s, 2)}
            }
            cached_media_state = get_media_state()

            clip_text = get_clipboard_text()
            if clip_text and len(clip_text) < 5000:
                if not cached_clipboard or cached_clipboard[0] != clip_text:
                    if clip_text in cached_clipboard: cached_clipboard.remove(clip_text)
                    cached_clipboard.insert(0, clip_text)
                    cached_clipboard = cached_clipboard[:3]
        except Exception as e: print(f"[Worker Error] {e}")
        time.sleep(0.5)

class APIHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass

    def do_GET(self):
        global active_clients
        parsed_url = urllib.parse.urlparse(self.path)
        
        if self.path == '/settings' or self.path == '/settings/':
            self.path = '/settings/index.html'
            return super().do_GET()

        # --- Universal CORS Proxy ---
        if parsed_url.path == '/api/proxy':
            query_params = urllib.parse.parse_qs(parsed_url.query)
            target_url = query_params.get('url', [''])[0]
            
            if not target_url:
                self.send_response(400)
                self.end_headers()
                return

            try:
                req = urllib.request.Request(target_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = response.read()
                    content_type = response.headers.get('Content-Type', 'application/json')
                    
                    self.send_response(200)
                    self.send_header('Content-type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
                return

        # --- OpenSearch Proxy ---
        if parsed_url.path == '/api/suggest':
            query_params = urllib.parse.parse_qs(parsed_url.query)
            q = query_params.get('q', [''])[0]
            provider = query_params.get('provider', ['startpage'])[0]
            
            if not q:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'[]')
                return
                
            url = f"https://www.startpage.com/osuggestions?q={urllib.parse.quote(q)}"
            if provider == 'google':
                url = f"https://suggestqueries.google.com/complete/search?client=chrome&q={urllib.parse.quote(q)}"
            elif provider == 'duckduckgo':
                url = f"https://ac.duckduckgo.com/ac/?q={urllib.parse.quote(q)}&type=list"

            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=1.5) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception as e:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'[]')
                return

        if parsed_url.path == '/api/heartbeat':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            self.end_headers()
            
            query_params = urllib.parse.parse_qs(parsed_url.query)
            client_id = query_params.get('client', ['unknown'])[0]
            
            current_time = time.time()
            if client_id != 'unknown': active_clients[client_id] = current_time
            active_clients = {k: v for k, v in active_clients.items() if current_time - v < 10.0}
            
            suggested_interval = max(500, len(active_clients) * 250)
            
            bg_timestamp = 0
            trigger_path = os.path.join(BASE_DIR, "trigger.js")
            if os.path.exists(trigger_path):
                try:
                    with open(trigger_path, 'r') as f:
                        match = re.search(r'\d+', f.read())
                        if match: bg_timestamp = int(match.group())
                except: bg_timestamp = int(os.path.getmtime(trigger_path))
            else:
                for ext in ['jpg', 'png']:
                    img_path = os.path.join(BASE_DIR, f"firefox_bg.{ext}")
                    if os.path.exists(img_path):
                        bg_timestamp = int(os.path.getmtime(img_path))
                        break

            next_update = bg_timestamp + 120.1 if bg_timestamp > 0 else 0

            response = {
                "wallpaperTimestamp": bg_timestamp,
                "nextWallpaperUpdate": next_update,
                "media": cached_media_state,
                "system": cached_system_stats,
                "clipboard": cached_clipboard,
                "suggestedInterval": suggested_interval
            }
            self.wfile.write(json.dumps(response).encode())
            return
            
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/media/'):
            action = self.path.split('/')[-1]
            priority = "spotube,plasma-browser-integration,spotify,vlc,%any"
            cmd = f"playerctl --player={priority} "
            if action == 'playpause': os.system(cmd + 'play-pause')
            elif action == 'next': os.system(cmd + 'next')
            elif action == 'prev': os.system(cmd + 'previous')
            self.send_response(200); self.end_headers(); self.wfile.write(b'{"status": "ok"}')
        else: self.send_error(404)

data_thread = threading.Thread(target=background_data_loop, daemon=True)
data_thread.start()

server_address = ('0.0.0.0', 8080)
httpd = http.server.HTTPServer(server_address, APIHandler)
cert_path = os.path.join(BASE_DIR, "ssl/newtab.pem")
key_path = os.path.join(BASE_DIR, "ssl/newtab-key.pem")
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile=cert_path, keyfile=key_path)
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
print(f"Serving HTTPS on port 8080. API Heartbeat available at /api/heartbeat")
httpd.serve_forever()