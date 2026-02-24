import java.io.*;
import java.sql.*;
import javax.servlet.*;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;

@WebServlet("/api/auth/signup")
public class SignupServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        String username = request.getParameter("username");
        String email    = request.getParameter("email");
        String password = request.getParameter("password");

        // Handle JSON body from frontend fetch calls
        if (username == null) {
            StringBuilder sb = new StringBuilder();
            BufferedReader reader = request.getReader();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            String body = sb.toString();
            username = extractJson(body, "username");
            email    = extractJson(body, "email");
            password = extractJson(body, "password");
        }

        // Validation
        if (isBlank(username) || isBlank(password)) {
            response.setStatus(400);
            response.getWriter().write("{\"error\": \"Username and password are required.\"}");
            return;
        }
        if (password.length() < 6) {
            response.setStatus(400);
            response.getWriter().write("{\"error\": \"Password must be at least 6 characters.\"}");
            return;
        }

        // Use empty string if email not provided
        if (email == null) email = "";

        try (Connection conn = DatabaseConnection.getConnection()) {

            // Check if username already exists
            PreparedStatement check = conn.prepareStatement(
                "SELECT id FROM users WHERE username = ?"
            );
            check.setString(1, username.trim());
            if (check.executeQuery().next()) {
                response.setStatus(409);
                response.getWriter().write("{\"error\": \"Username already taken.\"}");
                return;
            }

            // Insert new user
            PreparedStatement insert = conn.prepareStatement(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS
            );
            insert.setString(1, username.trim());
            insert.setString(2, email.trim());
            insert.setString(3, password);
            insert.executeUpdate();

            ResultSet keys = insert.getGeneratedKeys();
            int newId = 0;
            if (keys.next()) newId = keys.getInt(1);

            // Auto-login after signup
            HttpSession session = request.getSession(true);
            session.setAttribute("userId",   newId);
            session.setAttribute("username", username.trim());
            session.setMaxInactiveInterval(30 * 60);

            response.setStatus(200);
            response.getWriter().write(
                "{\"id\": " + newId +
                ", \"username\": \"" + username.trim() + "\"}"
            );

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(500);
            response.getWriter().write("{\"error\": \"Database error: " + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type");
        resp.setStatus(200);
    }

    private boolean isBlank(String s) { return s == null || s.trim().isEmpty(); }

    private String extractJson(String json, String key) {
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx == -1) return null;
        int colon = json.indexOf(":", idx);
        int start = json.indexOf("\"", colon) + 1;
        int end   = json.indexOf("\"", start);
        if (start <= 0 || end <= 0) return null;
        return json.substring(start, end);
    }
}
