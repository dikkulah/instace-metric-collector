package org.dikkulah.instancemetriccollector.service.collector.docker;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.InspectContainerResponse;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.api.model.ContainerPort;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.dikkulah.instancemetriccollector.model.ContainerInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "docker.enabled", havingValue = "true")
public class DockerContainerCollector {

    private static final Log log = LogFactory.getLog(DockerContainerCollector.class);
    private static final String COMPOSE_PROJECT_LABEL = "com.docker.compose.project";
    private static final String COMPOSE_SERVICE_LABEL = "com.docker.compose.service";

    private final DockerClient dockerClient;
    private volatile List<ContainerInfo> cachedContainers = List.of();

    @Autowired
    public DockerContainerCollector(@Autowired(required = false) DockerClient dockerClient) {
        this.dockerClient = dockerClient;
    }

    @Scheduled(fixedRateString = "${docker.collection.interval}")
    public void collectContainers() {
        cachedContainers = fetchContainers();
    }

    public List<ContainerInfo> getCachedContainers() {
        return cachedContainers;
    }

    List<ContainerInfo> fetchContainers() {
        if (dockerClient == null) {
            return List.of();
        }

        try {
            List<Container> containers = dockerClient.listContainersCmd().withShowAll(true).exec();
            List<ContainerInfo> result = new ArrayList<>();

            for (Container container : containers) {
                if (container.getStatus() != null && container.getStatus().contains("removing")) {
                    continue;
                }

                ContainerInfo info = toContainerInfo(container);
                if (info != null) {
                    result.add(info);
                }
            }

            return Collections.unmodifiableList(result);
        } catch (Exception e) {
            log.warn("Failed to collect Docker containers: " + e.getMessage());
            return List.of();
        }
    }

    private ContainerInfo toContainerInfo(Container container) {
        String id = container.getId();
        String name = resolveName(container.getNames());
        String image = container.getImage();
        String status = resolveStatus(container.getStatus());
        Map<String, String> labels = container.getLabels() != null ? container.getLabels() : Map.of();
        String composeProject = labels.getOrDefault(COMPOSE_PROJECT_LABEL, null);
        String composeService = labels.getOrDefault(COMPOSE_SERVICE_LABEL, null);
        List<String> ports = resolvePorts(container.getPorts());

        int restartCount = 0;
        String health = "none";

        try {
            InspectContainerResponse inspect = dockerClient.inspectContainerCmd(id).exec();
            restartCount = inspect.getRestartCount() != null ? inspect.getRestartCount() : 0;
            health = resolveHealth(inspect);
        } catch (Exception e) {
            log.warn("Failed to inspect container " + name + ": " + e.getMessage());
        }

        return new ContainerInfo(
                id,
                name,
                image,
                status,
                health,
                restartCount,
                composeProject,
                composeService,
                ports
        );
    }

    private String resolveName(String[] names) {
        if (names == null || names.length == 0) {
            return "unknown";
        }
        String name = names[0];
        return name.startsWith("/") ? name.substring(1) : name;
    }

    private String resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return "unknown";
        }
        return status.split("\\s+")[0].toLowerCase();
    }

    private List<String> resolvePorts(ContainerPort[] ports) {
        if (ports == null || ports.length == 0) {
            return List.of();
        }

        List<String> result = new ArrayList<>();
        for (ContainerPort port : ports) {
            if (port.getPublicPort() != null) {
                result.add(port.getPublicPort() + ":" + port.getPrivatePort() + "/" + port.getType());
            } else if (port.getPrivatePort() != null) {
                result.add(port.getPrivatePort() + "/" + port.getType());
            }
        }
        return result;
    }

    private String resolveHealth(InspectContainerResponse inspect) {
        InspectContainerResponse.ContainerState state = inspect.getState();
        if (state == null || state.getHealth() == null || state.getHealth().getStatus() == null) {
            return "none";
        }
        return state.getHealth().getStatus().toString().toLowerCase();
    }
}
