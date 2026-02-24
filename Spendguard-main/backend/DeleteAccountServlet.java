import java.io.*;
import java.sql.*;
import javax.servlet.*;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;

@WebServlet("/api/auth/delete")
public class DeleteAccountServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        // Get logged in user from session
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            response.setStatus(401);
            response.getWriter().write("{\"error\": \"Not logged in.\"}");
            return;
        }

        int userId = (int) session.getAttribute("userId");

        try (Connection conn = DatabaseConnection.getConnection()) {

            // Delete user — CASCADE will delete all their payments, subscriptions, contracts too
            PreparedStatement st = conn.prepareStatement(
                "DELETE FROM users WHERE id = ?"
            );
            st.setInt(1, userId);
            int rows = st.executeUpdate();

            if (rows > 0) {
                // Destroy session
                session.invalidate();
                response.setStatus(200);
                response.getWriter().write("{\"success\": true}");
            } else {
                response.setStatus(404);
                response.getWriter().write("{\"error\": \"User not found.\"}");
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
}