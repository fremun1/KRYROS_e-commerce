export interface JwtPayload {
  sub: string;
  email: string | null;
  phone: string | null;
  role: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
