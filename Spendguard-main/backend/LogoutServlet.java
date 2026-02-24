import java.io.*;
import javax.servlet.*;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;

@WebServlet("/api/auth/logout")
public class LogoutServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setHeader("Access-Control-Allow-Origin", "*");

        // Destroy the session completely
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();

        // Redirect back to login page
        response.sendRedirect("../login.html");
    }
}
