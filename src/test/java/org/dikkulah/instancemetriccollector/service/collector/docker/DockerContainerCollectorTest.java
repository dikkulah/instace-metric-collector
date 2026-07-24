package org.dikkulah.instancemetriccollector.service.collector.docker;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.HealthState;
import com.github.dockerjava.api.command.InspectContainerCmd;
import com.github.dockerjava.api.command.ListContainersCmd;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.api.model.ContainerPort;
import com.github.dockerjava.api.command.InspectContainerResponse;
import org.dikkulah.instancemetriccollector.model.ContainerInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DockerContainerCollectorTest {

    @Mock
    private DockerClient dockerClient;

    @Test
    void fetchContainers_mapsComposeLabelsAndHealth() {
        DockerContainerCollector collector = new DockerContainerCollector(dockerClient);

        Container container = mock(Container.class);
        when(container.getId()).thenReturn("container-id");
        when(container.getNames()).thenReturn(new String[]{"/api"});
        when(container.getImage()).thenReturn("myapp:1.2");
        when(container.getStatus()).thenReturn("Up 2 hours");
        when(container.getLabels()).thenReturn(Map.of(
                "com.docker.compose.project", "myapp",
                "com.docker.compose.service", "api"
        ));
        ContainerPort containerPort = new ContainerPort()
                .withPublicPort(8080)
                .withPrivatePort(80)
                .withType("tcp");
        when(container.getPorts()).thenReturn(new ContainerPort[]{containerPort});

        ListContainersCmd listContainersCmd = mock(ListContainersCmd.class);
        when(dockerClient.listContainersCmd()).thenReturn(listContainersCmd);
        when(listContainersCmd.withShowAll(true)).thenReturn(listContainersCmd);
        when(listContainersCmd.exec()).thenReturn(List.of(container));

        InspectContainerCmd inspectContainerCmd = mock(InspectContainerCmd.class);
        InspectContainerResponse inspectResponse = mock(InspectContainerResponse.class);
        InspectContainerResponse.ContainerState state = mock(InspectContainerResponse.ContainerState.class);
        HealthState health = mock(HealthState.class);

        when(dockerClient.inspectContainerCmd("container-id")).thenReturn(inspectContainerCmd);
        when(inspectContainerCmd.exec()).thenReturn(inspectResponse);
        when(inspectResponse.getRestartCount()).thenReturn(0);
        when(inspectResponse.getState()).thenReturn(state);
        when(state.getHealth()).thenReturn(health);
        when(health.getStatus()).thenReturn("healthy");

        List<ContainerInfo> containers = collector.fetchContainers();

        assertEquals(1, containers.size());
        ContainerInfo info = containers.get(0);
        assertEquals("api", info.name());
        assertEquals("myapp", info.composeProject());
        assertEquals("api", info.composeService());
        assertEquals("up", info.status());
        assertEquals("healthy", info.health());
        assertEquals(List.of("8080:80/tcp"), info.ports());
    }

    @Test
    void fetchContainers_returnsEmptyListWhenDockerClientFails() {
        DockerContainerCollector collector = new DockerContainerCollector(dockerClient);

        ListContainersCmd listContainersCmd = mock(ListContainersCmd.class);
        when(dockerClient.listContainersCmd()).thenReturn(listContainersCmd);
        when(listContainersCmd.withShowAll(true)).thenReturn(listContainersCmd);
        when(listContainersCmd.exec()).thenThrow(new RuntimeException("socket unavailable"));

        List<ContainerInfo> containers = collector.fetchContainers();

        assertTrue(containers.isEmpty());
    }

    @Test
    void fetchContainers_returnsEmptyListWhenDockerClientIsNull() {
        DockerContainerCollector collector = new DockerContainerCollector(null);

        assertTrue(collector.fetchContainers().isEmpty());
    }

    @Test
    void fetchContainers_skipsRemovingContainers() {
        DockerContainerCollector collector = new DockerContainerCollector(dockerClient);

        Container removing = mock(Container.class);
        when(removing.getStatus()).thenReturn("removing");

        ListContainersCmd listContainersCmd = mock(ListContainersCmd.class);
        when(dockerClient.listContainersCmd()).thenReturn(listContainersCmd);
        when(listContainersCmd.withShowAll(true)).thenReturn(listContainersCmd);
        when(listContainersCmd.exec()).thenReturn(List.of(removing));

        assertTrue(collector.fetchContainers().isEmpty());
    }
}
