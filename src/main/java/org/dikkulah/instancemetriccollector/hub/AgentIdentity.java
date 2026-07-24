package org.dikkulah.instancemetriccollector.hub;

import org.springframework.util.StringUtils;

import java.net.InetAddress;

final class AgentIdentity {

    private AgentIdentity() {
    }

    static String resolveAgentId(String configured) {
        if (StringUtils.hasText(configured)) {
            return configured.trim();
        }
        String env = System.getenv("METRICS_AGENT_ID");
        if (StringUtils.hasText(env)) {
            return env.trim();
        }
        env = System.getenv("HOSTNAME");
        if (StringUtils.hasText(env)) {
            return env.trim();
        }
        return "local-agent";
    }

    static String resolveHostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception ex) {
            return "unknown";
        }
    }
}
