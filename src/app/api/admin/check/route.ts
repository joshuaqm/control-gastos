import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ admin: false }, { status: 401 })
    }

    // Server client tiene la sesión del usuario → RLS permite leer su propio profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ admin: profile?.role === 'admin' })
  } catch (error) {
    console.error('Error checking admin:', error)
    return NextResponse.json({ admin: false })
  }
}
