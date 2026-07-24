package org.dikkulah.instancemetriccollector.hub;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "metrics.push")
public class MetricsPushProperties {

    private boolean enabled = false;
    private String ingestUrl = "";
    private String agentId = "";
    private String authToken = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getIngestUrl() {
        return ingestUrl;
    }

    public void setIngestUrl(String ingestUrl) {
        this.ingestUrl = ingestUrl;
    }

    public String getAgentId() {
        return agentId;
    }

    public void setAgentId(String agentId) {
        this.agentId = agentId;
    }

    public String getAuthToken() {
        return authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;
    }
}
