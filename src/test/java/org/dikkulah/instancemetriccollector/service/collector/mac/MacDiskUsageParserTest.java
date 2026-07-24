package org.dikkulah.instancemetriccollector.service.collector.mac;

import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;
import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MacDiskUsageParserTest {

    @Test
    void parseDfOutput_convertsKilobytesToBytes() {
        String sample = """
                Filesystem    1024-blocks     Used Available Capacity iused ifree %iused  Mounted on
                /dev/disk3s1s1   1000000   400000    600000    40%  123456  654321   1%   /
                """;

        List<DiskUsageInfo> mounts = MacDiskUsageParser.parseDfOutput(sample);

        assertEquals(1, mounts.size());
        DiskUsageInfo root = mounts.getFirst();
        assertEquals("/", root.mount());
        assertEquals(1_000_000L * 1024, root.totalBytes());
        assertEquals(400_000L * 1024, root.usedBytes());
        assertEquals(40.0, root.usePercent());
    }
}
