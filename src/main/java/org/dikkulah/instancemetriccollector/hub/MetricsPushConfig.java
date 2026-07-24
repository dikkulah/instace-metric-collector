package org.dikkulah.instancemetriccollector.hub;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MetricsPushProperties.class)
@ConditionalOnProperty(name = "metrics.push.enabled", havingValue = "true")
public class MetricsPushConfig {
}
