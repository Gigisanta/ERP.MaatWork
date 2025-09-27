-- Crear políticas RLS para la tabla tags
-- Permite operaciones CRUD a usuarios autenticados

-- Política para SELECT: permite a usuarios autenticados ver todas las etiquetas
CREATE POLICY "tags_select_policy" ON "public"."tags"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- Política para INSERT: permite a usuarios autenticados crear etiquetas
CREATE POLICY "tags_insert_policy" ON "public"."tags"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para UPDATE: permite a usuarios autenticados actualizar etiquetas
CREATE POLICY "tags_update_policy" ON "public"."tags"
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para DELETE: permite a usuarios autenticados eliminar etiquetas
CREATE POLICY "tags_delete_policy" ON "public"."tags"
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (true);

-- Otorgar permisos básicos a los roles anon y authenticated
GRANT SELECT ON "public"."tags" TO anon;
GRANT ALL PRIVILEGES ON "public"."tags" TO authenticated;

-- Comentario de la migración
COMMENT ON TABLE "public"."tags" IS 'Tabla para almacenar las etiquetas del sistema CRM con políticas RLS configuradas';