import { redirect } from 'next/navigation'
import { layUser } from '@/lib/api-helpers'

export default async function Home() {
  const user = await layUser()
  if (!user) redirect('/login')
  redirect(user.vaiTro === 'bep' ? '/bep' : user.vaiTro === 'quanly' ? '/quanly' : '/quay')
}
