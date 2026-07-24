package org.dikkulah.instancemetriccollector.hub;

import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.dikkulah.instancemetriccollector.web.MetricsSnapshot;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "metrics.hub.enabled", havingValue = "true")
public class HubAgentRegistry {

    private final int maxHistory;
    private final Map<String, AgentState> agents = new ConcurrentHashMap<>();

    public HubAgentRegistry(HubProperties properties) {
        this.maxHistory = Math.max(1, properties.getHistorySize());
    }

    public MetricsSnapshot ingest(String agentId, String hostname, MetricsPayload payload) {
        AgentState state = agents.computeIfAbsent(agentId, id -> new AgentState(id, hostname));
        if (hostname != null && !hostname.isBlank()) {
            state.hostname = hostname;
        }
        return state.save(payload, maxHistory);
    }

    public List<AgentSummary> listAgents() {
        return agents.values().stream()
                .map(AgentState::toSummary)
                .sorted(Comparator.comparing(AgentSummary::agentId))
                .toList();
    }

    public MetricsSnapshot getLatest(String agentId) {
        AgentState state = agents.get(agentId);
        return state != null ? state.latest : null;
    }

    public List<MetricsSnapshot> getHistory(String agentId, int limit) {
        AgentState state = agents.get(agentId);
        if (state == null) {
            return List.of();
        }
        return state.getHistory(limit);
    }

    private static final class AgentState {
        private final String agentId;
        private volatile String hostname;
        private volatile MetricsSnapshot latest;
        private final List<MetricsSnapshot> history = new ArrayList<>();

        private AgentState(String agentId, String hostname) {
            this.agentId = agentId;
            this.hostname = hostname != null && !hostname.isBlank() ? hostname : agentId;
        }

        private synchronized MetricsSnapshot save(MetricsPayload payload, int maxHistory) {
            MetricsSnapshot snapshot = new MetricsSnapshot(Instant.now(), payload);
            latest = snapshot;
            history.add(snapshot);
            while (history.size() > maxHistory) {
                history.removeFirst();
            }
            return snapshot;
        }

        private synchronized List<MetricsSnapshot> getHistory(int limit) {
            int size = history.size();
            if (size == 0) {
                return List.of();
            }
            int capped = Math.max(1, limit);
            int from = Math.max(0, size - capped);
            return List.copyOf(history.subList(from, size));
        }

        private AgentSummary toSummary() {
            MetricsSnapshot snap = latest;
            if (snap == null) {
                return new AgentSummary(agentId, hostname, null, 0, 0, 0, 0);
            }
            MetricsPayload p = snap.payload();
            int containers = p.containers() != null ? p.containers().size() : 0;
            return new AgentSummary(
                    agentId,
                    hostname,
                    snap.collectedAt(),
                    p.cpuLoad(),
                    p.usedMemory(),
                    p.totalMemory(),
                    containers);
        }
    }
}
