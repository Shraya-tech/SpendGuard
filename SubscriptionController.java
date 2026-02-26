package com.spendguard.subscriptions;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.*;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionRepository repo;

    public SubscriptionController(SubscriptionRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/duplicates")
    public Object getDuplicates(@RequestParam Long userId,
                                @RequestParam(required=false) String service) {

        List<Subscription> all = repo.findByUserId(userId);

        if (service != null && !service.isBlank()) {
            return all.stream()
                    .filter(s -> s.getServiceName().equalsIgnoreCase(service))
                    .collect(Collectors.toList());
        }

        // group by serviceName
        Map<String, List<Subscription>> groups = all.stream()
                .collect(Collectors.groupingBy(Subscription::getServiceName));

        return groups.values().stream()
                .filter(list -> list.size() > 1)
                .collect(Collectors.toList());
    }
}
``