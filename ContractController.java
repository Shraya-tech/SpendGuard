package com.spendguard.contracts;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    private final ContractRepository repo;

    public ContractController(ContractRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/violations")
    public Object violations(@RequestParam Long userId) {
        List<Contract> all = repo.findByUserId(userId);

        return all.stream()
                .filter(c -> c.getActualTotal() > c.getMaxAmount())
                .map(c -> Map.of(
                        "contractName", c.getVendor(),
                        "vendor", c.getVendor(),
                        "maxAmount", c.getMaxAmount(),
                        "actualTotal", c.getActualTotal(),
                        "overBy", (c.getActualTotal() - c.getMaxAmount())
                ))
                .toList();
    }

    @GetMapping("/compare")
    public Object compare(@RequestParam Long contractId,
                          @RequestParam String oldVersion,
                          @RequestParam String newVersion,
                          @RequestParam Long userId) {

        return Map.of(
                "contractId", contractId,
                "oldVersion", oldVersion,
                "newVersion", newVersion,
                "diffs", Map.of(
                        "termsChanged", false,
                        "oldTotal", 0,
                        "newTotal", 0,
                        "totalChangedBy", 0
                )
        );
    }
}