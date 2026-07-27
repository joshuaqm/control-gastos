import os
from typing import Literal, Optional
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from supabase import create_client, Client

app = FastAPI(title="Voice Expense Tracker - Supabase Integration")

# 1. Configuración de Clientes (Gemini & Supabase)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") # Service Role Key o Anon Key con políticas RLS

if not all([GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    raise RuntimeError("Faltan variables de entorno requeridas (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY).")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# 2. Esquema de Pydantic para el Output Estructurado de Gemini
class TransactionSchema(BaseModel):
    tipo: Literal["gasto", "ingreso", "prestamo_otorgado", "prestamo_cobrado", "actualizacion_saldo"] = Field(
        description="El tipo de movimiento financiero detectado."
    )
    monto: float = Field(
        description="Monto numérico de la transacción."
    )
    categoria: str = Field(
        description="Categoría sugerida (Ej: Comida/Restaurantes, Transporte, Ingresos/Salario, Deudas/Préstamos, Ahorro/Inversión)."
    )
    cuenta_origen: str = Field(
        default="Efectivo/Débito",
        description="Cuenta o fintech involucrada (Ej: Nu México, BBVA, Efectivo/Débito)."
    )
    descripcion: str = Field(
        description="Breve resumen del movimiento."
    )
    deudor_acreedor: Optional[str] = Field(
        default=None,
        description="Nombre de la persona si aplica un préstamo o cobro."
    )


class VoiceInput(BaseModel):
    texto: str


SYSTEM_PROMPT = """
Eres un asistente financiero experto en parsear transcripciones de voz a transacciones contables.
Reglas:
1. Si el usuario dice 'Le presté X a Y', tipo es 'prestamo_otorgado' y deudor_acreedor es Y.
2. Si el usuario habla de ahorros o saldos ('Tengo ahorrados 10000 en Nu México'), tipo es 'actualizacion_saldo' y cuenta_origen es 'Nu México'.
3. Normaliza nombres de bancos/fintechs (ej. 'Nu México', 'BBVA', 'Efectivo/Débito').
4. Si no se especifica cuenta, usa 'Efectivo/Débito'.
"""

# 3. Funciones auxiliares para Supabase

def get_or_create_cuenta_id(nombre_cuenta: str) -> str:
    """Busca el ID de una cuenta por nombre. Si no existe, la crea con saldo 0."""
    res = supabase.table("cuentas").select("id").eq("nombre", nombre_cuenta).execute()
    if res.data:
        return res.data[0]["id"]
    
    # Si no existe la cuenta, la creamos dinámicamente
    new_account = supabase.table("cuentas").insert({"nombre": nombre_cuenta, "tipo": "debito", "saldo_actual": 0}).execute()
    return new_account.data[0]["id"]


def get_or_create_categoria_id(nombre_cat: str, tipo_movimiento: str) -> str:
    """Busca el ID de una categoría. Si no existe, la crea."""
    res = supabase.table("categorias").select("id").eq("nombre", nombre_cat).execute()
    if res.data:
        return res.data[0]["id"]
    
    cat_tipo = "gasto" if tipo_movimiento in ["gasto", "prestamo_otorgado"] else "ingreso"
    new_cat = supabase.table("categorias").insert({"nombre": nombre_cat, "tipo": cat_tipo}).execute()
    return new_cat.data[0]["id"]


# 4. Endpoint Principal
@app.post("/api/v1/parse-voice")
async def parse_and_save_voice_transaction(
    input_data: VoiceInput,
    x_api_key: Optional[str] = Header(None)
):
    # Seguridad básica para Siri Webhook
    SECRET_KEY = os.getenv("WEBHOOK_SECRET", "mi_clave_secreta_123")
    if x_api_key != SECRET_KEY:
        raise HTTPException(status_code=401, detail="No autorizado")

    if not input_data.texto.strip():
        raise HTTPException(status_code=400, detail="El texto recibido está vacío.")

    try:
        # A. Extracción estructurada con Gemini 2.5 Flash
        ai_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=input_data.texto,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=TransactionSchema,
                temperature=0.1,
            ),
        )

        # Parsear salida de IA con Pydantic
        tx_data = TransactionSchema.model_validate_json(ai_response.text)

        # B. Resolución de relaciones en Supabase
        cuenta_id = get_or_create_cuenta_id(tx_data.cuenta_origen)
        categoria_id = get_or_create_categoria_id(tx_data.categoria, tx_data.tipo)

        # C. Construir payload de la transacción para PostgreSQL
        db_payload = {
            "tipo": tx_data.tipo,
            "monto": tx_data.monto,
            "descripcion": tx_data.descripcion,
            "cuenta_id": cuenta_id,
            "categoria_id": categoria_id,
            "deudor_acreedor": tx_data.deudor_acreedor,
            "raw_voice_text": input_data.texto
        }

        # D. Insertar Registro de la Transacción
        insert_res = supabase.table("transacciones").insert(db_payload).execute()
        
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Error al guardar en Supabase.")

        transaction_record = insert_res.data[0]

        # E. Lógica especial para Préstamos en tabla `prestamos_resumen` (opcional)
        if tx_data.tipo == "prestamo_otorgado" and tx_data.deudor_acreedor:
            persona = tx_data.deudor_acreedor
            # Verificar si existe la persona
            prestamo_existente = supabase.table("prestamos_resumen").select("*").eq("persona", persona).execute()
            if prestamo_existente.data:
                nuevo_saldo = float(prestamo_existente.data[0]["saldo_pendiente"]) + tx_data.monto
                supabase.table("prestamos_resumen").update({"saldo_pendiente": nuevo_saldo}).eq("persona", persona).execute()
            else:
                supabase.table("prestamos_resumen").insert({"persona": persona, "saldo_pendiente": tx_data.monto}).execute()

        # Respuesta estructurada de éxito
        return {
            "status": "success",
            "message": f"Registrado: ${tx_data.monto} en {tx_data.cuenta_origen}",
            "transaction": transaction_record
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando solicitud: {str(e)}")