import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(_request: NextApiRequest, response: NextApiResponse) { return response.status(410).json({ message: "This integration has been retired." }); }
