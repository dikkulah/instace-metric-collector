package org.dikkulah.instancemetriccollector.service.collector.windows;

import org.dikkulah.instancemetriccollector.model.DiskUsageInfo;
import org.dikkulah.instancemetriccollector.model.NetworkUsageInfo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WindowsDiskUsageParserTest {

    @Test
    void parseWmicOutput_readsDriveUsage() {
        String sample = """
                Node,DeviceID,FreeSpace,Size
                HOST,C:,2000000000,10000000000
                """;

        List<DiskUsageInfo> mounts = WindowsDiskUsageParser.parseWmicOutput(sample);

        assertEquals(1, mounts.size());
        DiskUsageInfo drive = mounts.getFirst();
        assertEquals("C:", drive.mount());
        assertEquals(10_000_000_000L, drive.totalBytes());
        assertEquals(8_000_000_000L, drive.usedBytes());
        assertEquals(80.0, drive.usePercent(), 0.01);
    }
}
