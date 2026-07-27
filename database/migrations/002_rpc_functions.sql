-- ============================================================
-- RPC FUNCTIONS for Dashboard
-- ============================================================

-- Gastos agrupados por mes
CREATE OR REPLACE FUNCTION gastos_por_mes(p_user_id UUID, p_desde TEXT)
RETURNS TABLE(mes TEXT, total NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(fecha, 'YYYY-MM') AS mes,
    SUM(monto)::NUMERIC AS total
  FROM transacciones
  WHERE user_id = p_user_id
    AND tipo IN ('gasto', 'compra_meses')
    AND fecha >= p_desde::TIMESTAMPTZ
  GROUP BY TO_CHAR(fecha, 'YYYY-MM')
  ORDER BY mes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ingresos agrupados por mes
CREATE OR REPLACE FUNCTION ingresos_por_mes(p_user_id UUID, p_desde TEXT)
RETURNS TABLE(mes TEXT, total NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(fecha, 'YYYY-MM') AS mes,
    SUM(monto)::NUMERIC AS total
  FROM transacciones
  WHERE user_id = p_user_id
    AND tipo = 'ingreso'
    AND fecha >= p_desde::TIMESTAMPTZ
  GROUP BY TO_CHAR(fecha, 'YYYY-MM')
  ORDER BY mes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard summary
CREATE OR REPLACE FUNCTION dashboard_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  current_month TEXT;
  ingresos_mes NUMERIC;
  gastos_mes NUMERIC;
  prestamos_pendientes NUMERIC;
  patrimonio NUMERIC;
BEGIN
  current_month := TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM');

  SELECT COALESCE(SUM(monto), 0) INTO ingresos_mes
  FROM transacciones
  WHERE user_id = p_user_id
    AND tipo = 'ingreso'
    AND TO_CHAR(fecha, 'YYYY-MM') = current_month;

  SELECT COALESCE(SUM(monto), 0) INTO gastos_mes
  FROM transacciones
  WHERE user_id = p_user_id
    AND tipo IN ('gasto', 'compra_meses')
    AND TO_CHAR(fecha, 'YYYY-MM') = current_month;

  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO prestamos_pendientes
  FROM prestamos
  WHERE user_id = p_user_id
    AND saldo_pendiente > 0;

  SELECT COALESCE(SUM(monto_actual), 0) INTO patrimonio
  FROM metas
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'ingresos_mes', ingresos_mes,
    'gastos_mes', gastos_mes,
    'ahorro', ingresos_mes - gastos_mes,
    'flujo_efectivo', ingresos_mes - gastos_mes,
    'patrimonio', patrimonio,
    'prestamos_pendientes', prestamos_pendientes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Búsqueda de texto completo
CREATE OR REPLACE FUNCTION buscar_transacciones(p_user_id UUID, p_query TEXT)
RETURNS SETOF transacciones AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM transacciones
  WHERE user_id = p_user_id
    AND (
      descripcion ILIKE '%' || p_query || '%'
      OR categoria ILIKE '%' || p_query || '%'
      OR comercio ILIKE '%' || p_query || '%'
      OR persona_relacionada ILIKE '%' || p_query || '%'
      OR cuenta ILIKE '%' || p_query || '%'
      OR texto_original ILIKE '%' || p_query || '%'
      OR viaje ILIKE '%' || p_query || '%'
      OR proyecto ILIKE '%' || p_query || '%'
      OR p_query = ANY(etiquetas)
    )
  ORDER BY fecha DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
