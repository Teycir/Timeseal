import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();
    const nextMonth = new Date(new Date(date).getTime() + 30*24*60*60*1000)
      .toISOString().split('T')[0];

    const canary = `TimeSeal Warrant Canary

As of ${date} 00:00:00 UTC:

✅ No warrants, subpoenas, or national security letters received
✅ No gag orders in effect
✅ No government requests for user data
✅ No forced time manipulation requests
✅ Infrastructure remains under operator control
✅ No backdoors or compromises known

This canary is updated monthly at timeseal.dev/canary
If this page is missing or outdated, assume compromise.

Next update: ${nextMonth} 00:00:00 UTC

Last verified by operator on ${new Date().toISOString()}
`;

    await writeFile(join(process.cwd(), 'public', 'canary.txt'), canary);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
