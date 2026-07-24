package org.dikkulah.instancemetriccollector.service.collector.linux;

import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LinuxNetworkUsageParserTest {

    @Test
    void parseProcNetDev_skipsLoopback() {
        String sample = """
                Inter-|   Receive                                                |  Transmit
                 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
                    lo: 1000      10    0    0    0     0          0         0     1000      10    0    0    0     0       0          0
                  eth0: 5000      20    0    0    0     0          0         0     7000      30    0    0    0     0       0          0
                """;

        List<NetworkUsageInfo> interfaces = LinuxNetworkUsageParser.parseProcNetDev(sample);

        assertEquals(1, interfaces.size());
        NetworkUsageInfo eth0 = interfaces.getFirst();
        assertEquals("eth0", eth0.name());
        assertEquals(5000L, eth0.bytesReceived());
        assertEquals(7000L, eth0.bytesSent());
    }

    @Test
    void parseProcNetDev_returnsEmptyForHeaderOnly() {
        String sample = """
                Inter-|   Receive                                                |  Transmit
                 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
                """;

        assertTrue(LinuxNetworkUsageParser.parseProcNetDev(sample).isEmpty());
    }
}
