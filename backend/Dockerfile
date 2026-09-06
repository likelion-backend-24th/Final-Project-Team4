FROM eclipse-temurin:21-jdk AS build
ARG MODULE
WORKDIR /src
COPY . .
RUN chmod +x gradlew && ./gradlew :${MODULE}:bootJar -x test

FROM eclipse-temurin:21-jre
ARG MODULE
COPY --from=build /src/${MODULE}/build/libs/*.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
