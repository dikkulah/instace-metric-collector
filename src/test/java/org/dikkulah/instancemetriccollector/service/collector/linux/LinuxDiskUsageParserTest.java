package org.dikkulah.instancemetriccollector.service.collector.linux;

import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;
import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class LinuxDiskUsageParserTest {

    @Test
    void parseDfOutput_readsMountAndBytes() {
        String sample = """
                Filesystem     1B-blocks         Used    Avail Use% Mounted on
                /dev/sda1     10000000000  4000000000 6000000000  40% /
                tmpfs            500000000           0   500000000   0% /run
                """;

        List<DiskUsageInfo> mounts = LinuxDiskUsageParser.parseDfOutput(sample);

        assertEquals(2, mounts.size());
        DiskUsageInfo root = mounts.getFirst();
        assertEquals("/", root.mount());
        assertEquals("/dev/sda1", root.filesystem());
        assertEquals(10_000_000_000L, root.totalBytes());
        assertEquals(4_000_000_000L, root.usedBytes());
        assertEquals(40.0, root.usePercent());
    }
}
