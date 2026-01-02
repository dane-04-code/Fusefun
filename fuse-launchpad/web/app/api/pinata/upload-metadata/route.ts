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

        const body = await request.json();
        const { name, symbol, description, imageUrl, twitter, telegram, website } = body;

        // Validate required fields
        if (!name || !symbol) {
            return NextResponse.json(
                { error: "Name and symbol are required" },
                { status: 400 }
            );
        }

        console.log(`[Pinata] Uploading metadata for: ${name} (${symbol})`);

        // Build metadata object (following Metaplex standard)
        const metadata = {
            name,
            symbol,
            description: description || "",
            image: imageUrl || "",
            external_url: website || "",
            attributes: [],
            properties: {
                files: imageUrl ? [{ uri: imageUrl, type: "image/png" }] : [],
                category: "image",
                creators: []
            },
            // Additional social links
            social: {
                twitter: twitter || "",
                telegram: telegram || "",
                website: website || ""
            }
        };

        // Use JWT if available, otherwise use API key/secret
        const headers: HeadersInit = PINATA_JWT
            ? { "Authorization": `Bearer ${PINATA_JWT}`, "Content-Type": "application/json" }
            : { "pinata_api_key": PINATA_API_KEY, "pinata_secret_api_key": PINATA_SECRET_KEY, "Content-Type": "application/json" };

        const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
            method: "POST",
            headers,
            body: JSON.stringify({
                pinataContent: metadata,
                pinataMetadata: {
                    name: `${symbol}-metadata.json`,
                    keyvalues: {
                        type: "token-metadata",
                        tokenSymbol: symbol,
                        uploadedAt: new Date().toISOString()
                    }
                }
            })
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

        console.log(`[Pinata] Metadata uploaded successfully: ${ipfsHash}`);

        return NextResponse.json({
            success: true,
            ipfsHash,
            url: ipfsUrl,
        });
    } catch (error) {
        console.error("Pinata metadata upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
