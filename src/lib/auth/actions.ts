'use server'

import { compare } from 'bcryptjs'
import { getSession } from './session'
import { redirect } from 'next/navigation'

export async function login(prevState: { error: string } | null, formData: FormData) {
  const password = formData.get('password') as string

  if (!password) {
    return { error: 'Password is required' }
  }

  const isValid = await compare(password, process.env.ADMIN_PASSWORD_HASH!)

  if (!isValid) {
    return { error: 'Invalid password' }
  }

  const session = await getSession()
  session.isLoggedIn = true
  await session.save()
  redirect('/')
}

export async function logout() {
  const session = await getSession()
  session.destroy()
  redirect('/login')
}
