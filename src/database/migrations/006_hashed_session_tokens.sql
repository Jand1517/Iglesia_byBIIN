-- 006: los tokens de sesión y los códigos de recuperación se guardan como
-- hash SHA-256 (columna token_hash), nunca en texto plano. Si alguien copia
-- el archivo .sqlite no puede usar esos valores para entrar.
--
-- Los tokens existentes están en texto plano y SQLite no tiene SHA-256
-- integrado, así que se invalidan: todos deben iniciar sesión de nuevo y los
-- códigos de recuperación pendientes dejan de servir (vencían en 30 minutos).

DELETE FROM sessions;
ALTER TABLE sessions RENAME COLUMN token TO token_hash;

DELETE FROM resets;
ALTER TABLE resets RENAME COLUMN token TO token_hash;
CREATE INDEX idx_resets_expires ON resets(expires);
