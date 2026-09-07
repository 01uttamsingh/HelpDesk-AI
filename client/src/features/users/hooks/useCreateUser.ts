import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";
import type { CreateUserInput, UserItem } from "../types";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserItem, Error, CreateUserInput>({
    mutationFn: (input: CreateUserInput) => usersApi.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
