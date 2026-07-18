package org.dikkulah.instancemetriccollector.model;

import java.util.List;

public record ContainerInfo(
        String id,
        String name,
        String image,
        String status,
        String health,
        int restartCount,
        String composeProject,
        String composeService,
        List<String> ports) {
}
