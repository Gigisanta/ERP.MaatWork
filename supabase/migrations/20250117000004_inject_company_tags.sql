-- =============================================
-- MIGRACIÓN: Inyección de Etiquetas de Empresas
-- =============================================
-- Propósito: Insertar etiquetas predefinidas para las empresas del sistema
-- Fecha: 2025-01-17
-- Archivo: 20250117000004_inject_company_tags.sql
-- Etiquetas: Balanz, Cocos, Z. Invest, Z. Options, Z. Impact, Patrimonial

BEGIN;

-- =============================================
-- BACKUP Y DIAGNÓSTICO
-- =============================================

-- Crear tabla de respaldo de etiquetas existentes
CREATE TABLE IF NOT EXISTS tags_backup_before_company_injection AS 
SELECT * FROM public.tags;

-- Log del estado inicial
DO $$
DECLARE
    existing_tags_count INTEGER;
    admin_user_id UUID;
BEGIN
    SELECT COUNT(*) INTO existing_tags_count FROM public.tags;
    
    -- Obtener el primer usuario admin o el primer usuario disponible
    SELECT id INTO admin_user_id 
    FROM public.users 
    WHERE role = 'admin' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Si no hay admin, usar el primer usuario disponible
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id 
        FROM public.users 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;
    
    RAISE NOTICE '=== INYECCIÓN DE ETIQUETAS DE EMPRESAS ===';
    RAISE NOTICE 'Etiquetas existentes: %', existing_tags_count;
    RAISE NOTICE 'Usuario para creación: %', COALESCE(admin_user_id::text, 'NINGUNO');
END $$;

-- =============================================
-- LIMPIAR ETIQUETAS EXISTENTES (OPCIONAL)
-- =============================================

-- Eliminar etiquetas existentes que puedan coincidir con las nuevas
-- Esto evita duplicados y asegura que tengamos las etiquetas correctas
DELETE FROM public.tags 
WHERE name IN ('Balanz', 'Cocos', 'Z. Invest', 'Z. Options', 'Z. Impact', 'Patrimonial');

-- =============================================
-- INSERTAR NUEVAS ETIQUETAS DE EMPRESAS
-- =============================================

-- Función auxiliar para obtener el usuario admin o primer usuario
CREATE OR REPLACE FUNCTION get_admin_or_first_user()
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Intentar obtener un usuario admin
    SELECT id INTO user_id 
    FROM public.users 
    WHERE role = 'admin' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Si no hay admin, obtener el primer usuario
    IF user_id IS NULL THEN
        SELECT id INTO user_id 
        FROM public.users 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Insertar las etiquetas de empresas con colores distintivos
INSERT INTO public.tags (id, name, color, backgroundColor, created_at, created_by)
VALUES 
    -- Balanz - Azul corporativo
    (gen_random_uuid(), 'Balanz', '#ffffff', '#1e40af', NOW(), get_admin_or_first_user()),
    
    -- Cocos - Verde natural
    (gen_random_uuid(), 'Cocos', '#ffffff', '#059669', NOW(), get_admin_or_first_user()),
    
    -- Z. Invest - Púrpura profesional
    (gen_random_uuid(), 'Z. Invest', '#ffffff', '#7c3aed', NOW(), get_admin_or_first_user()),
    
    -- Z. Options - Naranja dinámico
    (gen_random_uuid(), 'Z. Options', '#ffffff', '#ea580c', NOW(), get_admin_or_first_user()),
    
    -- Z. Impact - Rojo impactante
    (gen_random_uuid(), 'Z. Impact', '#ffffff', '#dc2626', NOW(), get_admin_or_first_user()),
    
    -- Patrimonial - Dorado elegante
    (gen_random_uuid(), 'Patrimonial', '#000000', '#f59e0b', NOW(), get_admin_or_first_user())

ON CONFLICT (name) DO UPDATE SET
    color = EXCLUDED.color,
    backgroundColor = EXCLUDED.backgroundColor,
    created_at = NOW();

-- =============================================
-- VERIFICACIÓN Y LOGGING
-- =============================================

DO $$
DECLARE
    inserted_count INTEGER;
    total_tags INTEGER;
    company_tags_record RECORD;
BEGIN
    -- Contar etiquetas insertadas
    SELECT COUNT(*) INTO inserted_count 
    FROM public.tags 
    WHERE name IN ('Balanz', 'Cocos', 'Z. Invest', 'Z. Options', 'Z. Impact', 'Patrimonial');
    
    SELECT COUNT(*) INTO total_tags FROM public.tags;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ === ETIQUETAS DE EMPRESAS INSERTADAS ===';
    RAISE NOTICE '📊 Etiquetas de empresas creadas: %', inserted_count;
    RAISE NOTICE '📊 Total de etiquetas en sistema: %', total_tags;
    RAISE NOTICE '';
    RAISE NOTICE '🏢 Etiquetas creadas:';
    
    -- Mostrar detalles de cada etiqueta creada
    FOR company_tags_record IN 
        SELECT name, color, backgroundColor 
        FROM public.tags 
        WHERE name IN ('Balanz', 'Cocos', 'Z. Invest', 'Z. Options', 'Z. Impact', 'Patrimonial')
        ORDER BY name
    LOOP
        RAISE NOTICE '   • % (Texto: %, Fondo: %)', 
            company_tags_record.name, 
            company_tags_record.color, 
            company_tags_record.backgroundColor;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =============================================
-- LIMPIAR FUNCIÓN AUXILIAR
-- =============================================

-- Eliminar la función auxiliar ya que no la necesitamos permanentemente
DROP FUNCTION IF EXISTS get_admin_or_first_user();

-- =============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE public.tags IS 'Tabla de etiquetas del sistema CRM - Actualizada con etiquetas de empresas (2025-01-17)';

-- =============================================
-- FINALIZACIÓN
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===== MIGRACIÓN COMPLETADA EXITOSAMENTE =====';
    RAISE NOTICE '✅ Etiquetas de empresas inyectadas correctamente';
    RAISE NOTICE '✅ Colores distintivos asignados';
    RAISE NOTICE '✅ Backup disponible en: tags_backup_before_company_injection';
    RAISE NOTICE '📋 Las etiquetas están listas para usar en la interfaz';
    RAISE NOTICE '';
END $$;

COMMIT;

-- =============================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =============================================

/*
ETIQUETAS CREADAS:

1. 🏢 Balanz      - Azul corporativo (#1e40af / #ffffff)
2. 🥥 Cocos       - Verde natural (#059669 / #ffffff)  
3. 💼 Z. Invest   - Púrpura profesional (#7c3aed / #ffffff)
4. 📈 Z. Options  - Naranja dinámico (#ea580c / #ffffff)
5. 🎯 Z. Impact   - Rojo impactante (#dc2626 / #ffffff)
6. 💰 Patrimonial - Dorado elegante (#f59e0b / #000000)

PRÓXIMOS PASOS:
1. Verificar que las etiquetas aparezcan en la interfaz
2. Probar asignación de etiquetas a contactos
3. Verificar colores en modo claro y oscuro
4. Eliminar backup si todo funciona: DROP TABLE tags_backup_before_company_injection;

ROLLBACK EN EMERGENCIA:
- Restaurar desde backup: INSERT INTO public.tags SELECT * FROM tags_backup_before_company_injection;
*/