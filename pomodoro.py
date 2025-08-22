from openrgb import OpenRGBClient
from openrgb.utils import RGBColor
import time
import sys
import os

# Fuerza UTF-8 para evitar errores en consola Windows
if os.name == 'nt':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


client = OpenRGBClient()
#for i, dev in enumerate(client.devices):
#    print(f"[{i}] {dev.name} — Modes: {[m.name for m in dev.modes]}")

device = client.devices[3]  # 3 Son los ventiladores

# Modo al que volver después
DEFAULT_MODE = "Rainbow wave"

def set_mode_safely(mode_name):
    for mode in device.modes:
        if mode.name == mode_name:
            device.set_mode(mode.name)
            return True
    print(f"⚠️ Modo '{mode_name}' no encontrado")
    return False

def set_color_rgb(r, g, b):
    device.set_color(RGBColor(r, g, b))

def start_pomodoro(work_time=1500, break_time=300):  # por defecto 1500 (25 min) y 300 (5 min)
    try:
        set_mode_safely("Breathing")
        print("Trabajo")
        set_color_rgb(255, 0, 0)
        time.sleep(work_time)

        print("Descanso")
        set_color_rgb(0, 255, 0)
        time.sleep(break_time)
    finally:
        print("Restaurando modo")
        set_mode_safely(DEFAULT_MODE)

if __name__ == "__main__":
    import sys
    work = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
    rest = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    start_pomodoro(work, rest)
