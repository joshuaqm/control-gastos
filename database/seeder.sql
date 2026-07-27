-- Cuentas por defecto
INSERT INTO cuentas (nombre, tipo, saldo_actual) VALUES
('Efectivo/Débito', 'efectivo', 0.00),
('Nu México', 'inversion', 25000.00);

-- Categorías por defecto
INSERT INTO categorias (nombre, tipo) VALUES
('Comida/Restaurantes', 'gasto'),
('Transporte', 'gasto'),
('Entretenimiento', 'gasto'),
('Ingresos/Salario', 'ingreso'),
('Deudas/Préstamos', 'ambos'),
('Ahorro/Inversión', 'ambos');