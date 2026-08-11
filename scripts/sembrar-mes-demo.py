"""Siembra un mes de operación creíble en el inquilino Sol Eterno (agosto 2026).

Para qué: las capturas del producto salían con 0 % de ocupación y ceros en cuatro de los seis
módulos, porque la base tenía 4 estadías y `allocations` vacía —de ahí sale la capacidad—.

Datos simulados: no hay clientes reales en esta base. Idempotente: todos los identificadores son
fijos y cada inserción lleva ON CONFLICT DO NOTHING, así que correrlo dos veces no duplica nada.

Uso:  python scripts/sembrar-mes-demo.py [--borrar]
      --borrar deshace exactamente lo sembrado acá (los ids con prefijo ab0/ab1), nada más.
"""
import json
import sys
import urllib.request

REF = "orxwkoyxuegydgvwqiea"
TOKEN = open(r"C:\Users\berna\.supabase-token").read().strip()

TENANT = "10000000-0000-0000-0000-000000000001"      # Sol Eterno
PROYECTO = "ee000000-0000-0000-0000-000000000003"    # Proyecto Cordillera
CIUDAD = "f54b04eb-9c5d-4369-bc78-7cff2fdde98a"      # Antofagasta
EMPRESA = "ee000000-0000-0000-0000-000000000001"     # Constructora Andina SpA
PROP_ANDES = "ee000000-0000-0000-0000-000000000002"  # Campamento Los Andes
PROVEEDOR = "ee100000-0000-0000-0000-000000000001"   # Proveedor Faena SpA (autor de eventos)

HOY = "2026-08-11"


def uid(bloque: int, n: int) -> str:
    """Identificador fijo y legible: ab<bloque>00000-…-<n>. Permite borrar solo lo sembrado."""
    return f"ab{bloque}00000-0000-0000-0000-{n:012d}"


def ejecutar(sql: str):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": "Bearer " + TOKEN, "User-Agent": "curl/8.4.0",
                 "Content-Type": "application/json"},
        method="POST",
    )
    return json.load(urllib.request.urlopen(req))


def txt(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


# ─────────────────────────────────────────────────────────────────────────────
# Borrado
# ─────────────────────────────────────────────────────────────────────────────
if "--borrar" in sys.argv:
    orden = ["traslado_pasajeros", "traslados", "colaciones", "plan_alimentacion",
             "lavanderia_bolsas", "eventos_bitacora", "stays", "guests", "allocations",
             "dotaciones", "persona_directorio", "personas", "rooms", "properties", "companies"]
    for t in orden:
        r = ejecutar(f"delete from {t} where id::text like 'ab_00000-%' returning 1")
        print(f"  {t:22} borradas {len(r)}")
    sys.exit()


# ─────────────────────────────────────────────────────────────────────────────
# Catálogo de nombres (inventados)
# ─────────────────────────────────────────────────────────────────────────────
NOMBRES = ["Cristian", "Marcela", "Rodrigo", "Paulina", "Sebastián", "Daniela", "Iván", "Carla",
           "Nelson", "Fernanda", "Álvaro", "Katherine", "Mauricio", "Jessica", "Patricio",
           "Solange", "Hernán", "Bárbara", "Claudio", "Yasna", "Esteban", "Pamela", "Gonzalo",
           "Ximena", "Leonardo", "Roxana", "Felipe", "Marisol", "Óscar", "Tamara", "Rubén",
           "Karina", "Danilo", "Elizabeth", "Jaime", "Andrea", "Cristóbal", "Lorena", "Mario",
           "Valeska", "Nicolás", "Ingrid", "Rafael", "Millaray", "Emilio"]
PATERNOS = ["Fuentes", "Cárcamo", "Villarroel", "Muñoz", "Sepúlveda", "Aguilera", "Cortés",
            "Riquelme", "Vergara", "Pizarro", "Salinas", "Bustos", "Quezada", "Órdenes",
            "Zúñiga", "Maldonado", "Cifuentes", "Peñaloza", "Tapia", "Alarcón", "Huenchual",
            "Barraza", "Godoy", "Lagos", "Miranda", "Navarrete", "Olivares", "Paredes",
            "Quinteros", "Reyes", "Saavedra", "Toro", "Ulloa", "Valdés", "Yáñez", "Ampuero",
            "Bahamondes", "Catalán", "Donoso", "Espinoza", "Faúndez", "Gallardo", "Henríquez",
            "Ibarra", "Jara"]
MATERNOS = ["Soto", "Rojas", "Díaz", "Molina", "Cáceres", "Leiva", "Contreras", "Farías",
            "Guzmán", "Herrera"]
OFICIOS = ["soldador", "maestro eléctrico", "operador de equipo", "prevencionista",
           "mecánico", "topógrafo", "capataz", "ayudante"]

sql = []

# ── Empresas contratistas ────────────────────────────────────────────────────
EMPRESAS = [(uid(0, 1), "Montajes Tarapacá Ltda.", "77.201.884-5"),
            (uid(0, 2), "Servicios Atacama SpA", "76.998.120-3")]
for cid, nombre, rut in EMPRESAS:
    sql.append(f"insert into companies (id,name,rut,active,tenant_id) values "
               f"({txt(cid)},{txt(nombre)},{txt(rut)},true,{txt(TENANT)}) on conflict (id) do nothing;")
TODAS_EMPRESAS = [EMPRESA] + [c[0] for c in EMPRESAS]

# ── Propiedades y habitaciones ───────────────────────────────────────────────
# tipos permitidos por la base: hotel, hostal, departamento, oficina
PROPS = [(uid(0, 11), "Campamento Sierra Gorda", "hostal", "Ruta B-385 km 12, Sierra Gorda"),
         (uid(0, 12), "Residencia Antofagasta Centro", "hostal", "Baquedano 1240, Antofagasta")]
for pid, nombre, tipo, dir_ in PROPS:
    sql.append(f"insert into properties (id,city_id,name,type,address,floors,tenant_id) values "
               f"({txt(pid)},{txt(CIUDAD)},{txt(nombre)},{txt(tipo)},{txt(dir_)},2,{txt(TENANT)}) "
               f"on conflict (id) do nothing;")

# 40 habitaciones nuevas: dobles y singles alternadas
habitaciones = []   # (room_id, capacidad)
n = 0
plan_hab = [(PROP_ANDES, 201, 14), (PROPS[0][0], 101, 16), (PROPS[1][0], 301, 10)]
for prop_id, base, cuantas in plan_hab:
    for i in range(cuantas):
        n += 1
        rid = uid(1, n)
        cap = 2 if i % 3 != 2 else 1        # dos de cada tres son dobles
        tipo = "double" if cap == 2 else "single"
        sql.append(f"insert into rooms (id,property_id,number,floor,type,capacity,tenant_id) values "
                   f"({txt(rid)},{txt(prop_id)},{txt(str(base + i))},{1 + i // 8},{txt(tipo)},{cap},"
                   f"{txt(TENANT)}) on conflict (id) do nothing;")
        habitaciones.append((rid, cap))

# ── Asignación de habitaciones: sin esto la capacidad del reporte es 0 ───────
# project_id apunta a `projects` (tabla en inglés, heredada y vacía), no a `proyectos`: va nula,
# igual que en los datos que ya existían.
sql.append("insert into allocations (id,company_id,room_id,start_date,end_date,tenant_id) "
           "select ('ab200000-0000-0000-0000-'||lpad(row_number() over (order by r.id)::text,12,'0'))::uuid, "
           f"{txt(EMPRESA)}, r.id, date '2026-07-01', null, {txt(TENANT)} "
           f"from rooms r where r.tenant_id = {txt(TENANT)} "
           "on conflict (id) do nothing;")

# ── Personas, directorio y dotaciones ────────────────────────────────────────
CANT = 45
personas = []
for i in range(CANT):
    pid, did = uid(0, 100 + i), uid(0, 300 + i)
    nom, pat, mat = NOMBRES[i], PATERNOS[i], MATERNOS[i % len(MATERNOS)]
    rut = f"{12000000 + i * 37117}-{i % 10}"
    trab, desc = (7, 7) if i % 3 else (14, 14)
    sql.append(f"insert into personas (id,tipo_documento,numero_documento,pais_documento,nombres,"
               f"apellido_paterno,apellido_materno,nacionalidad) values ({txt(pid)},'rut',{txt(rut)},"
               f"'CL',{txt(nom)},{txt(pat)},{txt(mat)},'Chilena') on conflict (id) do nothing;")
    sql.append(f"insert into persona_directorio (id,tenant_id,persona_id,activa) values "
               f"({txt(uid(0, 200 + i))},{txt(TENANT)},{txt(pid)},true) on conflict (id) do nothing;")
    sql.append(f"insert into dotaciones (id,tenant_id,persona_id,proyecto_id,turno_dias_trabajo,"
               f"turno_dias_descanso,fecha_inicio_contrato,estado) values ({txt(did)},{txt(TENANT)},"
               f"{txt(pid)},{txt(PROYECTO)},{trab},{desc},date '2026-06-15','activa') "
               f"on conflict (id) do nothing;")
    personas.append((pid, did, f"{nom} {pat}", TODAS_EMPRESAS[i % 3]))

# ── Huéspedes y estadías ─────────────────────────────────────────────────────
# Reparto: la mayoría toda la faena; unos se van a mitad de mes y otros llegan a reemplazarlos.
# Da ~70 % de ocupación, que es una cifra creíble, no un 100 % de vitrina.
camas = [(rid, b) for rid, cap in habitaciones for b in range(cap)]
estadias = []
for i, (pid, did, nombre, cia) in enumerate(personas):
    if i < 30:
        entrada, salida = "2026-07-20 14:00:00+00", None
    elif i < 38:
        entrada, salida = "2026-07-25 14:00:00+00", "2026-08-14 09:00:00+00"
    else:
        entrada, salida = "2026-08-15 14:00:00+00", None
    estadias.append((i, pid, nombre, cia, entrada, salida))

for i, pid, nombre, cia, entrada, salida in estadias:
    gid, sid = uid(0, 500 + i), uid(0, 700 + i)
    nom, pat = nombre.split(" ", 1)
    room = camas[i % len(camas)][0]
    sql.append(f"insert into guests (id,first_name,last_name_paterno,rut,company_id,tenant_id) values "
               f"({txt(gid)},{txt(nom)},{txt(pat)},{txt(f'{13000000 + i * 41}-{i % 10}')},"
               f"{txt(cia)},{txt(TENANT)}) on conflict (id) do nothing;")
    sql.append(f"insert into stays (id,guest_id,room_id,company_id,checked_in_at,checked_out_at,"
               f"tenant_id,dotacion_id) values ({txt(sid)},{txt(gid)},{txt(room)},"
               f"{txt(cia)},{txt(entrada)},{txt(salida)},{txt(TENANT)},"
               f"{txt(personas[i][1])}) on conflict (id) do nothing;")

# ── Módulos: transporte, alimentación, colaciones, lavandería ────────────────
DIAS = [f"2026-08-{d:02d}" for d in range(1, 12)]
VEHICULO = "ee000000-0000-0000-0000-000000000004"

k = 0
for d_i, dia in enumerate(DIAS):
    for sentido, hora, origen, destino in [
        ("ida", "06:45:00", "Campamento Los Andes", "Faena Cordillera"),
        ("vuelta", "19:15:00", "Faena Cordillera", "Campamento Los Andes"),
    ]:
        k += 1
        tid = uid(0, 800 + k)
        sql.append(f"insert into traslados (id,tenant_id,proyecto_id,vehiculo_id,tipo,sentido,fecha,"
                   f"hora,origen,destino,conductor_nombre) values ({txt(tid)},{txt(TENANT)},"
                   f"{txt(PROYECTO)},{txt(VEHICULO)},'movilizacion',{txt(sentido)},{txt(dia)},"
                   f"{txt(hora)},{txt(origen)},{txt(destino)},'Pedro Alarcón') "
                   f"on conflict (id) do nothing;")
        for j in range(12):
            pid, did, _, _ = personas[(d_i * 3 + j) % CANT]
            sql.append(f"insert into traslado_pasajeros (id,tenant_id,traslado_id,dotacion_id,"
                       f"persona_id,estado,subio_at) values ({txt(uid(1, 1000 + k * 20 + j))},"
                       f"{txt(TENANT)},{txt(tid)},{txt(did)},{txt(pid)},'subio',"
                       f"{txt(dia + ' ' + hora)}) on conflict (id) do nothing;")

m = 0
for d_i, dia in enumerate(DIAS):
    for j in range(20):
        _, did, _, _ = personas[(d_i * 5 + j) % CANT]
        m += 1
        sql.append(f"insert into plan_alimentacion (id,tenant_id,dotacion_id,fecha,desayuno,almuerzo,"
                   f"cena) values ({txt(uid(1, 3000 + m))},{txt(TENANT)},{txt(did)},{txt(dia)},"
                   f"'hotel','faena','hotel') on conflict (id) do nothing;")

c = 0
for d_i, dia in enumerate(DIAS):
    for j in range(14):
        _, did, _, _ = personas[(d_i * 7 + j) % CANT]
        c += 1
        sql.append(f"insert into colaciones (id,tenant_id,proyecto_id,dotacion_id,punto_entrega,"
                   f"sentido,fecha,hora,contenido,cantidad,entregada) values ({txt(uid(1, 5000 + c))},"
                   f"{txt(TENANT)},{txt(PROYECTO)},{txt(did)},'otro','salida',{txt(dia)},'06:30:00',"
                   f"'Sándwich + fruta + bebida',1,true) on conflict (id) do nothing;")

b = 0
for d_i, dia in enumerate(DIAS):
    for j in range(8):
        pid, did, _, _ = personas[(d_i * 4 + j) % CANT]
        b += 1
        sql.append(f"insert into lavanderia_bolsas (id,tenant_id,dotacion_id,persona_id,"
                   f"entregada_por,estado) values ({txt(uid(1, 7000 + b))},{txt(TENANT)},{txt(did)},"
                   f"{txt(pid)},'Aseo Campamento','recepcionada') on conflict (id) do nothing;")

# ── El día completo de una persona, para la captura de trazabilidad ──────────
FOCO_PID, FOCO_DID = personas[0][0], personas[0][1]
EVENTOS = [("transporte", "subio", "Subió al transporte", "06:47"),
           ("alimentacion", "entregado", "Desayuno entregado en campamento", "05:55"),
           ("colaciones", "entregado", "Colación de faena entregada", "06:30"),
           ("lavanderia", "entregado", "Bolsa de ropa entregada", "13:10"),
           ("transporte", "subio", "Subió al transporte de regreso", "19:18"),
           ("hotel", "confirmado", "Pernocta confirmada", "21:40")]
# `eventos_bitacora` tiene un disparador (set_evento_autor) que rellena el autor desde la sesión.
# Corriendo por la API no hay usuario, así que el autor saldría nulo y la inserción falla:
# se le presta la identidad del admin del proveedor, que es quien registra en terreno.
AUTOR_UID = "6c37a1d2-c3d0-407e-8d17-2b632e4f17fb"   # switch-proveedor-admin@soleterno.cl
sql.append("select set_config('request.jwt.claims',"
           f"'{{\"sub\":\"{AUTOR_UID}\",\"role\":\"authenticated\"}}', false);")

for i, (modulo, tipo, detalle, hora) in enumerate(EVENTOS):
    sql.append(f"insert into eventos_bitacora (id,proyecto_id,dotacion_id,persona_id,modulo,tipo,"
               f"detalle,autor_tenant_id,autor_nombre,created_at) values ({txt(uid(1, 9000 + i))},"
               f"{txt(PROYECTO)},{txt(FOCO_DID)},{txt(FOCO_PID)},{txt(modulo)},{txt(tipo)},"
               f"{txt(detalle)},{txt(PROVEEDOR)},'Proveedor · Admin',"
               f"{txt(f'{HOY} {hora}:00+00')}) on conflict (id) do nothing;")
# y su día de hoy en cada módulo, para que la línea muestre las cinco paradas
sql.append(f"insert into plan_alimentacion (id,tenant_id,dotacion_id,fecha,desayuno,almuerzo,cena) "
           f"values ({txt(uid(1, 9100))},{txt(TENANT)},{txt(FOCO_DID)},{txt(HOY)},'hotel','faena',"
           f"'hotel') on conflict (id) do nothing;")
sql.append(f"insert into colaciones (id,tenant_id,proyecto_id,dotacion_id,punto_entrega,sentido,"
           f"fecha,hora,contenido,cantidad,entregada) values ({txt(uid(1, 9101))},{txt(TENANT)},"
           f"{txt(PROYECTO)},{txt(FOCO_DID)},'otro','salida',{txt(HOY)},'06:30:00',"
           f"'Sándwich + fruta + bebida',1,true) on conflict (id) do nothing;")
sql.append(f"insert into lavanderia_bolsas (id,tenant_id,dotacion_id,persona_id,entregada_por,estado) "
           f"values ({txt(uid(1, 9102))},{txt(TENANT)},{txt(FOCO_DID)},{txt(FOCO_PID)},"
           f"'Aseo Campamento','recepcionada') on conflict (id) do nothing;")
TRAS_HOY = uid(1, 9103)
sql.append(f"insert into traslados (id,tenant_id,proyecto_id,vehiculo_id,tipo,sentido,fecha,hora,"
           f"origen,destino,conductor_nombre) values ({txt(TRAS_HOY)},{txt(TENANT)},{txt(PROYECTO)},"
           f"{txt(VEHICULO)},'movilizacion','ida',{txt(HOY)},'06:45:00','Campamento Los Andes',"
           f"'Faena Cordillera','Pedro Alarcón') on conflict (id) do nothing;")
sql.append(f"insert into traslado_pasajeros (id,tenant_id,traslado_id,dotacion_id,persona_id,estado,"
           f"subio_at) values ({txt(uid(1, 9104))},{txt(TENANT)},{txt(TRAS_HOY)},{txt(FOCO_DID)},"
           f"{txt(FOCO_PID)},'subio',{txt(HOY + ' 06:47:00+00')}) on conflict (id) do nothing;")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"{len(sql)} inserciones, en tandas de 150")
    for i in range(0, len(sql), 150):
        ejecutar("\n".join(sql[i:i + 150]))
        print(f"  {min(i + 150, len(sql))}/{len(sql)}")
    print("\npersona destacada para la captura de trazabilidad:")
    print(f"  {personas[0][2]}  ->  /admin/personal/{FOCO_PID}")
