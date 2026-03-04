
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

console.log("ADMIN_PASSWORD env:", process.env.ADMIN_PASSWORD);

const db = new Database("vy_control.db");
const user = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (user) {
  console.log("Admin user found in DB");
  const match = bcrypt.compareSync("admin123", user.password);
  console.log("Does 'admin123' match DB hash?", match);
  
  // Let's also check if there's any other admin user or if the hash looks weird
  console.log("Hash in DB:", user.password);
  const freshHash = bcrypt.hashSync("admin123", 10);
  console.log("Fresh hash for 'admin123':", freshHash);
  console.log("Does fresh hash match DB hash via compareSync?", bcrypt.compareSync("admin123", user.password));
} else {
  console.log("Admin user NOT found in DB");
}
