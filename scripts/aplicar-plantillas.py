"""Aplica las plantillas de correo versionadas a la autenticación de Supabase.

Fuente de verdad: supabase/plantillas-correo.json (6 de autenticación) y
supabase/plantillas-seguridad.json (7 avisos de seguridad).
Cloudflare bloquea el user-agent por defecto de urllib: por eso el header explícito.
"""
import json
import urllib.request

REF = "orxwkoyxuegydgvwqiea"
TOKEN = open(r"C:\Users\berna\.supabase-token").read().strip()

config = {}
for f in ["supabase/plantillas-correo.json", "supabase/plantillas-seguridad.json"]:
    config.update(json.load(open(f, encoding="utf-8")))

req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{REF}/config/auth",
    data=json.dumps(config).encode("utf-8"),
    headers={
        "Authorization": "Bearer " + TOKEN,
        "User-Agent": "curl/8.4.0",
        "Content-Type": "application/json",
    },
    method="PATCH",
)
res = json.load(urllib.request.urlopen(req))

for k in sorted(config):
    print("OK " if res.get(k) == config[k] else "DIFIERE ", k)
