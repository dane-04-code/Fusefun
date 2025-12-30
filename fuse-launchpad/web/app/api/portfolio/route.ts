import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const wallet = searchParams.get("wallet");

        if (!wallet) {
            return NextResponse.json(
                { error: "Wallet address required", tokens: [] },
                { status: 400 }
            );
        }

        const response = await fetch(`${BACKEND_URL}/api/portfolio?wallet=${wallet}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            // If backend doesn't have this endpoint yet, return empty portfolio
            if (response.status === 404) {
                return NextResponse.json({ tokens: [] });
            }

            let errorMessage = "Failed to fetch portfolio";
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            return NextResponse.json(
                { error: errorMessage, tokens: [] },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Portfolio proxy error:", error);
        // Return empty portfolio on error so UI doesn't break
        return NextResponse.json({ tokens: [] });
    }
}
