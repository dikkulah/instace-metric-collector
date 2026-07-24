package org.dikkulah.instancemetriccollector.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class DockerClientConfigTest {

    @Test
    void resolveDockerHost_usesConfiguredValue() {
        String host = DockerClientConfig.resolveDockerHost("unix:///custom.sock");
        assertTrue(host.contains("custom.sock"));
    }

    @Test
    void resolveDockerHost_fallsBackToUnixSocketWhenBlank() {
        String host = DockerClientConfig.resolveDockerHost("  ");
        assertTrue(host.startsWith("unix://"));
    }
}
