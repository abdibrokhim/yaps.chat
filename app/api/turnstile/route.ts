import { NextRequest, NextResponse } from 'next/server';
import { validateTurnstileToken } from "next-turnstile";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Turnstile token is required' },
        { status: 400 }
      );
    }

    const validationResponse = await validateTurnstileToken({
        token: token,
        secretKey: process.env.TURNSTILE_SECRET_KEY!,
        // Optional: Add an idempotency key to prevent token reuse
        idempotencyKey: uuidv4(),
        sandbox: process.env.WHICH_NODE_ENV === "development",
    });
    
    if (!validationResponse.success) {
        return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    console.log('Turnstile validation result:', validationResponse);

    return NextResponse.json({ 
        success: true,
        message: 'Token validated successfully'
    });
    } catch (error) {
        console.error('Error validating Turnstile token:', error);
        return NextResponse.json(
        { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
        );
    }
} 