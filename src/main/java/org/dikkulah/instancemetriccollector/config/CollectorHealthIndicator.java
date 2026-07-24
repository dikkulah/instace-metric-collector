package org.dikkulah.instancemetriccollector.config;

import org.dikkulah.instancemetriccollector.service.collector.MetricsCollector;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "metrics.actuator.enabled", havingValue = "true")
public class CollectorHealthIndicator implements HealthIndicator {

    private final MetricsCollector metricsCollector;

    public CollectorHealthIndicator(MetricsCollector metricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    @Override
    public Health health() {
        return Health.up()
                .withDetail("collector", metricsCollector.getCollectorName())
                .build();
    }
}
