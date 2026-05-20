export interface CreateWorkspaceDto {
  name: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  ownerUserId: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}
