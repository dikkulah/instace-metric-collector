package org.dikkulah.instancemetriccollector.hub;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.dikkulah.instancemetriccollector.web.MetricsSnapshot;

@WebMvcTest(controllers = {MetricsIngestController.class, HubAgentsController.class, HubMetaController.class})
@Import(HubAgentRegistry.class)
@EnableConfigurationProperties(HubProperties.class)
@TestPropertySource(properties = {
        "metrics.hub.enabled=true",
        "metrics.hub.history.size=10",
        "metrics.hub.ingest.token=secret"
})
class HubControllersTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AlertService alertService;

    @Autowired
    private HubProperties hubProperties;

    @BeforeEach
    void configureHub() {
        hubProperties.setIngestToken("secret");
        hubProperties.setHistorySize(10);
    }

    @Test
    void ingestRequiresAuthWhenTokenConfigured() throws Exception {
        IngestRequest request = new IngestRequest("a1", "host", samplePayload());

        mockMvc.perform(post("/api/v1/ingest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/ingest")
                        .header("Authorization", "Bearer secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        verify(alertService).evaluate(eq("a1"), any(MetricsSnapshot.class));
    }

    @Test
    void agentsApiListsIngestedAgent() throws Exception {
        IngestRequest request = new IngestRequest("a1", "host-1", samplePayload());

        mockMvc.perform(post("/api/v1/ingest")
                        .header("Authorization", "Bearer secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/v1/agents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].agentId").value("a1"))
                .andExpect(jsonPath("$[0].hostname").value("host-1"));

        mockMvc.perform(get("/api/v1/agents/a1/current"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.cpuLoad").value(0.42));
    }

    @Test
    void hubConfigEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/hub/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historySize").value(10));
    }

    private static MetricsPayload samplePayload() {
        return new MetricsPayload(0.42, 600, 1000, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0);
    }
}
