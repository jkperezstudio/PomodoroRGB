from openrgb import OpenRGBClient
from openrgb.utils import RGBColor
import time

client = OpenRGBClient()
device = client.devices[3]  # o el índice correcto según tu setup

# Activa modo directo
device.set_mode("COLOR PULSE")
device.set_color(RGBColor(255, 0, 0))  # Trabajo - rojo
print("🔥 Pomodoro started")
time.sleep(25)

device.set_color(RGBColor(0, 255, 0))  # Descanso - verde
print("🛋️ Descanso")
time.sleep(5)

# Vuelve al efecto RGB original
device.set_mode("RAINBOW WAVE")
print("✅ Pomodoro done, modo RAINBOW WAVE restaurado")
