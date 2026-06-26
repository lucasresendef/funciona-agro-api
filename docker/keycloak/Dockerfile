FROM quay.io/keycloak/keycloak:26.1 AS builder
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.1
COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY import /opt/keycloak/data/import
COPY themes /opt/keycloak/themes
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
