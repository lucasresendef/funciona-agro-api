CREATE USER keycloak WITH PASSWORD 'keycloak';
CREATE DATABASE funciona_agro_keycloak OWNER keycloak;
GRANT ALL PRIVILEGES ON DATABASE funciona_agro_keycloak TO keycloak;
