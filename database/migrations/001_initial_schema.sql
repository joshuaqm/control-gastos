-- ============================================================
-- ESQUEMA COMPLETO: Asistente Financiero Personal
-- Versión: 2.0
-- ============================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. CATEGORÍAS
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(50) NOT NULL UNIQUE,
  tipo VARCHAR(20) CHECK (tipo IN ('gasto', 'ingreso', 'ambos')) NOT NULL,
  icono VARCHAR(50),
  color VARCHAR(7),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- 3. CUENTAS
CREATE TABLE cuentas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(50) NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'debito'
    CHECK (tipo IN ('debito', 'credito', 'efectivo', 'inversion', 'fintech')),
  saldo_actual DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  moneda VARCHAR(3) DEFAULT 'MXN',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(nombre, user_id)
);

ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;

-- 4. TRANSACCIONES (Modelo rico)
CREATE TABLE transacciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Fechas
  fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  fecha_original TEXT,

  -- Monto y moneda
  monto DECIMAL(12, 2) NOT NULL CHECK (monto >= 0),
  moneda VARCHAR(3) DEFAULT 'MXN',

  -- Clasificación principal
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
    'gasto', 'ingreso', 'transferencia',
    'prestamo_otorgado', 'prestamo_recibido',
    'pago_deuda', 'abono_tarjeta',
    'compra_meses', 'actualizacion_saldo'
  )),
  categoria VARCHAR(50),
  subcategoria VARCHAR(50),

  -- Descripción
  descripcion TEXT,
  texto_original TEXT,

  -- Comercio y ubicación
  comercio VARCHAR(100),
  ubicacion VARCHAR(100),

  -- Financiero
  cuenta VARCHAR(50),
  metodo_pago VARCHAR(50),

  -- Organización
  proyecto VARCHAR(100),
  viaje VARCHAR(100),
  etiquetas TEXT[] DEFAULT '{}',

  -- Personas
  persona_relacionada VARCHAR(100),

  -- Préstamos
  prestamo_relacionado UUID,
  prestamo_tipo VARCHAR(20) CHECK (prestamo_tipo IN ('otorgado', 'recibido')),

  -- Transferencias
  transferencia_relacionada UUID,
  transferencia_tipo VARCHAR(20) CHECK (transferencia_tipo IN ('entrante', 'saliente')),

  -- Compras a meses
  meses_total INT,
  meses_restantes INT,

  -- Recurrencia
  movimiento_recurrente VARCHAR(50),
  frecuencia_recurrencia VARCHAR(20) CHECK (frecuencia_recurrencia IN ('diario', 'semanal', 'quincenal', 'mensual', 'anual')),

  -- IA metadata
  confianza DECIMAL(3, 2),

  -- Búsqueda semántica (futuro)
  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_transacciones_user_id ON transacciones(user_id);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha DESC);
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX idx_transacciones_categoria ON transacciones(categoria);
CREATE INDEX idx_transacciones_persona ON transacciones(persona_relacionada);
CREATE INDEX idx_transacciones_comercio ON transacciones(comercio);
CREATE INDEX idx_transacciones_viaje ON transacciones(viaje);
CREATE INDEX idx_transacciones_proyecto ON transacciones(proyecto);
CREATE INDEX idx_transacciones_etiquetas ON transacciones USING GIN(etiquetas);
CREATE INDEX idx_transacciones_texto ON transacciones USING GIN(to_tsvector('spanish', coalesce(descripcion, '') || ' ' || coalesce(texto_original, '')));

ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

-- 5. PRÉSTAMOS (Resumen por persona)
CREATE TABLE prestamos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('otorgado', 'recibido')),
  monto_original DECIMAL(12, 2) NOT NULL,
  saldo_pendiente DECIMAL(12, 2) NOT NULL,
  descripcion TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(persona, tipo, user_id)
);

ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;

-- 6. PRESUPUESTOS
CREATE TABLE presupuestos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria VARCHAR(50) NOT NULL,
  monto_limite DECIMAL(12, 2) NOT NULL,
  periodo VARCHAR(20) NOT NULL DEFAULT 'mensual'
    CHECK (periodo IN ('semanal', 'quincenal', 'mensual', 'anual')),
  mes INT,
  año INT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(categoria, periodo, mes, año, user_id)
);

ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- 7. METAS
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  monto_objetivo DECIMAL(12, 2) NOT NULL,
  monto_actual DECIMAL(12, 2) NOT NULL DEFAULT 0,
  fecha_limite DATE,
  categoria VARCHAR(50),
  icono VARCHAR(50),
  color VARCHAR(7),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- 8. MOVIMIENTOS RECURRENTES
CREATE TABLE movimientos_recurrentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descripcion TEXT,
  monto DECIMAL(12, 2) NOT NULL,
  categoria VARCHAR(50),
  cuenta VARCHAR(50),
  frecuencia VARCHAR(20) NOT NULL CHECK (frecuencia IN ('diario', 'semanal', 'quincenal', 'mensual', 'anual')),
  dia INT,
  dia_semana INT,
  mes INT,
  activo BOOLEAN DEFAULT TRUE,
  ultima_ejecucion TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE movimientos_recurrentes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Políticas para transacciones
CREATE POLICY "Usuarios ven solo sus transacciones" ON transacciones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus transacciones" ON transacciones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus transacciones" ON transacciones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus transacciones" ON transacciones
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para cuentas
CREATE POLICY "Usuarios ven solo sus cuentas" ON cuentas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus cuentas" ON cuentas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus cuentas" ON cuentas
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para préstamos
CREATE POLICY "Usuarios ven solo sus prestamos" ON prestamos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus prestamos" ON prestamos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus prestamos" ON prestamos
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para presupuestos
CREATE POLICY "Usuarios ven solo sus presupuestos" ON presupuestos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus presupuestos" ON presupuestos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus presupuestos" ON presupuestos
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para metas
CREATE POLICY "Usuarios ven solo sus metas" ON metas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus metas" ON metas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus metas" ON metas
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para movimientos recurrentes
CREATE POLICY "Usuarios ven solo sus recurrentes" ON movimientos_recurrentes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus recurrentes" ON movimientos_recurrentes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus recurrentes" ON movimientos_recurrentes
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transacciones_updated_at
  BEFORE UPDATE ON transacciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cuentas_updated_at
  BEFORE UPDATE ON cuentas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_prestamos_updated_at
  BEFORE UPDATE ON prestamos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_presupuestos_updated_at
  BEFORE UPDATE ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_metas_updated_at
  BEFORE UPDATE ON metas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Actualizar saldo de cuenta al insertar transacción
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
DECLARE
  cuenta_id UUID;
BEGIN
  SELECT id INTO cuenta_id FROM cuentas
  WHERE nombre = NEW.cuenta AND user_id = NEW.user_id;

  IF cuenta_id IS NOT NULL THEN
    IF NEW.tipo IN ('gasto', 'prestamo_otorgado', 'pago_deuda', 'abono_tarjeta') THEN
      UPDATE cuentas SET saldo_actual = saldo_actual - NEW.monto WHERE id = cuenta_id;
    ELSIF NEW.tipo IN ('ingreso', 'prestamo_recibido') THEN
      UPDATE cuentas SET saldo_actual = saldo_actual + NEW.monto WHERE id = cuenta_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_saldo
  AFTER INSERT ON transacciones
  FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cuenta();

-- Actualizar resumen de préstamos
CREATE OR REPLACE FUNCTION actualizar_prestamo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'prestamo_otorgado' AND NEW.persona_relacionada IS NOT NULL THEN
    INSERT INTO prestamos (persona, tipo, monto_original, saldo_pendiente, user_id)
    VALUES (NEW.persona_relacionada, 'otorgado', NEW.monto, NEW.monto, NEW.user_id)
    ON CONFLICT (persona, tipo, user_id)
    DO UPDATE SET saldo_pendiente = prestamos.saldo_pendiente + NEW.monto,
                  updated_at = CURRENT_TIMESTAMP;
  END IF;

  IF NEW.tipo = 'prestamo_recibido' AND NEW.persona_relacionada IS NOT NULL THEN
    INSERT INTO prestamos (persona, tipo, monto_original, saldo_pendiente, user_id)
    VALUES (NEW.persona_relacionada, 'recibido', NEW.monto, NEW.monto, NEW.user_id)
    ON CONFLICT (persona, tipo, user_id)
    DO UPDATE SET saldo_pendiente = prestamos.saldo_pendiente + NEW.monto,
                  updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_prestamo
  AFTER INSERT ON transacciones
  FOR EACH ROW
  WHEN (NEW.tipo IN ('prestamo_otorgado', 'prestamo_recibido'))
  EXECUTE FUNCTION actualizar_prestamo();

-- ============================================================
-- SEED DATA (Categorías por defecto)
-- ============================================================

INSERT INTO categorias (nombre, tipo, icono, color) VALUES
  ('Comida', 'gasto', 'utensils', '#ef4444'),
  ('Supermercado', 'gasto', 'shopping-cart', '#f97316'),
  ('Transporte', 'gasto', 'car', '#3b82f6'),
  ('Gasolina', 'gasto', 'fuel', '#06b6d4'),
  ('Uber/Didi', 'gasto', 'navigation', '#8b5cf6'),
  ('Entretenimiento', 'gasto', 'film', '#ec4899'),
  ('Suscripciones', 'gasto', 'repeat', '#14b8a6'),
  ('Salud', 'gasto', 'heart', '#22c55e'),
  ('Educación', 'gasto', 'book', '#6366f1'),
  ('Ropa', 'gasto', 'shirt', '#d946ef'),
  ('Tecnología', 'gasto', 'monitor', '#0ea5e9'),
  ('Hogar', 'gasto', 'home', '#84cc16'),
  ('Servicios', 'gasto', 'zap', '#eab308'),
  ('Viajes', 'gasto', 'plane', '#06b6d4'),
  ('Regalos', 'gasto', 'gift', '#f43f5e'),
  ('Mascotas', 'gasto', 'paw-print', '#a855f7'),
  ('Impuestos', 'gasto', 'landmark', '#64748b'),
  ('Salario', 'ingreso', 'briefcase', '#22c55e'),
  ('Freelance', 'ingreso', 'laptop', '#3b82f6'),
  ('Inversión', 'ingreso', 'trending-up', '#8b5cf6'),
  ('Ahorro', 'ambos', 'piggy-bank', '#14b8a6'),
  ('Préstamos', 'ambos', 'hand-coins', '#f59e0b'),
  ('Transferencia', 'ambos', 'arrow-left-right', '#6366f1')
ON CONFLICT (nombre) DO NOTHING;
