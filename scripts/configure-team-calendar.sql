-- ============================================================================
-- Script: Configurar Calendario del Equipo
-- ============================================================================
-- Propósito: Configurar o verificar el calendar_url de un equipo
-- Requisito: El calendario debe estar configurado como público en Google Calendar
--
-- Uso:
--   1. Reemplazar 'TEAM_ID_AQUI' con el ID real del equipo
--   2. Reemplazar 'CALENDAR_URL_AQUI' con la URL de embed de Google Calendar
--   3. Ejecutar contra la base de datos
-- ============================================================================

-- Ver todos los equipos y su configuración de calendario
SELECT 
  id,
  name,
  manager_user_id,
  calendar_url,
  CASE 
    WHEN calendar_url IS NULL THEN '❌ No configurado'
    WHEN calendar_url LIKE '%calendar.google.com%' THEN '✅ Google Calendar'
    ELSE '⚠️  URL desconocida'
  END as status
FROM teams
ORDER BY name;

-- Ver equipos con miembros y calendario
SELECT 
  t.id,
  t.name,
  t.calendar_url,
  u.full_name as manager_name,
  COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN users u ON t.manager_user_id = u.id
LEFT JOIN team_membership tm ON t.id = tm.team_id
GROUP BY t.id, t.name, t.calendar_url, u.full_name
ORDER BY t.name;

-- ============================================================================
-- CONFIGURAR CALENDARIO - Opción 1: Team específico por ID
-- ============================================================================
-- Reemplazar 'TEAM_ID_AQUI' y 'CALENDAR_URL_AQUI'
/*
UPDATE teams
SET calendar_url = 'https://calendar.google.com/calendar/embed?src=CALENDAR_ID&mode=week'
WHERE id = 'TEAM_ID_AQUI';
*/

-- ============================================================================
-- CONFIGURAR CALENDARIO - Opción 2: Team por nombre
-- ============================================================================
-- Reemplazar 'TEAM_NAME_AQUI' y 'CALENDAR_URL_AQUI'
/*
UPDATE teams
SET calendar_url = 'https://calendar.google.com/calendar/embed?src=CALENDAR_ID&mode=week'
WHERE name = 'TEAM_NAME_AQUI';
*/

-- ============================================================================
-- CONFIGURAR CALENDARIO - Opción 3: Primer team encontrado (desarrollo)
-- ============================================================================
-- ⚠️ SOLO PARA DESARROLLO - Configura el primer equipo encontrado
/*
UPDATE teams
SET calendar_url = 'https://calendar.google.com/calendar/embed?src=CALENDAR_ID&mode=week'
WHERE id = (SELECT id FROM teams ORDER BY created_at LIMIT 1);
*/

-- ============================================================================
-- LIMPIAR CALENDARIO (remover configuración)
-- ============================================================================
/*
UPDATE teams
SET calendar_url = NULL
WHERE id = 'TEAM_ID_AQUI';
*/

-- ============================================================================
-- VERIFICAR CAMBIOS
-- ============================================================================
-- Ejecutar después de UPDATE para confirmar cambios
SELECT 
  id,
  name,
  calendar_url,
  CASE 
    WHEN calendar_url IS NULL THEN '❌ No configurado'
    WHEN calendar_url LIKE '%embed%' THEN '✅ URL de embed correcta'
    WHEN calendar_url LIKE '%calendar.google.com%' THEN '⚠️  URL de Google pero no embed'
    ELSE '⚠️  URL desconocida'
  END as validation_status
FROM teams
WHERE calendar_url IS NOT NULL;

-- ============================================================================
-- EJEMPLO DE URL CORRECTA
-- ============================================================================
-- Formato correcto (con embed y mode=week):
-- https://calendar.google.com/calendar/embed?src=tu-email@gmail.com&mode=week
--
-- O con calendar ID público:
-- https://calendar.google.com/calendar/embed?src=abcd1234@group.calendar.google.com&mode=week
--
-- ❌ FORMATO INCORRECTO (sin embed):
-- https://calendar.google.com/calendar/r?cid=tu-email@gmail.com
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- Ver qué usuario verá el calendario en /home
-- (muestra el primer equipo con calendar_url de cada usuario)
SELECT DISTINCT ON (u.id)
  u.id as user_id,
  u.email,
  u.full_name,
  t.name as team_name,
  t.calendar_url,
  CASE 
    WHEN t.calendar_url IS NULL THEN '❌ No verá calendario'
    ELSE '✅ Verá calendario'
  END as home_page_status
FROM users u
INNER JOIN team_membership tm ON u.id = tm.user_id
INNER JOIN teams t ON tm.team_id = t.id
WHERE u.is_active = true
ORDER BY u.id, t.created_at;

-- Ver usuarios sin calendario configurado en ningún equipo
SELECT 
  u.id,
  u.email,
  u.full_name,
  STRING_AGG(t.name, ', ') as teams_without_calendar
FROM users u
INNER JOIN team_membership tm ON u.id = tm.user_id
INNER JOIN teams t ON tm.team_id = t.id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.full_name
HAVING COUNT(CASE WHEN t.calendar_url IS NOT NULL THEN 1 END) = 0
ORDER BY u.full_name;

