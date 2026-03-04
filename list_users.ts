
import Database from "better-sqlite3";
const db = new Database("vy_control.db");
const users = db.prepare("SELECT id, username, role FROM users").all();
console.log("Users in DB:", JSON.stringify(users, null, 2));
