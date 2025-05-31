# Resume Processing System

A complete resume processing system with RAG, OCR, and advanced shortlisting capabilities.

## Features

- Automatic text extraction from resume files (PDF, DOC, DOCX, TXT)
- OCR processing for image-based resumes (PNG, JPG, JPEG)
- RAG (Retrieval-Augmented Generation) for intelligent data extraction
- Advanced candidate shortlisting with AI-powered matching
- Web interface for viewing and managing candidates
- Secure authentication and file handling

## Tech Stack

- **Backend**: Node.js with Express.js
- **Frontend**: React with JavaScript
- **Database**: PostgreSQL
- **AI/LLM**: Ollama (phi3:mini model)
- **OCR**: Tesseract.js
- **File Processing**: PDF-parse, Mammoth, Sharp

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Ollama with phi3:mini model

### Installation

1. Clone the repository
2. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── backend/          # Express.js API server
├── frontend/         # React application
├── uploads/          # File storage
│   ├── temp/         # Temporary uploads
│   └── processed/    # Processed files
└── docs/            # Documentation
```

## Development Progress

This project is being built following a structured 36-hour implementation plan with 16 detailed steps.

## License

MIT License
