import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface CustomerJwtPayload {
  customerId: string;
  email: string;
  token_type: "customer";
}

export function signCustomerToken(payload: Omit<CustomerJwtPayload, "token_type">) {
  return jwt.sign({ ...payload, token_type: "customer" }, env.jwtSecret, {
    expiresIn: "30d"
  });
}

export function verifyCustomerToken(token: string): CustomerJwtPayload {
  return jwt.verify(token, env.jwtSecret) as CustomerJwtPayload;
}
