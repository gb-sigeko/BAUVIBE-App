import type { DefaultSession } from "next-auth";
import type { AppRole } from "./roles";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      employeeId?: string | null;
    };
  }

  interface User {
    role: AppRole;
    employeeId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    employeeId?: string | null;
  }
}
