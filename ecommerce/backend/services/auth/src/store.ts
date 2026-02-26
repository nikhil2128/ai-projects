import { Pool } from "pg";
import { User, UserRole } from "../../../shared/types";

export class AuthStore {
  constructor(private pool: Pool) {}

  async addUser(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, email, name, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.email, user.name, user.passwordHash, user.role, user.createdAt]
    );
  }

  async findUserById(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return rows[0] ? this.toUser(rows[0]) : undefined;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return rows[0] ? this.toUser(rows[0]) : undefined;
  }

  async storeToken(token: string, userId: string): Promise<void> {
    await this.pool.query(
      "INSERT INTO auth_tokens (token, user_id) VALUES ($1, $2)",
      [token, userId]
    );
  }

  async getUserIdByToken(token: string): Promise<string | undefined> {
    const { rows } = await this.pool.query(
      "SELECT user_id FROM auth_tokens WHERE token = $1",
      [token]
    );
    return rows[0]?.user_id;
  }

  async getUserRoleById(userId: string): Promise<UserRole | undefined> {
    const { rows } = await this.pool.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );
    return rows[0]?.role as UserRole | undefined;
  }

  private toUser(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      passwordHash: row.password_hash as string,
      role: (row.role as UserRole) ?? "buyer",
      createdAt: new Date(row.created_at as string),
    };
  }
}
