import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";
import type { UpdateUserInput, UserItem } from "../types";

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserItem, Error, { id: string; input: UpdateUserInput }>({
    mutationFn: ({ id, input }) => usersApi.updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
