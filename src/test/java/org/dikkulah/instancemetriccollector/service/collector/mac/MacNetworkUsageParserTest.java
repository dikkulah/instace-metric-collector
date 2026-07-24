package org.dikkulah.instancemetriccollector.service.collector.mac;

import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MacNetworkUsageParserTest {

    @Test
    void parseNetstatOutput_readsInterfaceBytes() {
        String sample = """
                Name       Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll
                lo0        16384 <Link#1>      00:00:00:00:00:00        0     0          0        0     0          0     0
                en0        1500  <Link#4>      aa:bb:cc:dd:ee:ff      100     0       5000      200     0       7000     0
                en0        1500  192.168.1.10  aa:bb:cc:dd:ee:ff      100     -       5000      200     -       7000     -
                awdl0      1500  fe80::2832:   2a:32:a5:6b:71:26    13829     -    8350171    11866     -    4410020     -
                awdl0      1500  <Link#21>     2a:32:a5:6b:71:26    13829     0    8350171    11866     0    4410020     0
                """;

        List<NetworkUsageInfo> interfaces = MacNetworkUsageParser.parseNetstatOutput(sample);

        assertEquals(2, interfaces.size());
        NetworkUsageInfo en0 = interfaces.getFirst();
        assertEquals("en0", en0.name());
        assertEquals(5000L, en0.bytesReceived());
        assertEquals(7000L, en0.bytesSent());
        NetworkUsageInfo awdl0 = interfaces.get(1);
        assertEquals("awdl0", awdl0.name());
        assertEquals(8350171L, awdl0.bytesReceived());
        assertEquals(4410020L, awdl0.bytesSent());
    }
}
