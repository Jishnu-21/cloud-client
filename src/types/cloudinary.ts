export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  created_at: string;
}

export interface CloudinaryFolder {
  name: string;
  path: string;
}
