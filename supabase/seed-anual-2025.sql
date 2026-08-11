-- ============================================================
-- Dotia — Seed anual 2025 (datos de prueba del tenant Sol Eterno)
-- 3 hostales (22/42/30 habitaciones), 5 empresas, ~800 estadías
-- Ocupación realista y variada por empresa
-- ============================================================

DO $$
DECLARE
  -- ── IDs fijos (prefijo aa/bb para limpieza segura) ─────────
  p_norte  uuid := 'aa200000-0000-0000-0000-000000000001';
  p_minero uuid := 'aa200000-0000-0000-0000-000000000002';
  p_sol    uuid := 'aa200000-0000-0000-0000-000000000003';

  c_mc  uuid := 'bb200000-0000-0000-0000-000000000001'; -- MinCorp SA        88%
  c_ct  uuid := 'bb200000-0000-0000-0000-000000000002'; -- CopperTech Ltda   72%
  c_nm  uuid := 'bb200000-0000-0000-0000-000000000003'; -- NorteMine SpA     58%
  c_am  uuid := 'bb200000-0000-0000-0000-000000000004'; -- AndeanMining SA   44%
  c_en  uuid := 'bb200000-0000-0000-0000-000000000005'; -- Explora Norte     31%

  city_iqq uuid; city_ant uuid; city_cal uuid;

  -- ── Variables de trabajo ───────────────────────────────────
  i integer := 0; floor_num integer := 0;
  rid uuid; aid uuid; gid uuid;
  rtype text; rcap integer; rnum text;
  comp_id uuid; prop_id uuid; alloc_id uuid;
  rot_date date; occ_thresh float; seas_mult float;
  guest_pool uuid[]; gpidx integer;

  -- ── Nombres chilenos ───────────────────────────────────────
  nombres  text[] := ARRAY['Carlos','María','Juan','Ana','Luis','Sofía','Pedro','Carmen','Diego','Isabel',
    'Rodrigo','Patricia','Felipe','Valentina','Miguel','Claudia','Andrés','Fernanda','Roberto','Alejandra',
    'Marcos','Lorena','Cristóbal','Verónica','Héctor','Cecilia','Patricio','Natalia','Eduardo','Pilar',
    'Sebastián','Mónica','Nicolás','Sandra','Tomás','Gloria','Ignacio','Francisca','Jaime','Catalina',
    'Matías','Javiera','Benjamín','Daniela','Gonzalo','Constanza','Francisco','Camila','Álvaro','Paula'];
  apellidos text[] := ARRAY['González','Muñoz','Rodríguez','López','Martínez','García','Pérez','Sánchez',
    'Ramírez','Torres','Flores','Rivera','Díaz','Reyes','Morales','Jiménez','Herrera','Medina','Castro',
    'Ortega','Vásquez','Fuentes','Espinoza','Contreras','Rojas','Bravo','Navarro','Soto','Valenzuela',
    'Ramos','Guerrero','Delgado','Mendoza','Vidal','Aguilar','Cortés','Salinas','Olivares','Castillo','Guzmán'];

  -- Ocupación base por empresa (varía con estacionalidad)
  occ_mc  float := 0.88;
  occ_ct  float := 0.72;
  occ_nm  float := 0.58;
  occ_am  float := 0.44;
  occ_en  float := 0.31;

  rec record;
  g_count integer;

BEGIN
  RAISE NOTICE 'Limpiando datos anteriores...';

  -- Limpiar seed anterior (prefijo aa/bb y seed mayo)
  DELETE FROM public.stays      WHERE company_id IN (c_mc,c_ct,c_nm,c_am,c_en)
    OR id::text LIKE 'f1000000%';
  DELETE FROM public.guests     WHERE company_id IN (c_mc,c_ct,c_nm,c_am,c_en)
    OR id::text LIKE 'e1000000%';
  DELETE FROM public.allocations WHERE company_id IN (c_mc,c_ct,c_nm,c_am,c_en)
    OR id::text LIKE 'd1000000%';
  DELETE FROM public.rooms      WHERE property_id IN (p_norte,p_minero,p_sol)
    OR id::text LIKE 'b1000000%';
  -- Desvincular perfiles de usuario antes de borrar empresas del seed anterior
  UPDATE public.user_profiles SET company_id = NULL
    WHERE company_id IN (c_mc,c_ct,c_nm,c_am,c_en)
       OR company_id::text LIKE 'c1000000%';
  DELETE FROM public.companies  WHERE id IN (c_mc,c_ct,c_nm,c_am,c_en)
    OR id::text LIKE 'c1000000%';
  DELETE FROM public.properties WHERE id IN (p_norte,p_minero,p_sol)
    OR id::text LIKE 'a1000000%';

  -- ── Ciudades ───────────────────────────────────────────────
  SELECT id INTO city_iqq FROM public.cities WHERE name='Iquique'     LIMIT 1;
  SELECT id INTO city_ant FROM public.cities WHERE name='Antofagasta' LIMIT 1;
  SELECT id INTO city_cal FROM public.cities WHERE name='Calama'      LIMIT 1;

  -- ── Propiedades ────────────────────────────────────────────
  RAISE NOTICE 'Creando propiedades...';
  INSERT INTO public.properties (id, city_id, name, type, address, floors, active) VALUES
    (p_norte,  city_iqq, 'Hostal Norte',  'hostal', 'Av. Arturo Prat 340, Iquique',    4, true),
    (p_minero, city_ant, 'Hostal Minero', 'hostal', 'Calle Latorre 580, Antofagasta',  5, true),
    (p_sol,    city_cal, 'Hostal del Sol','hostal', 'Av. Granaderos 180, Calama',      4, true);

  -- ── Empresas ───────────────────────────────────────────────
  RAISE NOTICE 'Creando empresas...';
  INSERT INTO public.companies (id, name, rut, contact_name, contact_email, active) VALUES
    (c_mc, 'MinCorp SA',             '76.200.001-1','Carlos Rojas',    'crojas@mincorp.cl',   true),
    (c_ct, 'CopperTech Ltda',        '76.200.002-2','Andrea Soto',     'asoto@coppertech.cl', true),
    (c_nm, 'NorteMine SpA',          '76.200.003-3','Felipe Mora',     'fmora@nortemine.cl',  true),
    (c_am, 'AndeanMining SA',        '76.200.004-4','Javiera Pizarro', 'jpizarro@andean.cl',  true),
    (c_en, 'Exploraciones Norte SpA','76.200.005-5','Rodrigo Leiva',   'rleiva@explora.cl',   true);

  -- ── HOSTAL NORTE — 22 habitaciones, 4 pisos ────────────────
  -- Piso 1: 5 hab (doble×2, triple×2, compartido×1)
  -- Piso 2: 8 hab (individual×3, doble×3, triple×2)
  -- Piso 3: 7 hab (individual×2, doble×3, triple×1, suite×1)
  -- Piso 4: 2 hab (suite×2)
  RAISE NOTICE 'Creando habitaciones Hostal Norte...';

  -- Piso 1
  FOREACH rtype IN ARRAY ARRAY['double','double','triple','triple','shared'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'double' THEN 2 WHEN 'triple' THEN 3 WHEN 'shared' THEN 6 ELSE 1 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_norte, '10'||i::text, 1, rtype, rcap);
  END LOOP; i := 0;

  -- Piso 2
  FOREACH rtype IN ARRAY ARRAY['single','single','single','double','double','double','triple','triple'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 ELSE 3 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_norte, '20'||i::text, 2, rtype, rcap);
  END LOOP; i := 0;

  -- Piso 3
  FOREACH rtype IN ARRAY ARRAY['single','single','double','double','double','triple','suite'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_norte, '30'||i::text, 3, rtype, rcap);
  END LOOP; i := 0;

  -- Piso 4
  FOREACH rtype IN ARRAY ARRAY['suite','suite'] LOOP
    i := i + 1;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_norte, '40'||i::text, 4, rtype, 2);
  END LOOP; i := 0;

  -- ── HOSTAL MINERO — 42 habitaciones, 5 pisos ───────────────
  RAISE NOTICE 'Creando habitaciones Hostal Minero...';

  FOREACH rtype IN ARRAY ARRAY['shared','shared','double','double','triple','triple','triple','shared','double'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'double' THEN 2 WHEN 'triple' THEN 3 WHEN 'shared' THEN 6 ELSE 1 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_minero, '10'||i::text, 1, rtype, rcap);
  END LOOP; i := 0;

  FOREACH rtype IN ARRAY ARRAY['single','single','double','double','double','triple','triple','single','double'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 ELSE 3 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_minero, '20'||i::text, 2, rtype, rcap);
  END LOOP; i := 0;

  FOREACH rtype IN ARRAY ARRAY['single','single','single','double','double','triple','triple','suite','double'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_minero, '30'||i::text, 3, rtype, rcap);
  END LOOP; i := 0;

  FOREACH rtype IN ARRAY ARRAY['single','single','single','double','double','double','triple','suite','single'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_minero, '40'||i::text, 4, rtype, rcap);
  END LOOP; i := 0;

  FOREACH rtype IN ARRAY ARRAY['single','single','double','double','suite','suite','single','double','single'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_minero, '50'||i::text, 5, rtype, rcap);
  END LOOP; i := 0;

  -- ── HOSTAL DEL SOL — 30 habitaciones, 4 pisos ──────────────
  RAISE NOTICE 'Creando habitaciones Hostal del Sol...';

  FOREACH rtype IN ARRAY ARRAY['shared','double','double','triple','triple','shared','double','single'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 WHEN 'shared' THEN 6 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_sol, '10'||i::text, 1, rtype, rcap);
  END LOOP; i := 0;

  FOREACH rtype IN ARRAY ARRAY['single','single','double','double','triple','triple','suite','double'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_sol, '20'||i::text, 2, rtype, rcap);
  END LOOP; i := 0;

  FOREACH rtype IN ARRAY ARRAY['single','single','single','double','double','triple','suite'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_sol, '30'||i::text, 3, rtype, rcap);
  END LOOP; i := 0;

  FOREACH rtype IN ARRAY ARRAY['single','single','double','double','triple','suite','single'] LOOP
    i := i + 1;
    rcap := CASE rtype WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 ELSE 2 END;
    INSERT INTO public.rooms (id,property_id,number,floor,type,capacity)
    VALUES (gen_random_uuid(), p_sol, '40'||i::text, 4, rtype, rcap);
  END LOOP; i := 0;

  -- ── ALLOCATIONS ─────────────────────────────────────────────
  -- Norte (22):  MinCorp→12, NorteMine→7, Explora→3 (total 22)
  -- Minero (42): CopperTech→18, AndeanMining→14, MinCorp→10 (total 42)
  -- Sol (30):    NorteMine→15, CopperTech→10, Explora→5 (total 30)
  RAISE NOTICE 'Creando allocations...';

  -- Norte → MinCorp (pisos 1-2 completo + 4 de piso 3)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_norte ORDER BY number LIMIT 12
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_mc, rec.id, '2025-01-01');
  END LOOP;

  -- Norte → NorteMine (resto piso 3 + piso 4)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_norte ORDER BY number OFFSET 12 LIMIT 7
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_nm, rec.id, '2025-01-01');
  END LOOP;

  -- Norte → Explora (últimas 3)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_norte ORDER BY number OFFSET 19 LIMIT 3
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_en, rec.id, '2025-01-01');
  END LOOP;

  -- Minero → CopperTech (pisos 1-2)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_minero ORDER BY number LIMIT 18
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_ct, rec.id, '2025-01-01');
  END LOOP;

  -- Minero → AndeanMining (piso 3)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_minero ORDER BY number OFFSET 18 LIMIT 14
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_am, rec.id, '2025-01-01');
  END LOOP;

  -- Minero → MinCorp (pisos 4-5 parcial)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_minero ORDER BY number OFFSET 32 LIMIT 10
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_mc, rec.id, '2025-01-01');
  END LOOP;

  -- Sol → NorteMine (pisos 1-2)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_sol ORDER BY number LIMIT 15
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_nm, rec.id, '2025-01-01');
  END LOOP;

  -- Sol → CopperTech (piso 3)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_sol ORDER BY number OFFSET 15 LIMIT 10
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_ct, rec.id, '2025-01-01');
  END LOOP;

  -- Sol → Explora (piso 4 parcial)
  FOR rec IN
    SELECT id FROM public.rooms WHERE property_id=p_sol ORDER BY number OFFSET 25 LIMIT 5
  LOOP
    INSERT INTO public.allocations (id,company_id,room_id,start_date)
    VALUES (gen_random_uuid(), c_en, rec.id, '2025-01-01');
  END LOOP;

  -- ── HUÉSPEDES — pool por empresa ────────────────────────────
  RAISE NOTICE 'Creando huéspedes...';

  FOR rec IN SELECT unnest(ARRAY[c_mc,c_ct,c_nm,c_am,c_en]) AS cid,
                    unnest(ARRAY[40,  32,  26,  20,  12  ]) AS qty
  LOOP
    FOR j IN 1..rec.qty LOOP
      INSERT INTO public.guests (id, first_name, last_name_paterno, last_name_materno, rut, company_id)
      VALUES (
        gen_random_uuid(),
        nombres[   1 + ((j * 7  + rec.qty) % array_length(nombres,1))  ],
        apellidos[ 1 + ((j * 11 + rec.qty) % array_length(apellidos,1)) ],
        apellidos[ 1 + ((j * 13 + rec.qty) % array_length(apellidos,1)) ],
        (10000000 + (random()*9999999)::int)::text || '-' ||
          (floor(random()*10))::text,
        rec.cid
      );
    END LOOP;
  END LOOP;

  -- ── ESTADÍAS — año 2025 con rotaciones 14x14 ───────────────
  RAISE NOTICE 'Generando estadías...';

  FOR rec IN
    SELECT
      a.id        AS alloc_id,
      a.room_id,
      a.company_id,
      p.name      AS prop_name,
      CASE a.company_id
        WHEN c_mc THEN occ_mc
        WHEN c_ct THEN occ_ct
        WHEN c_nm THEN occ_nm
        WHEN c_am THEN occ_am
        ELSE            occ_en
      END AS base_occ
    FROM public.allocations a
    JOIN public.rooms r ON r.id = a.room_id
    JOIN public.properties p ON p.id = r.property_id
    WHERE a.company_id IN (c_mc, c_ct, c_nm, c_am, c_en)
  LOOP
    -- Dos turnos: A empieza 1 ene, B empieza 15 ene
    FOR rot_date IN
      SELECT d::date FROM generate_series('2025-01-01'::date,'2025-12-15'::date,'28 days'::interval) d
      UNION ALL
      SELECT d::date FROM generate_series('2025-01-15'::date,'2025-12-31'::date,'28 days'::interval) d
      ORDER BY 1
    LOOP
      -- Estacionalidad: alta en may-sep (minería más activa), baja en dic-ene
      seas_mult := CASE EXTRACT(MONTH FROM rot_date)
        WHEN 1  THEN 0.75 WHEN 2  THEN 0.80 WHEN 3  THEN 0.85
        WHEN 4  THEN 0.90 WHEN 5  THEN 1.05 WHEN 6  THEN 1.10
        WHEN 7  THEN 1.15 WHEN 8  THEN 1.10 WHEN 9  THEN 1.05
        WHEN 10 THEN 0.95 WHEN 11 THEN 0.85 ELSE 0.70
      END;

      occ_thresh := LEAST(0.97, rec.base_occ * seas_mult);

      IF random() < occ_thresh THEN
        -- Elegir huésped aleatorio de la empresa
        SELECT id INTO gid
        FROM public.guests
        WHERE company_id = rec.company_id
        ORDER BY random() LIMIT 1;

        INSERT INTO public.stays (
          id, guest_id, room_id, company_id, allocation_id,
          shift_type, checked_in_at, checked_out_at, estimated_checkout
        ) VALUES (
          gen_random_uuid(),
          gid,
          rec.room_id,
          rec.company_id,
          rec.alloc_id,
          '14x14',
          (rot_date || ' 14:00:00')::timestamptz,
          ((rot_date + 13) || ' 11:00:00')::timestamptz,
          rot_date + 13
        );
      END IF;

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seed completado.';
  RAISE NOTICE 'Propiedades: %', (SELECT count(*) FROM public.properties WHERE id IN (p_norte,p_minero,p_sol));
  RAISE NOTICE 'Habitaciones: %', (SELECT count(*) FROM public.rooms WHERE property_id IN (p_norte,p_minero,p_sol));
  RAISE NOTICE 'Empresas: %', (SELECT count(*) FROM public.companies WHERE id IN (c_mc,c_ct,c_nm,c_am,c_en));
  RAISE NOTICE 'Huéspedes: %', (SELECT count(*) FROM public.guests WHERE company_id IN (c_mc,c_ct,c_nm,c_am,c_en));
  RAISE NOTICE 'Estadías: %', (SELECT count(*) FROM public.stays WHERE company_id IN (c_mc,c_ct,c_nm,c_am,c_en));

END $$;
