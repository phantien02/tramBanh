import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { docSession, type SessionUser } from './session'

export async function layUser(): Promise<SessionUser | null> {
  const c = await cookies()
  return docSession(c.get('session')?.value)
}

export function loiJson(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}
