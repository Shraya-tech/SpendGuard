package com.spendguard.payments;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Payment {
    @Id @GeneratedValue
    private Long id;

    private Long userId;
    private String vendor;
    private double amount;
    private String paymentDate;
}