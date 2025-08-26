import sys, time, os
from openrgb import OpenRGBClient
from openrgb.utils import RGBColor

if os.name == 'nt':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

PREFERRED_DEVICE_HINTS = ["JRAINBOW", "RAINBOW", "ARGB"]
WORK_MODE = "Color pulse"
RESTORE_MODE = "Rainbow wave"

def connect_with_retry(address="127.0.0.1", port=6742, tries=40, delay=0.4):
    last = None
    for _ in range(tries):
        try:
            try:
                return OpenRGBClient(address=address, port=port)  # moderno
            except TypeError:
                return OpenRGBClient()  # fallback
        except Exception as e:
            last = e; time.sleep(delay)
    print(f"[!] No se pudo conectar a OpenRGB: {last}")
    sys.exit(1)



def pick_device(client):
    for d in client.devices:
        name = (d.name or "").upper()
        if any(h in name for h in PREFERRED_DEVICE_HINTS):
            return d
    return client.devices[3] if client.devices else None

def set_mode_safely(dev, name):
    for m in (dev.modes or []):
        if m.name.lower() == name.lower():
            dev.set_mode(m.name); return True
    print(f"[!] Modo '{name}' no encontrado. Disponibles: {[m.name for m in dev.modes]}")
    return False

def color(dev, r,g,b): dev.set_color(RGBColor(r,g,b))

def main():
    action = (sys.argv[1] if len(sys.argv) > 1 else "").lower()
    client = connect_with_retry()
    dev = pick_device(client)
    if not dev: 
        print("[!] Sin dispositivos"); sys.exit(1)

    if action == "work":
        set_mode_safely(dev, WORK_MODE) or set_mode_safely(dev, "direct")
        color(dev, 255,0,0); print("OK:WORK"); return
    if action == "break":
        color(dev, 0,255,0); print("OK:BREAK"); return
    if action == "restore":
        set_mode_safely(dev, RESTORE_MODE); print("OK:RESTORE"); return
    if action == "off":
        color(dev,0,0,0); print("OK:OFF"); return
    if action == "pause":
        set_mode_safely(dev, WORK_MODE) or set_mode_safely(dev, "direct")
        color(dev, 255, 125, 0)   # amarillo
        print("OK:PAUSE")
        return


    print("Uso: rgbctl.py [work|break|restore|off]"); sys.exit(2)

if __name__ == "__main__":
    main()
