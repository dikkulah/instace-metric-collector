package org.dikkulah.instancemetriccollector.config;

import org.dikkulah.instancemetriccollector.service.collector.MetricsCollector;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.lang.management.ManagementFactory;
import java.util.List;

@Configuration
public class MetricsCollectorConfig {

    @Bean
    @Primary
    public MetricsCollector metricsCollector(List<MetricsCollector> collectors) {
        String osName = ManagementFactory.getOperatingSystemMXBean().getName().toLowerCase();
        
        return collectors.stream()
                .filter(collector -> osName.contains(collector.getCollectorName()))
                .findFirst()
                .orElseThrow(() -> new UnsupportedOperationException("Unsupported OS: " + osName));
    }
}