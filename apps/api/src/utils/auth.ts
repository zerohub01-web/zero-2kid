import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { JwtPayload, Role } from "../types/auth.js";

export function signToken(payload: Omit<JwtPayload, "token_type">) {
  return jwt.sign({ ...payload, token_type: "admin" }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export function hasRole(currentRole: Role, allowed: Role[]) {
  return allowed.includes(currentRole);
}
