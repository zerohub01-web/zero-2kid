export type Role = "SUPER_ADMIN" | "MANAGER";

export interface JwtPayload {
  adminId: string;
  role: Role;
  token_type: "admin";
}
