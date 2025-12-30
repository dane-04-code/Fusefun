import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
    try {
        // Get the form data from the request
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        // Forward to the backend
        const backendFormData = new FormData();
        backendFormData.append("file", file);

        const response = await fetch(`${BACKEND_URL}/api/pinata/upload-image`, {
            method: "POST",
            body: backendFormData,
        });

        // Handle non-OK responses
        if (!response.ok) {
            let errorMessage = "Upload failed";
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
                // If response isn't JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }
            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        // Parse successful response
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Pinata upload proxy error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
