package org.dikkulah.instancemetriccollector.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

import java.lang.management.ManagementFactory;


public class OperatingSystemCondition implements Condition {

    private final String osName;

    public OperatingSystemCondition(String osName) {
        this.osName = osName;
    }

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String currentOsName = ManagementFactory.getOperatingSystemMXBean().getName().toLowerCase();
        return currentOsName.contains(osName);
    }

    public static class Windows extends OperatingSystemCondition {
        public Windows() {
            super("windows");
        }
    }

    public static class Linux extends OperatingSystemCondition {
        public Linux() {
            super("linux");
        }
    }
}