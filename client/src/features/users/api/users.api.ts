import { api } from "@/lib/api";
import type { UserItem, CreateUserInput, UpdateUserInput } from "../types";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const usersApi = {
  async getUsers(): Promise<UserItem[]> {
    const res = await api.get<ApiResponse<UserItem[]>>("/api/users");
    if (res.data.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data.error || "Invalid response from server");
  },

  async createUser(input: CreateUserInput): Promise<UserItem> {
    const res = await api.post<ApiResponse<UserItem>>("/api/users", input);
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.error || "Failed to create user");
  },

  async updateUser(id: string, input: UpdateUserInput): Promise<UserItem> {
    const res = await api.patch<ApiResponse<UserItem>>(`/api/users/${id}`, input);
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data.error || "Failed to update user");
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<ApiResponse<{ success: boolean; message: string }>>(
      `/api/users/${id}`
    );
    if (res.data.success) {
      return (
        res.data.data ?? {
          success: true,
          message: res.data.message || "User deleted successfully",
        }
      );
    }
    throw new Error(res.data.error || "Failed to delete user");
  },
};
