package org.dikkulah.instancemetriccollector.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@ConditionalOnProperty(name = "metrics.actuator.enabled", havingValue = "true")
@PropertySource("classpath:actuator-enabled.properties")
public class ActuatorEnabledConfiguration {
}
