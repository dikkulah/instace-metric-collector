package org.dikkulah.instancemetriccollector.hub;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
@ConditionalOnProperty(name = "metrics.push.enabled", havingValue = "true")
public class MetricsPushService {

    private static final Log log = LogFactory.getLog(MetricsPushService.class);

    private final MetricsPushProperties properties;
    private final RestTemplate restTemplate;
    private final String resolvedAgentId;
    private final String hostname;

    public MetricsPushService(MetricsPushProperties properties, RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
        this.resolvedAgentId = AgentIdentity.resolveAgentId(properties.getAgentId());
        this.hostname = AgentIdentity.resolveHostname();
    }

    public void push(MetricsPayload payload) {
        String ingestUrl = properties.getIngestUrl();
        if (!StringUtils.hasText(ingestUrl)) {
            return;
        }
        try {
            IngestRequest body = new IngestRequest(resolvedAgentId, hostname, payload);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (StringUtils.hasText(properties.getAuthToken())) {
                headers.setBearerAuth(properties.getAuthToken());
            }
            restTemplate.postForEntity(ingestUrl, new HttpEntity<>(body, headers), Void.class);
        } catch (Exception ex) {
            log.error("Failed to push metrics to hub: " + ingestUrl, ex);
        }
    }

    String getResolvedAgentId() {
        return resolvedAgentId;
    }
}
