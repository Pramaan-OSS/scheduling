export async function POST() { return Response.json({ message: "Meeting rooms and recordings are not available yet." }, { status: 422 }); }
export const GET = POST;
