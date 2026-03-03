import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@/modules/common-user/user/domain/entities/users.enity";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

