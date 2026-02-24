import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {

    private static final String URL      = "jdbc:mysql://localhost:3306/spendguard_db"
                                         + "?useSSL=false"
                                         + "&serverTimezone=UTC"
                                         + "&allowPublicKeyRetrieval=true";
    private static final String USER     = "root";
    private static final String PASSWORD = "root";  // ← add your password here if you have one

    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("MySQL JDBC driver not found. " +
                "Make sure mysql-connector-j-*.jar is in WEB-INF/lib/", e);
        }
    }

    // Always use try-with-resources when calling this:
    // try (Connection conn = DatabaseConnection.getConnection()) { ... }
    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}
