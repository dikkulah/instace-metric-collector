package org.dikkulah.instancemetriccollector.hub;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({HubProperties.class, AlertProperties.class, MetricsPushProperties.class})
@ConditionalOnProperty(name = "metrics.hub.enabled", havingValue = "true")
public class HubConfig {
}
