#!/bin/sh
# Cria o usuario/banco do Keycloak usando a senha vinda de variavel de ambiente
# (KEYCLOAK_DB_PASSWORD), para nao versionar segredo no repositorio.
# Executado automaticamente pelo entrypoint do Postgres na primeira inicializacao
# (apenas quando o volume de dados esta vazio).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
CREATE USER keycloak WITH PASSWORD '${KEYCLOAK_DB_PASSWORD}';
CREATE DATABASE funciona_agro_keycloak OWNER keycloak;
GRANT ALL PRIVILEGES ON DATABASE funciona_agro_keycloak TO keycloak;
EOSQL
