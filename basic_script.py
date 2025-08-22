from openrgb import OpenRGBClient
from openrgb.utils import RGBColor

# Conexión al servidor local de OpenRGB
client = OpenRGBClient()  # 127.0.0.1:6742 por defecto

# Ver dispositivos disponibles
devices = client.devices
for i, device in enumerate(devices):
    print(f"[{i}] {device.name}")

# Seleccionar el dispositivo correcto
# Usa el índice correcto si tienes más de uno
fan_device = devices[3]

# Cambiar el color a rojo (por ejemplo)
fan_device.set_color(RGBColor(255, 0, 0))
