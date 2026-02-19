import java.sql.Connection;
import java.sql.DriverManager;

public class DatabaseConnection {
    public static Connection initializeDatabase() throws Exception {
        // spendguard_db is the database we created in Workbench
        String url = "jdbc:mysql://localhost:3306/spendguard_db";
        String user = "root";
        String password = ""; // Empty password based on our server setup
        
        Class.forName("com.mysql.cj.jdbc.Driver");
        return DriverManager.getConnection(url, user, password);
    }
}