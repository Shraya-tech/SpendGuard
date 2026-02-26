package com.spendguard.payments;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentRepository repo;

    public PaymentController(PaymentRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/duplicates")
    public Object getDuplicates(@RequestParam Long userId,
                                @RequestParam(required=false) String vendor) {

        List<Payment> all = repo.findByUserId(userId);

        if (vendor != null && !vendor.isBlank()) {
            return all.stream()
                    .filter(p -> p.getVendor().equalsIgnoreCase(vendor))
                    .collect(Collectors.toList());
        }

        // group by vendor + amount
        Map<String, List<Payment>> groups = all.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getVendor() + "-" + p.getAmount()
                ));

        // return only groups with duplicates
        return groups.values().stream()
                .filter(list -> list.size() > 1)
                .collect(Collectors.toList());
    }
}