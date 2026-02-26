package com.spendguard.auth;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class User {
    @Id @GeneratedValue
    private Long id;

    private String username;
    private String email;
    private String password;
}