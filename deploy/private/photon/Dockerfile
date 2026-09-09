# Photon ships as a JAR, not as a container: komoot publishes no official image,
# so this builds a minimal one around the released artifact.
#
# PHOTON_VERSION and the index downloaded by scripts/photon-bootstrap.sh are a
# PAIR and must move together. The index format is version-coupled, and the
# country extracts are published without a version in the name, so the pairing
# is documented here rather than inferred:
#
#   photon-db-it-250720  (20 Jul 2025)  ->  Photon 0.7.2  (03 Jul 2025)
#
# The 0.7.x line ships two flavours, `photon-X.jar` (Elasticsearch) and
# `photon-opensearch-X.jar`. The country extracts carry no ES/OS suffix and
# match the default Elasticsearch build.
#
# Java 17 is what the 0.7.x line was built and tested against; newer JDKs need
# module-opening flags for the embedded Elasticsearch.
FROM eclipse-temurin:17-jre

ARG PHOTON_VERSION=0.7.2
ARG PHOTON_SHA256=

WORKDIR /photon

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates; \
    rm -rf /var/lib/apt/lists/*; \
    curl -fSL --retry 3 -o photon.jar \
      "https://github.com/komoot/photon/releases/download/${PHOTON_VERSION}/photon-${PHOTON_VERSION}.jar"; \
    if [ -n "${PHOTON_SHA256}" ]; then echo "${PHOTON_SHA256}  photon.jar" | sha256sum -c -; fi; \
    chown -R 1000:1000 /photon

# curl stays in the image: it is what the compose healthcheck uses, and this
# base has no wget.
#
# Photon resolves ./photon_data relative to the working directory. The index is
# mounted there READ-WRITE on purpose: the embedded Elasticsearch takes a node
# lock and writes its translog inside its own data directory, so a read-only
# mount stops the service from starting at all.
EXPOSE 2322

USER 1000:1000

ENTRYPOINT ["java", "-jar", "/photon/photon.jar"]
CMD ["-listen-ip", "0.0.0.0", "-listen-port", "2322"]
