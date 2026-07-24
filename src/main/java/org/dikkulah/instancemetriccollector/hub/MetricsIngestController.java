package org.dikkulah.instancemetriccollector.hub;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.dikkulah.instancemetriccollector.web.MetricsSnapshot;

@RestController
@RequestMapping("/api/v1")
@ConditionalOnProperty(name = "metrics.hub.enabled", havingValue = "true")
public class MetricsIngestController {

    private final HubProperties hubProperties;
    private final HubAgentRegistry registry;
    private final AlertService alertService;

    public MetricsIngestController(HubProperties hubProperties,
                                   HubAgentRegistry registry,
                                   AlertService alertService) {
        this.hubProperties = hubProperties;
        this.registry = registry;
        this.alertService = alertService;
    }

    @PostMapping("/ingest")
    public ResponseEntity<Void> ingest(@RequestBody IngestRequest request,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!isAuthorized(authorization)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (request == null || !StringUtils.hasText(request.agentId()) || request.payload() == null) {
            return ResponseEntity.badRequest().build();
        }

        MetricsSnapshot snapshot = registry.ingest(request.agentId(), request.hostname(), request.payload());
        alertService.evaluate(request.agentId(), snapshot);
        return ResponseEntity.accepted().build();
    }

    private boolean isAuthorized(String authorization) {
        String token = hubProperties.getIngestToken();
        if (!StringUtils.hasText(token)) {
            return true;
        }
        return authorization != null && authorization.equals("Bearer " + token);
    }
}
