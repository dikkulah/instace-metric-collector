package org.dikkulah.instancemetriccollector.hub;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/hub")
@ConditionalOnProperty(name = "metrics.hub.enabled", havingValue = "true")
public class HubMetaController {

    private final HubProperties properties;

    public HubMetaController(HubProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of(
                "historySize", properties.getHistorySize(),
                "refreshInterval", 5000
        );
    }
}
