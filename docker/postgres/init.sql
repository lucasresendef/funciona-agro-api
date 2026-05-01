CREATE USER keycloak WITH PASSWORD 'keycloak';
CREATE DATABASE field_management_backend_keycloak OWNER keycloak;
GRANT ALL PRIVILEGES ON DATABASE field_management_backend_keycloak TO keycloak;
