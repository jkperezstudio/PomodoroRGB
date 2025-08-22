import time
from openrgb import OpenRGBClient
from openrgb.utils import RGBColor

# Conectar a OpenRGB
client = OpenRGBClient()
device = client.devices[1]  # Ajusta si hay más de un dispositivo

def set_color(color):
    device.set_color(color)

def pomodoro_cycle(work_minutes=1, break_minutes=1):
    while True:
        print("🔥 WORK TIME!")
        set_color(RGBColor(255, 0, 0))  # Rojo
        time.sleep(work_minutes * 60)

        print("🍃 BREAK TIME!")
        set_color(RGBColor(0, 255, 0))  # Verde
        time.sleep(break_minutes * 60)

# Inicia el ciclo
pomodoro_cycle()
