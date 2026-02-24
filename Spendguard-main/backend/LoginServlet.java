import java.io.*;
import java.sql.*;
import javax.servlet.*;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;

@WebServlet("/api/auth/login")
public class LoginServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        // Allow frontend running on Live Server to talk to Tomcat
        response.setHeader("Access-Control-Allow-Origin", "*");

        String username = request.getParameter("username");
        String password = request.getParameter("password");

        // Handle JSON body from frontend fetch calls
        if (username == null) {
            StringBuilder sb = new StringBuilder();
            BufferedReader reader = request.getReader();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            String body = sb.toString();
            username = extractJson(body, "username");
            password = extractJson(body, "password");
        }

        if (username == null || username.trim().isEmpty() ||
            password == null || password.trim().isEmpty()) {
            response.setStatus(400);
            response.getWriter().write("{\"error\": \"Username and password are required.\"}");
            return;
        }

        try (Connection conn = DatabaseConnection.getConnection()) {

            String sql = "SELECT id, username, email FROM users WHERE username = ? AND password = ?";
            PreparedStatement st = conn.prepareStatement(sql);
            st.setString(1, username.trim());
            st.setString(2, password);
            ResultSet rs = st.executeQuery();

            if (rs.next()) {
                // ✅ Valid — create session
                HttpSession session = request.getSession(true);
                session.setAttribute("userId",   rs.getInt("id"));
                session.setAttribute("username", rs.getString("username"));
                session.setMaxInactiveInterval(30 * 60); // 30 minutes

                response.setStatus(200);
                response.getWriter().write(
                    "{\"id\": "    + rs.getInt("id") +
                    ", \"username\": \"" + rs.getString("username") + "\"" +
                    ", \"email\": \""    + rs.getString("email")    + "\"}"
                );
            } else {
                // ❌ Wrong credentials
                response.setStatus(401);
                response.getWriter().write("{\"error\": \"Invalid username or password.\"}");
            }

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

    // Simple JSON field extractor (no external library needed)
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
