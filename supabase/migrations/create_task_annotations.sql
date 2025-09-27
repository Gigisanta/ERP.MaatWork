-- Crear tabla de anotaciones para tareas
CREATE TABLE IF NOT EXISTS task_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_task_annotations_task_id ON task_annotations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_annotations_user_id ON task_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_task_annotations_created_at ON task_annotations(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE task_annotations ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver anotaciones de tareas de su equipo
CREATE POLICY "Users can view team task annotations" ON task_annotations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE t.id = task_annotations.task_id
      AND tm.user_id = auth.uid()
    )
  );

-- Política para que los usuarios puedan crear anotaciones en tareas de su equipo
CREATE POLICY "Users can create team task annotations" ON task_annotations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE t.id = task_annotations.task_id
      AND tm.user_id = auth.uid()
    )
  );

-- Política para que los usuarios puedan actualizar sus propias anotaciones
CREATE POLICY "Users can update own annotations" ON task_annotations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política para que los usuarios puedan eliminar sus propias anotaciones
CREATE POLICY "Users can delete own annotations" ON task_annotations
  FOR DELETE
  USING (user_id = auth.uid());

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_task_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_task_annotations_updated_at_trigger
  BEFORE UPDATE ON task_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_task_annotations_updated_at();

-- Otorgar permisos a los roles
GRANT ALL PRIVILEGES ON task_annotations TO authenticated;
GRANT SELECT ON task_annotations TO anon;