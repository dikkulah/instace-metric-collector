package org.dikkulah.instancemetriccollector.config;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.transport.DockerHttpClient;
import com.github.dockerjava.zerodep.ZerodepDockerHttpClient;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

@Configuration
@ConditionalOnProperty(name = "docker.enabled", havingValue = "true")
public class DockerClientConfig {

    private static final Log log = LogFactory.getLog(DockerClientConfig.class);

    @Bean
    public DockerClient dockerClient(@Value("${docker.host:}") String dockerHost) {
        try {
            String resolvedHost = resolveDockerHost(dockerHost);
            log.info("Using Docker host: " + resolvedHost);

            DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                    .withDockerHost(resolvedHost)
                    .build();

            DockerHttpClient httpClient = new ZerodepDockerHttpClient.Builder()
                    .dockerHost(config.getDockerHost())
                    .connectionTimeout(Duration.ofSeconds(5))
                    .responseTimeout(Duration.ofSeconds(10))
                    .build();

            return DockerClientImpl.getInstance(config, httpClient);
        } catch (Exception e) {
            log.warn("Docker client could not be initialized: " + e.getMessage());
            return null;
        }
    }

    static String resolveDockerHost(String configuredHost) {
        if (configuredHost != null && !configuredHost.isBlank()) {
            return configuredHost;
        }

        String envHost = System.getenv("DOCKER_HOST");
        if (envHost != null && !envHost.isBlank()) {
            return envHost;
        }

        Path desktopSock = Path.of(System.getProperty("user.home"), ".docker", "run", "docker.sock");
        if (Files.exists(desktopSock)) {
            return "unix://" + desktopSock;
        }

        return "unix:///var/run/docker.sock";
    }
}
