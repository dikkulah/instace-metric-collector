package org.dikkulah.instancemetriccollector.hub;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.dikkulah.instancemetriccollector.web.MetricsSnapshot;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "metrics.hub.enabled", havingValue = "true")
public class HubLocalIngestService {

    private final HubAgentRegistry registry;
    private final AlertService alertService;
    private final MetricsPushProperties pushProperties;
    private final String agentId;
    private final String hostname;

    public HubLocalIngestService(HubAgentRegistry registry,
                                 AlertService alertService,
                                 MetricsPushProperties pushProperties) {
        this.registry = registry;
        this.alertService = alertService;
        this.pushProperties = pushProperties;
        this.agentId = AgentIdentity.resolveAgentId(pushProperties.getAgentId());
        this.hostname = AgentIdentity.resolveHostname();
    }

    public void ingestLocal(MetricsPayload payload) {
        MetricsSnapshot snapshot = registry.ingest(agentId, hostname, payload);
        alertService.evaluate(agentId, snapshot);
    }

    String getAgentId() {
        return agentId;
    }
}
