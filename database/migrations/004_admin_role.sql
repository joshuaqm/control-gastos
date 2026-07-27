-- ============================================================
-- Admin role + columna role en profiles
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('admin', 'user'));

-- Actualizar el primer usuario como admin (para que puedas gestionar la app)
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
);

-- Solo admins pueden crear nuevos usuarios (vía API)
CREATE POLICY "Solo admins pueden insertar perfiles" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
