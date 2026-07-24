package org.dikkulah.instancemetriccollector.config;

import org.dikkulah.instancemetriccollector.web.MetricsUiProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MetricsUiProperties.class)
@ConditionalOnProperty(name = "metrics.ui.enabled", havingValue = "true", matchIfMissing = true)
public class MetricsUiConfig {
}
