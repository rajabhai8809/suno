import { connectDB } from "@/lib/db/mongodb";

export async function GET() {
  try {
    await connectDB();

    return Response.json({
      success: true,
      app: "suno",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check error:", error);

    return Response.json(
      {
        success: false,
        app: "suno",
        database: "disconnected",
      },
      {
        status: 500,
      }
    );
  }
}