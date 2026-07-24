package org.dikkulah.instancemetriccollector.hub;

import org.dikkulah.instancemetriccollector.web.MetricsSnapshot;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agents")
@ConditionalOnProperty(name = "metrics.hub.enabled", havingValue = "true")
public class HubAgentsController {

    private final HubAgentRegistry registry;
    private final HubProperties properties;

    public HubAgentsController(HubAgentRegistry registry, HubProperties properties) {
        this.registry = registry;
        this.properties = properties;
    }

    @GetMapping
    public List<AgentSummary> listAgents() {
        return registry.listAgents();
    }

    @GetMapping("/{agentId}/current")
    public ResponseEntity<MetricsSnapshot> current(@PathVariable String agentId) {
        MetricsSnapshot latest = registry.getLatest(agentId);
        if (latest == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(latest);
    }

    @GetMapping("/{agentId}/history")
    public List<MetricsSnapshot> history(@PathVariable String agentId,
                                         @RequestParam(defaultValue = "60") int limit) {
        int capped = Math.min(Math.max(limit, 1), properties.getHistorySize());
        return registry.getHistory(agentId, capped);
    }
}
