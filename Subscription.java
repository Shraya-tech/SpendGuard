package com.spendguard.subscriptions;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Subscription {
    @Id @GeneratedValue
    private Long id;

    private Long userId;

    private String serviceName;
    private String vendor;
    private double cost;

    private String startDate;
    private String endDate;
}