-- Conserva las cuentas existentes y no asigna un tipo supuesto a eventos antiguos.
ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));
ALTER TABLE events ADD COLUMN type TEXT NOT NULL DEFAULT 'sin_clasificar'
  CHECK (type IN ('religioso', 'administrativo', 'sin_clasificar'));
