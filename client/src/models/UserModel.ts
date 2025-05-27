export interface UserModel {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
  tenants: { id: number; name: string }[];
  createdAt: string;
}
