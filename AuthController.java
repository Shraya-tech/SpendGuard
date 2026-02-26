package com.spendguard.auth;

import com.spendguard.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository repo;

    public AuthController(UserRepository repo) {
        this.repo = repo;
    }

    @PostMapping("/signup")
    public Object signup(@RequestBody User incoming) {
        if (incoming.getUsername() == null || incoming.getPassword() == null)
            return new ApiResponse("Invalid data");

        repo.save(incoming);
        return new ApiResponse("User created");
    }

    @PostMapping("/login")
    public Object login(@RequestBody User incoming) {
        User user = repo.findByUsername(incoming.getUsername());
        if (user == null || !user.getPassword().equals(incoming.getPassword()))
            return new ApiResponse("Invalid username or password");

        return user; // front-end expects: { id, username }
    }

    @PostMapping("/delete")
    public Object delete(@RequestParam Long userId) {
        repo.deleteById(userId);
        return new ApiResponse("Account deleted");
    }
}