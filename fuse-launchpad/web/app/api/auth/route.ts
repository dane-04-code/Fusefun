import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { password } = await request.json()

        // Hardcoded password for now (Environment variable would be better in prod)
        const SITE_PASSWORD = process.env.SITE_PASSWORD || "fusefun2024"

        if (password === SITE_PASSWORD) {
            const response = NextResponse.json({ success: true })

            // Set a cookie that lasts for 30 days
            response.cookies.set('site-access', 'authenticated', {
                httpOnly: true,
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
            })

            return response
        }

        return NextResponse.json(
            { success: false, error: 'Incorrect password' },
            { status: 401 }
        )
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
