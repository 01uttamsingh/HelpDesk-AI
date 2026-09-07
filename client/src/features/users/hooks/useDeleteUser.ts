import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
