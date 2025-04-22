"use client";

import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { List, FileText, Merge, Download, Loader2, AlertCircle, X } from 'lucide-react';

export default function MergePdfsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropzone handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== acceptedFiles.length) {
        setError("Some selected files were not PDFs and were ignored.");
    } else {
        setError(null);
    }
    setFiles(prevFiles => [...prevFiles, ...pdfFiles]);
    setMergedPdfUrl(null); // Clear previous result when new files are added
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
  });

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setMergedPdfUrl(null);
  };

  // Merge PDFs using pdf-lib
  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please select at least two PDF files to merge.");
      return;
    }

    setIsMerging(true);
    setError(null);
    setMergedPdfUrl(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const pdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
      // Optional: Trigger automatic download or provide button
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = 'merged.pdf';
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
      // URL.revokeObjectURL(url); // Clean up if downloading automatically

    } catch (err: any) {
      console.error("Failed to merge PDFs:", err);
      setError(`Failed to merge PDFs. Error: ${err.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <Merge className="mx-auto h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Merge PDFs with CloudPDF</CardTitle>
              <CardDescription>Combine multiple PDF files into one single document using CloudPDF tools.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dropzone */}
              <div 
                {...getRootProps()} 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragActive ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700/30`}
              >
                <input {...getInputProps()} />
                <div className="space-y-1 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-sm text-blue-600 dark:text-blue-400">Drop the files here ...</p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Drag & drop some PDF files here, or click to select files
                    </p>
                  )}
                   <p className="text-xs text-gray-500 dark:text-gray-500">PDF files only</p>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                   <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Files to merge ({files.length}):</h3>
                   <ul className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-auto">
                    {files.map((file, index) => (
                      <li key={index} className="px-3 py-2 flex items-center justify-between text-sm">
                        <span className="text-gray-800 dark:text-gray-200 truncate pr-2" title={file.name}>{file.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500 h-6 w-6">
                          <X size={16} />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-2 rounded text-sm text-center flex items-center justify-center gap-2">
                   <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Merge Button */}
              <Button 
                onClick={handleMerge} 
                disabled={files.length < 2 || isMerging}
                className="w-full"
                size="lg"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Merging...
                  </>
                ) : (
                  <>
                     <Merge className="mr-2 h-5 w-5" /> Merge PDFs
                  </>
                )}
              </Button>

              {/* Download Link */}
              {mergedPdfUrl && (
                <div className="mt-6 text-center p-4 border border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-900/30 rounded-md">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Merging successful!</p>
                  <a
                    href={mergedPdfUrl}
                    download="merged.pdf"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                  >
                    <Download className="mr-2 h-4 w-4"/> Download Merged PDF
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