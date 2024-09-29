package org.dikkulah.instancemetriccollector.config;


import com.sun.management.OperatingSystemMXBean;
import org.dikkulah.instancemetriccollector.service.collector.MetricsCollector;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Configuration
public class MetricsCollectorConfig {
    private final Map<String, Supplier<MetricsCollector>> collectorMap;

    public MetricsCollectorConfig(List<MetricsCollector> collectors) {
        collectorMap = collectors.stream()
                .collect(Collectors.toMap(MetricsCollector::getCollectorName, collector -> () -> collector));
    }

    @Bean
    public MetricsCollector metricsCollector() {
        OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        String osName = osBean.getName().toLowerCase();

        return collectorMap.entrySet().stream()
                .filter(entry -> osName.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElseThrow(() -> new UnsupportedOperationException("Unsupported OS: " + osName))
                .get();
    }
}