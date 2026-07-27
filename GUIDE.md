# Guía de despliegue - Asistente Financiero

## 1. Supabase (Base de datos + Auth)

### Obtener Service Role Key
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `fstbruybtcvronjctwyh`
3. Ve a **Configuración** → **API**
4. Copia la `service_role key` (¡mantenla secreta!)
5. Pégala en `.env.local` como `SUPABASE_SERVICE_ROLE_KEY`

### Ejecutar migraciones (ya lo hiciste)
```
database/migrations/
├── 001_initial_schema.sql    → Tablas + RLS + Triggers
├── 002_rpc_functions.sql     → Funciones RPC
├── 003_profiles.sql          → Tabla profiles + trigger
```

## 2. Autenticación

En Supabase Dashboard → Authentication → Settings:

### Configurar URLs
- **Site URL**: `http://localhost:3000` (dev) o `https://tu-app.vercel.app` (prod)
- **Redirect URLs**: `http://localhost:3000/auth/callback`

### Habilitar proveedores
- Email/Password: habilitado por defecto

## 3. OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com/api-keys)
2. Crea una API Key
3. En `.env.local`: `OPENAI_API_KEY=sk-...`

## 4. Desarrollo local

```bash
# Instalar dependencias (ya instalado)
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre `http://localhost:3000` → te redirige a `/login`

## 5. Despliegue en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel --prod
```

### Variables de entorno en Vercel
Ve a Project Settings → Environment Variables y agrega:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fstbruybtcvronjctwyh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key de Supabase |
| `OPENAI_API_KEY` | tu API key de OpenAI |
| `OPENAI_MODEL` | `gpt-4o` |
| `WEBHOOK_SECRET` | clave secreta para webhooks |
| `NEXT_PUBLIC_SITE_URL` | URL de tu app en Vercel |

## 6. Integración con Siri / Shortcuts

Crea un Atajo en iPhone que haga POST a:

```
https://tu-app.vercel.app/api/voice
```

Headers:
```
Content-Type: application/json
x-api-key: mi_clave_secreta_123
```

Body:
```json
{
  "texto": "Hoy gasté 350 pesos en tacos"
}
```

## Rutas de la app

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión / registro |
| `/dashboard` | Dashboard con gráficas |
| `/register` | Registro por voz |
| `/chat` | Chat financiero con IA |
| `/search` | Buscador inteligente |
| `/loans` | Gestión de préstamos |
| `/budgets` | Presupuestos |
| `/goals` | Metas financieras |
| `/settings` | Configuración |
