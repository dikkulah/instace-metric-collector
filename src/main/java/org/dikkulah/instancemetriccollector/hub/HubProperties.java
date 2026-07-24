package org.dikkulah.instancemetriccollector.hub;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "metrics.hub")
public class HubProperties {

    private boolean enabled = false;
    private int historySize = 60;
    private String ingestToken = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getHistorySize() {
        return historySize;
    }

    public void setHistorySize(int historySize) {
        this.historySize = historySize;
    }

    public String getIngestToken() {
        return ingestToken;
    }

    public void setIngestToken(String ingestToken) {
        this.ingestToken = ingestToken;
    }
}
