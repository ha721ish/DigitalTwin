import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded. Please send a file under the 'file' key in FormData." },
        { status: 400 }
      );
    }

    // Verify it is indeed a PDF
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF files are supported by this endpoint." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Instantiate PDFParse class and extract text
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    
    if (!data || typeof data.text !== "string") {
      return NextResponse.json(
        { error: "Failed to extract text content from the PDF file." },
        { status: 500 }
      );
    }

    // Clean up extracted text formatting
    const cleanedText = data.text
      .replace(/\r\n/g, "\n")              // Normalize Windows carriage returns
      .replace(/\n{3,}/g, "\n\n")          // Remove excessive newlines (max 2)
      .replace(/[ \t]{2,}/g, " ")          // Remove excessive horizontal spacing
      .replace(/^\s+|\s+$/gm, "")          // Trim whitespace from lines
      .trim();

    return NextResponse.json({
      text: cleanedText,
      pages: data.pages?.length || 1
    });

  } catch (error: any) {
    console.error("Error in PDF extraction Route Handler:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while parsing the PDF file." },
      { status: 500 }
    );
  }
}
