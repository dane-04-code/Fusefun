import { NextRequest, NextResponse } from "next/server";

// Pinata configuration from environment
const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || "";
const PINATA_JWT = process.env.PINATA_JWT || "";

const pinataConfigured = !!(PINATA_API_KEY && PINATA_SECRET_KEY) || !!PINATA_JWT;

export async function POST(request: NextRequest) {
    try {
        // Check Pinata configuration
        if (!pinataConfigured) {
            return NextResponse.json(
                { error: "Pinata not configured. Please set PINATA_API_KEY and PINATA_SECRET_KEY or PINATA_JWT environment variables." },
                { status: 503 }
            );
        }

        // Get the form data from the request
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        console.log(`[Pinata] Uploading image: ${(file as File).name || "unknown"} (${file.size} bytes)`);

        // Convert Blob to buffer for Pinata API
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create form data for Pinata API
        const pinataFormData = new FormData();
        const blob = new Blob([buffer], { type: file.type });
        pinataFormData.append("file", blob, (file as File).name || "image.png");

        // Add pinata metadata
        const pinataMetadata = JSON.stringify({
            name: (file as File).name || "token-image",
            keyvalues: {
                type: "token-image",
                uploadedAt: new Date().toISOString()
            }
        });
        pinataFormData.append("pinataMetadata", pinataMetadata);

        // Use JWT if available, otherwise use API key/secret
        const headers: HeadersInit = PINATA_JWT
            ? { "Authorization": `Bearer ${PINATA_JWT}` }
            : { "pinata_api_key": PINATA_API_KEY, "pinata_secret_api_key": PINATA_SECRET_KEY };

        const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers,
            body: pinataFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Pinata] API error:", errorText);
            return NextResponse.json(
                { error: `Pinata API error: ${response.status}` },
                { status: response.status }
            );
        }

        const result = await response.json();
        const ipfsHash = result.IpfsHash;
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

        console.log(`[Pinata] Image uploaded successfully: ${ipfsHash}`);

        return NextResponse.json({
            success: true,
            ipfsHash,
            url: ipfsUrl,
        });
    } catch (error) {
        console.error("Pinata upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
