"""Aplica el SMTP propio (Resend) a la autenticación de Supabase.

La clave de Resend se lee de C:\\Users\\berna\\.resend-token, fuera del repo.
Cloudflare bloquea el user-agent por defecto de urllib: por eso el header explícito.
"""
import json
import urllib.request

REF = "orxwkoyxuegydgvwqiea"
SUPABASE_TOKEN = open(r"C:\Users\berna\.supabase-token").read().strip()
RESEND_KEY = open(r"C:\Users\berna\.resend-token").read().strip()

CONFIG = {
    "smtp_host": "smtp.resend.com",
    "smtp_port": "465",
    "smtp_user": "resend",
    "smtp_pass": RESEND_KEY,
    "smtp_admin_email": "contacto@dotia.cl",
    "smtp_sender_name": "Dotia",
}

headers = {
    "Authorization": "Bearer " + SUPABASE_TOKEN,
    "User-Agent": "curl/8.4.0",
    "Content-Type": "application/json",
}

req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{REF}/config/auth",
    data=json.dumps(CONFIG).encode(),
    headers=headers,
    method="PATCH",
)
res = json.load(urllib.request.urlopen(req))

for k in CONFIG:
    v = res.get(k)
    print(f"{k} = {'(guardada)' if k == 'smtp_pass' and v else v}")
