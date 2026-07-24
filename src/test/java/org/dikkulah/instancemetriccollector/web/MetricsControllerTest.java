package org.dikkulah.instancemetriccollector.web;

import org.dikkulah.instancemetriccollector.config.MetricsUiConfig;
import org.dikkulah.instancemetriccollector.model.MetricsPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MetricsController.class)
@Import({MetricsSnapshotStore.class, MetricsUiConfig.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MetricsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MetricsSnapshotStore store;

    @BeforeEach
    void seed() {
        store.save(new MetricsPayload(0.42, 600L, 1000L, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0));
    }

    @Test
    void currentReturnsSnapshot() throws Exception {
        mockMvc.perform(get("/api/metrics/current"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.cpuLoad").value(0.42))
                .andExpect(jsonPath("$.payload.usedMemory").value(600))
                .andExpect(jsonPath("$.collectedAt").exists());
    }

    @Test
    void historyReturnsSnapshots() throws Exception {
        store.save(new MetricsPayload(0.1, 100L, 1000L, List.of(), List.of(), List.of(), List.of(), List.of(), 10, -1.0));

        mockMvc.perform(get("/api/metrics/history").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void configReturnsUiSettings() throws Exception {
        mockMvc.perform(get("/api/metrics/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultLocale").value("en"))
                .andExpect(jsonPath("$.locales").value("en,tr"));
    }
}
