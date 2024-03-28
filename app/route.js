import { NextResponse } from 'next/server';

export async function GET (request, context) {
  return NextResponse.json({ result: 'OK' }, { status: 200 });
}

export const maxDuration = 10; // 10 seconds
