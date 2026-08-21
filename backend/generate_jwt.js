import dotenv from 'dotenv';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

(async () => {
  try {
    const rows = await sql`SELECT id, email, role, name FROM users WHERE role = 'NGO'`;
    console.log('NGOs in DB:', rows);
    
    if (rows.length > 0) {
      const user = rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, profileCompleted: true },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('\n=============================================');
      console.log('JWT for', user.email);
      console.log('=============================================');
      console.log(token);
      console.log('=============================================\n');
    } else {
      console.log('No NGOs found in the database.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
})();
