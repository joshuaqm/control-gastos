-- 1. EXTENSIONES (Útil si usas Supabase para IDs únicos)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE CUENTAS / FINTECHS / BOLSOS
-- Representa donde vive el dinero (ej. Nu México, BBVA, Efectivo, Cajita Nu)
CREATE TABLE cuentas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL UNIQUE, -- ej. "Nu México", "Efectivo", "BBVA"
    tipo VARCHAR(30) NOT NULL DEFAULT 'debito', -- 'debito', 'credito', 'inversion', 'efectivo'
    saldo_actual DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    moneda VARCHAR(3) DEFAULT 'MXN',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE CATEGORÍAS
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL UNIQUE, -- ej. "Comida", "Transporte", "Salario", "Préstamos"
    tipo VARCHAR(20) CHECK (tipo IN ('gasto', 'ingreso', 'ambos')) NOT NULL,
    icono VARCHAR(30) -- Para la UI en React/NextJS (ej. "utensils", "car", "wallet")
);

-- 4. TABLA PRINCIPAL DE TRANSACCIONES
-- Almacena cada gasto, ingreso o ajuste enviado por voz
CREATE TABLE transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(30) NOT NULL CHECK (
        tipo IN ('gasto', 'ingreso', 'prestamo_otorgado', 'prestamo_cobrado', 'actualizacion_saldo', 'transferencia')
    ),
    monto DECIMAL(12, 2) NOT NULL CHECK (monto >= 0),
    descripcion TEXT,
    
    -- Relaciones
    cuenta_id UUID REFERENCES cuentas(id) ON DELETE SET NULL,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    
    -- Para préstamos (Cuentas por cobrar / pagar)
    deudor_acreedor VARCHAR(100), -- Nombre de la persona (ej. "Pedro")
    
    -- Texto original capturado por Siri para auditoría o re-procesamiento con IA
    raw_voice_text TEXT, 
    
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE CONTROL DE PRÉSTAMOS (Saldos pendientes por persona)
CREATE TABLE prestamos_resumen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona VARCHAR(100) NOT NULL UNIQUE,
    saldo_pendiente DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Positivo = te deben, Negativo = debes
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);