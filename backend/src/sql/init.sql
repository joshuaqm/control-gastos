-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear tablas básicas
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    initial_balance DECIMAL(12,2) DEFAULT 0,
    credit_limit DECIMAL(12,2),
    interest_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    budget_type VARCHAR(10),
    account_id INTEGER,
    destination_account_id INTEGER,
    debt_id INTEGER,
    receivable_id INTEGER,
    recurring_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    creditor VARCHAR(100) NOT NULL,
    type VARCHAR(20),
    original_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2),
    start_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receivables (
    id SERIAL PRIMARY KEY,
    person VARCHAR(100) NOT NULL,
    description VARCHAR(200),
    original_amount DECIMAL(12,2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    month DATE NOT NULL,
    budget_type VARCHAR(10) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# 3. Verificar que se creó correctamente
ls -la backend/sql/init.sql
cat backend/sql/init.sql | head -10
Paso 4: Si VSCode aún tiene problemas, reiniciar VSCode
bash
# 1. Cerrar VSCode completamente

# 2. Desde la terminal, abrir VSCode con permisos adecuados
code .

# O si usas WSL:
code .

# 3. Probar editar el archivo nuevamente
🔧 SOLUCIÓN PARA WSL (Windows Subsystem for Linux)
En WSL, los problemas de permisos son comunes. Aquí hay soluciones específicas:

Opción 1: Configurar WSL para usar el usuario correcto
bash
# 1. Verificar tu usuario en WSL
whoami

# 2. Crear un archivo de configuración de WSL
# Crear o editar /etc/wsl.conf
sudo nano /etc/wsl.conf

# Agregar estas líneas:
[user]
default=joshu

[automount]
options="metadata,umask=022,fmask=011"

# 3. Reiniciar WSL
# En PowerShell (como administrador):
wsl --shutdown

# 4. Abrir WSL nuevamente
Opción 2: Usar chown recursivo en todo el proyecto
bash
# Cambiar propietario de todo el proyecto
sudo chown -R $USER:$USER ~/projects/control-gastos/

# Verificar
ls -la ~/projects/control-gastos/backend/sql/
🚀 SOLUCIÓN DEFINITIVA (TODO EN UNO)
bash
#!/bin/bash

echo "🔧 Reparando permisos de archivos..."

# 1. Detener Docker
docker-compose down

# 2. Cambiar propietario de todo el proyecto
sudo chown -R $USER:$USER ~/projects/control-gastos/

# 3. Eliminar archivo problemático si existe
sudo rm -f backend/sql/init.sql 2>/dev/null || true

# 4. Crear directorio y archivo
mkdir -p backend/sql
touch backend/sql/init.sql

# 5. Escribir contenido básico
cat > backend/sql/init.sql << 'EOF'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    initial_balance DECIMAL(12,2) DEFAULT 0,
    credit_limit DECIMAL(12,2),
    interest_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    budget_type VARCHAR(10),
    account_id INTEGER,
    destination_account_id INTEGER,
    debt_id INTEGER,
    receivable_id INTEGER,
    recurring_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);