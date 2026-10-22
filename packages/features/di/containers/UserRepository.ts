import { createContainer } from "@scheduling/features/di/di";
import { moduleLoader as userRepositoryModuleLoader } from "@scheduling/features/di/modules/User";
import type { UserRepository } from "@scheduling/features/users/repositories/UserRepository";

const userRepositoryContainer = createContainer();

export function getUserRepository(): UserRepository {
  userRepositoryModuleLoader.loadModule(userRepositoryContainer);
  return userRepositoryContainer.get<UserRepository>(userRepositoryModuleLoader.token);
}
