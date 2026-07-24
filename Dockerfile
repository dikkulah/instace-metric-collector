# Multi-stage build — Phase 5 deployment
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN chmod +x mvnw && ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends procps curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/instance-metric-collector-*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -fsS http://localhost:8080/api/metrics/config >/dev/null || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
