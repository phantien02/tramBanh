import bcrypt from 'bcryptjs'

export function hashPassword(mk: string): string {
  return bcrypt.hashSync(mk, 10)
}

export function verifyPassword(mk: string, hash: string): boolean {
  return bcrypt.compareSync(mk, hash)
}
