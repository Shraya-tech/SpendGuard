import java.io.*;
import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.*;

/**
 * SessionGuard
 * ------------
 * Automatically protects every page under /api/*
 * If the user is not logged in, returns 401 Unauthorized.
 * The frontend checks for this and redirects to login.html.
 */
@WebFilter("/api/*")
public class SessionGuard implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  request  = (HttpServletRequest)  req;
        HttpServletResponse response = (HttpServletResponse) res;

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");

        // Always allow login, signup, and OPTIONS preflight through
        String path = request.getRequestURI();
        if (path.contains("/auth/login") ||
            path.contains("/auth/signup") ||
            request.getMethod().equals("OPTIONS")) {
            chain.doFilter(req, res);
            return;
        }

        // Check session
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Not logged in.\", \"redirect\": \"login.html\"}");
            return;
        }

        chain.doFilter(req, res);
    }

    @Override public void init(FilterConfig fc) {}
    @Override public void destroy() {}
}
