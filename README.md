# PDF Title Translator

A web application that extracts and translates Chinese titles from PDF documents into English using Google Gemini AI.

## Features

- **Privacy First**: PDF parsing happens entirely in your browser. Only extracted images of pages are sent to the AI for analysis.
- **High Quality Translation**: Uses Google Gemini 2.5 Pro (configurable) for context-aware translation.
- **Batch Processing**: Handles large documents (50-100+ pages) with smart queue management.
- **Editable Results**: Review and edit translations before exporting.
- **Word Export**: Download the results as a formatted `.docx` file.

## Setup

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Variables**:
    Create a `.env.local` file in the root directory:
    ```env
    GOOGLE_API_KEY=your_google_ai_studio_key
    GOOGLE_MODEL_NAME=gemini-2.5-pro
    ```
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
5.  **Open Browser**:
    Navigate to `http://localhost:3000`

## Deployment (Vercel)

1.  Push the code to a GitHub repository.
2.  Import the project in Vercel.
3.  Add the Environment Variables (`GOOGLE_API_KEY`, `GOOGLE_MODEL_NAME`) in the Vercel Project Settings.
4.  Deploy!

## Technologies

- Next.js 14+ (App Router)
- Tailwind CSS & Shadcn/ui
- Google Generative AI SDK
- PDF.js
- docx
