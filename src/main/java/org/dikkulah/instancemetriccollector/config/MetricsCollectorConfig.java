package org.dikkulah.instancemetriccollector.config;


import com.sun.management.OperatingSystemMXBean;
import org.dikkulah.instancemetriccollector.service.collector.MetricsCollector;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.lang.management.ManagementFactory;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Configuration
public class MetricsCollectorConfig {
    private final Map<String, Supplier<MetricsCollector>> collectorMap = new HashMap<>(2);

    public MetricsCollectorConfig(List<MetricsCollector> collectors) {
        for (MetricsCollector collector : collectors) {
            collectorMap.put(collector.getCollectorName(), () -> collector);
        }
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