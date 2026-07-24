package org.dikkulah.instancemetriccollector.service.collector.windows;

import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WindowsNetworkUsageParserTest {

    @Test
    void parsePowerShellOutput_readsAdapterBytes() {
        String sample = """
                "Name","ReceivedBytes","SentBytes"
                "Ethernet","5000","7000"
                "Loopback Pseudo-Interface 1","10","10"
                """;

        List<NetworkUsageInfo> interfaces = WindowsNetworkUsageParser.parsePowerShellOutput(sample);

        assertEquals(1, interfaces.size());
        NetworkUsageInfo ethernet = interfaces.getFirst();
        assertEquals("Ethernet", ethernet.name());
        assertEquals(5000L, ethernet.bytesReceived());
        assertEquals(7000L, ethernet.bytesSent());
    }
}
