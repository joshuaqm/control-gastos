CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 'gasto' THEN
        UPDATE cuentas SET saldo_actual = saldo_actual - NEW.monto WHERE id = NEW.cuenta_id;
    ELSIF NEW.tipo = 'ingreso' THEN
        UPDATE cuentas SET saldo_actual = saldo_actual + NEW.monto WHERE id = NEW.cuenta_id;
    ELSIF NEW.tipo = 'actualizacion_saldo' THEN
        UPDATE cuentas SET saldo_actual = NEW.monto WHERE id = NEW.cuenta_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_saldo
AFTER INSERT ON transacciones
FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cuenta();