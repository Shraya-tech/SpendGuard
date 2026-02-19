import java.io.IOException;
import java.sql.*;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/AuditServlet")
public class AuditServlet extends HttpServlet {
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String vendor = request.getParameter("vendor");
        String amountStr = request.getParameter("amount");
        String resultMessage = "";

        try {
            double amount = Double.parseDouble(amountStr);
            // Calling your DatabaseConnection class
            Connection conn = DatabaseConnection.initializeDatabase();

            // 1. Check against the 'Contracts' table you made in Workbench
            String sql = "SELECT budget_limit FROM Contracts WHERE vendor_name = ?";
            PreparedStatement st = conn.prepareStatement(sql);
            st.setString(1, vendor);
            ResultSet rs = st.executeQuery();

            if (rs.next()) {
                double limit = rs.getDouble("budget_limit");
                if (amount > limit) {
                    resultMessage = "🚩 FLAG: " + vendor + " payment of $" + amount + " exceeds contract limit of $" + limit;
                } else {
                    resultMessage = "✅ COMPLIANT: " + vendor + " payment is within budget.";
                }
            } else {
                resultMessage = "⚠️ WARNING: No contract found for " + vendor + ". Possible unauthorized spend.";
            }

            // 2. Log the finding into 'Audit_Findings' so it shows in your History Table
            String logSql = "INSERT INTO Audit_Findings (issue_type, vendor, amount_flagged) VALUES (?, ?, ?)";
            PreparedStatement logSt = conn.prepareStatement(logSql);
            logSt.setString(1, "Compliance Check");
            logSt.setString(2, vendor);
            logSt.setDouble(3, amount);
            logSt.executeUpdate();

            // 3. Send the result back to index.jsp
            request.setAttribute("message", resultMessage);
            request.getRequestDispatcher("myfiles.html").forward(request, response);

            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("Error: " + e.getMessage());
        }
    }
}