"use client";

import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from "react-pdf"; // For preview
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Scissors, FileText, Download, Loader2, AlertCircle, UploadCloud } from 'lucide-react';

// Configure PDF.js worker for preview
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageRange, setPageRange] = useState<string>(""); // e.g., "1-3, 5, 8-10"
  const [splitPdfUrl, setSplitPdfUrl] = useState<string | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Dropzone handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const pdfFile = acceptedFiles[0];
    if (pdfFile.type === 'application/pdf') {
      setFile(pdfFile);
      setError(null);
      setPreviewError(null);
      setSplitPdfUrl(null);
      setPageRange("");
      setNumPages(null); // Reset numPages for preview
    } else {
      setError("Please select a valid PDF file.");
      setFile(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false, // Only allow one file
  });

  // react-pdf load success handler (for preview)
  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
    setNumPages(nextNumPages);
    setPageRange(`1-${nextNumPages}`); // Default range to all pages
    setPreviewError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF preview:', error);
    setPreviewError('Failed to load PDF preview.');
    setNumPages(null);
  }

  // Parse page range input string into an array of 0-based indices
  const parsePageRange = (rangeStr: string, totalPages: number): number[] | null => {
    const indices = new Set<number>();
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart.includes('-')) {
        const [startStr, endStr] = trimmedPart.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);

        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          setError(`Invalid range: ${trimmedPart}. Page numbers must be between 1 and ${totalPages}.`);
          return null;
        }
        for (let i = start; i <= end; i++) {
          indices.add(i - 1); // pdf-lib is 0-indexed
        }
      } else {
        const pageNum = parseInt(trimmedPart, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
          setError(`Invalid page number: ${trimmedPart}. Must be between 1 and ${totalPages}.`);
          return null;
        }
        indices.add(pageNum - 1); // pdf-lib is 0-indexed
      }
    }
    if (indices.size === 0) {
      setError("No valid pages selected.");
      return null;
    }
    return Array.from(indices).sort((a, b) => a - b); // Return sorted array
  };

  // Split PDF using pdf-lib
  const handleSplit = async () => {
    if (!file || !numPages) {
      setError("Please select a PDF file first.");
      return;
    }
    if (!pageRange) {
      setError("Please specify the page range to extract.");
      return;
    }

    const pageIndices = parsePageRange(pageRange, numPages);
    if (!pageIndices) return; // Error set by parsePageRange

    setIsSplitting(true);
    setError(null);
    setSplitPdfUrl(null);

    try {
      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const splitPdf = await PDFDocument.create();

      const copiedPages = await splitPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => splitPdf.addPage(page));

      if (splitPdf.getPageCount() === 0) {
        throw new Error("No pages were selected or copied.");
      }

      const splitPdfBytes = await splitPdf.save();
      const blob = new Blob([splitPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSplitPdfUrl(url);

    } catch (err: any) {
      console.error("Failed to split PDF:", err);
      setError(`Failed to split PDF. Error: ${err.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <Scissors className="mx-auto h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Split PDFs with CloudPDF</CardTitle>
              <CardDescription>Extract specific pages from a PDF document using CloudPDF tools.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dropzone */}
              {!file && (
                <div 
                  {...getRootProps()} 
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragActive ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700/30`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    {isDragActive ? (
                      <p className="text-sm text-blue-600 dark:text-blue-400">Drop the PDF here ...</p>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Drag & drop a PDF file here, or click to select a file
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* File Info & Preview */} 
              {file && (
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-3 border rounded-md dark:border-gray-700">
                       <div className='flex items-center gap-2'>
                          <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={file.name}>{file.name}</span>
                       </div>
                        <Button variant="outline" size="sm" onClick={() => setFile(null)}>Change File</Button>
                    </div>
                    
                    {/* PDF Preview */} 
                    <div className="border rounded-md p-2 max-h-80 overflow-auto bg-gray-100 dark:bg-gray-800">
                         {previewError ? (
                            <p className='text-center text-red-600 dark:text-red-400 p-4'>{previewError}</p>
                         ) : (
                            <Document
                              file={file}
                              onLoadSuccess={onDocumentLoadSuccess}
                              onLoadError={onDocumentLoadError}
                              loading={<Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto my-4"/>}
                            >
                              {/* Display first page as preview */} 
                              <Page pageNumber={1} scale={0.5} /> 
                            </Document>
                         )}
                    </div>
                    {numPages && (
                      <p className="text-center text-xs text-gray-500 dark:text-gray-400">Total pages: {numPages}</p>
                    )}
                 </div>
              )}

              {/* Page Range Input */} 
              {file && numPages && (
                <div>
                  <label htmlFor="pageRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pages to Extract
                  </label>
                  <input
                    type="text"
                    id="pageRange"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g., 1-3, 5, 8-10" 
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter page numbers or ranges separated by commas (e.g., 1, 3-5, 7).</p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-2 rounded text-sm text-center flex items-center justify-center gap-2">
                   <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Split Button */}
              {file && (
                <Button 
                  onClick={handleSplit} 
                  disabled={!file || isSplitting || !pageRange || !numPages}
                  className="w-full"
                  size="lg"
                >
                  {isSplitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Splitting...
                    </>
                  ) : (
                    <>
                       <Scissors className="mr-2 h-5 w-5" /> Split PDF
                    </>
                  )}
                </Button>
              )}

              {/* Download Link */}
              {splitPdfUrl && (
                <div className="mt-6 text-center p-4 border border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-900/30 rounded-md">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Splitting successful!</p>
                  <a
                    href={splitPdfUrl}
                    download={`${file?.name.replace('.pdf', '') || 'split'}_pages_${pageRange.replace(/[^0-9a-zA-Z,-]/g, '_')}.pdf`}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                  >
                    <Download className="mr-2 h-4 w-4"/> Download Split PDF
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
} 