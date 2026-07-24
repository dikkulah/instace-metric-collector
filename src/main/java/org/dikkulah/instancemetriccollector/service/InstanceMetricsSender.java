package org.dikkulah.instancemetriccollector.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.dikkulah.instancemetriccollector.model.ContainerInfo;
import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.dikkulah.instancemetriccollector.service.collector.MetricsCollector;
import org.dikkulah.instancemetriccollector.service.collector.docker.DockerContainerCollector;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
public class InstanceMetricsSender {

    private static final Log log = LogFactory.getLog(InstanceMetricsSender.class);
    private final RestTemplate restTemplate;
    private final MetricsCollector metricsCollector;
    private final ObjectMapper objectMapper;
    private final DockerContainerCollector dockerContainerCollector;

    public InstanceMetricsSender(RestTemplate restTemplate,
                                 @Lazy MetricsCollector metricsCollector,
                                 ObjectMapper objectMapper,
                                 @Autowired(required = false) DockerContainerCollector dockerContainerCollector) {
        this.restTemplate = restTemplate;
        this.metricsCollector = metricsCollector;
        this.objectMapper = objectMapper;
        this.dockerContainerCollector = dockerContainerCollector;
    }

    @Scheduled(fixedRateString = "${metrics.collection.interval}")
    public void sendMetrics() throws JsonProcessingException {
        double cpuLoad = metricsCollector.getCpuLoad();
        long totalMemory = metricsCollector.getTotalMemorySize();
        long usedMemory = totalMemory - metricsCollector.getFreeMemorySize();
        List<ContainerInfo> containers = dockerContainerCollector != null
                ? dockerContainerCollector.getCachedContainers()
                : List.of();

        MetricsPayload payload = new MetricsPayload(
                cpuLoad,
                usedMemory,
                totalMemory,
                metricsCollector.getRunningProcesses(),
                metricsCollector.getRunningServices(),
                containers,
                metricsCollector.getDiskUsage(),
                metricsCollector.getNetworkUsage(),
                metricsCollector.getAvailableProcessors(),
                metricsCollector.getSystemLoadAverage());

        log.info(objectMapper.writeValueAsString(payload));
        logContainerWarnings(containers);
    }

    private void logContainerWarnings(List<ContainerInfo> containers) {
        for (ContainerInfo container : containers) {
            if ("exited".equalsIgnoreCase(container.status()) || container.restartCount() > 0) {
                log.warn("Container down: " + container.name()
                        + " (status=" + container.status()
                        + ", restarts=" + container.restartCount() + ")");
            }
            if ("unhealthy".equalsIgnoreCase(container.health())) {
                log.warn("Container unhealthy: " + container.name());
            }
        }
    }
}
