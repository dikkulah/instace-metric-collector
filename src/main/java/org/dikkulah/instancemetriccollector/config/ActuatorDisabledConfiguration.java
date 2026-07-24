package org.dikkulah.instancemetriccollector.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@ConditionalOnProperty(name = "metrics.actuator.enabled", havingValue = "false", matchIfMissing = true)
@PropertySource("classpath:actuator-disabled.properties")
public class ActuatorDisabledConfiguration {
}
