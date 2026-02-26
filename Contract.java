package com.spendguard.contracts;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Contract {

    @Id @GeneratedValue
    private Long id;

    private Long userId;

    private String vendor;
    private double maxAmount;

    private double actualTotal;
}