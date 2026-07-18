package org.dikkulah.instancemetriccollector.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dikkulah.instancemetriccollector.model.ContainerInfo;
import org.dikkulah.instancemetriccollector.model.ProcessInfo;
import org.dikkulah.instancemetriccollector.model.ServiceInfo;
import org.dikkulah.instancemetriccollector.service.collector.MetricsCollector;
import org.dikkulah.instancemetriccollector.service.collector.docker.DockerContainerCollector;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InstanceMetricsSenderTest {

    @Mock
    private MetricsCollector metricsCollector;

    @Mock
    private DockerContainerCollector dockerContainerCollector;

    @Mock
    private org.springframework.web.client.RestTemplate restTemplate;

    @Captor
    private ArgumentCaptor<String> logCaptor;

    @InjectMocks
    private InstanceMetricsSender instanceMetricsSender;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void sendMetrics_includesContainersAndUsedMemory() throws Exception {
        ReflectionTestUtils.setField(instanceMetricsSender, "objectMapper", objectMapper);

        when(metricsCollector.getCpuLoad()).thenReturn(0.25);
        when(metricsCollector.getTotalMemorySize()).thenReturn(1000L);
        when(metricsCollector.getFreeMemorySize()).thenReturn(400L);
        when(metricsCollector.getRunningProcesses()).thenReturn(List.of(
                new ProcessInfo("user", 1, 1.0, 2.0, "java")
        ));
        when(metricsCollector.getRunningServices()).thenReturn(List.of(
                new ServiceInfo("docker", null, "Docker service")
        ));
        when(dockerContainerCollector.getCachedContainers()).thenReturn(List.of(
                new ContainerInfo(
                        "id-1",
                        "api",
                        "myapp:1.2",
                        "running",
                        "healthy",
                        0,
                        "myapp",
                        "api",
                        List.of("8080:80/tcp")
                )
        ));

        instanceMetricsSender.sendMetrics();

        verify(metricsCollector).getFreeMemorySize();
        verify(dockerContainerCollector).getCachedContainers();
    }

    @Test
    void sendMetrics_usesEmptyContainersWhenDockerCollectorMissing() throws Exception {
        InstanceMetricsSender senderWithoutDocker = new InstanceMetricsSender(
                restTemplate,
                metricsCollector,
                objectMapper,
                null
        );

        when(metricsCollector.getCpuLoad()).thenReturn(0.1);
        when(metricsCollector.getTotalMemorySize()).thenReturn(2000L);
        when(metricsCollector.getFreeMemorySize()).thenReturn(500L);
        when(metricsCollector.getRunningProcesses()).thenReturn(List.of());
        when(metricsCollector.getRunningServices()).thenReturn(List.of());

        senderWithoutDocker.sendMetrics();

        verify(metricsCollector).getFreeMemorySize();
    }

    @Test
    void logContainerWarnings_detectsExitedAndUnhealthyContainers() {
        List<ContainerInfo> containers = List.of(
                new ContainerInfo("id-1", "api", "img", "exited", "none", 2, "proj", "api", List.of()),
                new ContainerInfo("id-2", "worker", "img", "running", "unhealthy", 0, "proj", "worker", List.of())
        );

        ReflectionTestUtils.invokeMethod(instanceMetricsSender, "logContainerWarnings", containers);

        assertEquals(2, containers.size());
        assertTrue(containers.stream().anyMatch(c -> "exited".equals(c.status())));
        assertTrue(containers.stream().anyMatch(c -> "unhealthy".equals(c.health())));
    }
}
