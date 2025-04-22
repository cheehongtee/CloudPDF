"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { UploadCloud, FileCheck, AlertCircle, Type, Save, Loader2 } from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Configure PDF.js worker
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.js',
//   import.meta.url,
// ).toString();
// Import worker from the installed package
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Helper function to convert hex color to RGB object (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

export default function PdfViewerPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewerError, setViewerError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [pageDetails, setPageDetails] = useState<any>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Add Text State
  const [textColor, setTextColor] = useState<string>("#0000FF"); // State for text color, default blue
  const [isAddingText, setIsAddingText] = useState(false);
  const [textInput, setTextInput] = useState({ x: 0, y: 0, value: "", isVisible: false, pageNum: 1 });
  const [isSavingText, setIsSavingText] = useState(false);

  // Callback ref to get page details
  const onPageLoadSuccess = useCallback((page: any) => {
    setPageDetails(page);
  }, []);

  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
    setNumPages(nextNumPages);
    setPageNumber(1);
    setViewerError(null);
    setIsAddingText(false);
    setTextInput({ x: 0, y: 0, value: "", isVisible: false, pageNum: 1 });
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF document:', error);
    setViewerError('Failed to load PDF document. Ensure it is a valid PDF file.');
    setFile(null);
    setNumPages(null);
    setIsAddingText(false);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && uploadedFile.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const arrayBuffer = e.target.result as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          const modifiableFile = new File([blob], uploadedFile.name, { type: "application/pdf" });
          setFile(modifiableFile); 
          setViewerError(null);
          setUploadError(null);
          setDownloadURL(null);
          setNumPages(null);
          setPageNumber(1);
          setIsAddingText(false);
          setTextInput({ x: 0, y: 0, value: "", isVisible: false, pageNum: 1 });
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
      
    } else {
      setViewerError("Please upload a valid PDF file.");
      setFile(null);
      setUploadError(null);
      setDownloadURL(null);
    }
  }

  // Toggle Add Text Mode
  const toggleAddTextMode = () => {
    setIsAddingText(!isAddingText);
    setTextInput({ ...textInput, isVisible: false });
  };

  // Handle clicks on the page for text placement
  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingText || !pageDetails || !pageContainerRef.current) return;

    const rect = pageContainerRef.current.getBoundingClientRect();
    const scale = pageDetails.width / rect.width;
    
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    setTextInput({
      x: clickX - 5,
      y: clickY - 10,
      value: "",
      isVisible: true,
      pageNum: pageNumber,
    });
  };

  // Add Text to PDF using pdf-lib (Updated for Color)
  const addTextToPdf = async () => {
    // Ensure we have the necessary refs and state
    if (!file || textInput.value.trim() === "" || !pageDetails || !pageContainerRef.current) {
        console.error("Missing file, text, page details, or container ref for adding text.");
        setViewerError("Could not add text: Missing required information.");
        return;
    }

    setIsSavingText(true);
    setViewerError(null);

    try {
      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      if (textInput.pageNum < 1 || textInput.pageNum > pages.length) {
          throw new Error(`Invalid page number: ${textInput.pageNum}`);
      }
      const targetPage = pages[textInput.pageNum - 1];
      const { width: originalWidth, height: originalHeight } = targetPage.getSize();
      const containerRect = pageContainerRef.current.getBoundingClientRect();
      const renderedWidth = containerRect.width;
      const renderedHeight = containerRect.height;
      const scale = originalWidth / renderedWidth;
      const clickX_in_container = textInput.x;
      const clickY_in_container = textInput.y;
      const pdfX = clickX_in_container * scale;
      const pdfY = originalHeight - (clickY_in_container * scale);

      // Convert selected hex color to RGB for pdf-lib
      const colorValues = hexToRgb(textColor);
      if (!colorValues) {
          throw new Error("Invalid text color selected.");
      }

      console.log(`Drawing text: '${textInput.value}' at (${pdfX.toFixed(2)}, ${pdfY.toFixed(2)}) with color ${textColor}`);

      targetPage.drawText(textInput.value, {
        x: pdfX,
        y: pdfY,
        size: 12,
        font: helveticaFont,
        color: rgb(colorValues.r, colorValues.g, colorValues.b), // Use converted color
      });

      const pdfBytes = await pdfDoc.save();
      const newBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const newFile = new File([newBlob], file.name, { type: "application/pdf" });

      setFile(newFile);
      setTextInput({ ...textInput, isVisible: false, value: "" });
      
    } catch (err: any) {
      console.error("Failed to add text to PDF:", err);
      setViewerError(`Could not add text to the PDF. ${err.message}`);
    } finally {
        setIsSavingText(false);
    }
  };

  const handleUpload = () => {
    if (!file || !user) {
      setUploadError("No file selected or user not logged in.");
      return;
    }
    if (textInput.isVisible) {
      setUploadError("Please save or cancel the text you are adding before uploading.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setDownloadURL(null);
    setUploadProgress(0);

    const storageRef = ref(storage, `users/${user.uid}/pdfs/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload Error:", error);
        setUploadError(`Upload failed: ${error.message}`);
        setUploading(false);
        setUploadProgress(0);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setDownloadURL(url);
          console.log('File available at', url);

          const userFilesCollectionRef = collection(db, "users", user.uid, "uploadedPdfs");
          await addDoc(userFilesCollectionRef, {
            fileName: file.name,
            downloadURL: url,
            uploadedAt: serverTimestamp()
          });
          console.log("File metadata saved to Firestore");

        } catch (error) {
          console.error("Error getting download URL or saving metadata:", error);
          setUploadError("Upload complete but failed to save metadata or get URL.");
        } finally {
           setUploading(false);
        }
      }
    );
  };

  function changePage(offset: number) {
    if (textInput.isVisible) {
        alert("Please save or cancel the current text before changing pages.");
        return;
    }
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() { changePage(-1); }
  function nextPage() { changePage(1); }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <h1 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">CloudPDF Viewer & Uploader</h1>
          
          <div className="mb-4 flex flex-col sm:flex-row items-center justify-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md shadow flex-wrap">
            <input 
              type="file" 
              onChange={handleFileChange} 
              accept="application/pdf"
              className="block w-full max-w-xs text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-300 dark:file:border-gray-600 file:text-sm file:font-semibold file:bg-white dark:file:bg-gray-700 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-gray-50 dark:hover:file:bg-gray-600"
            />
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading || isAddingText}
              size="default"
              title={isAddingText ? "Disable 'Add Text' mode before uploading" : "Upload current PDF to cloud"}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload to Cloud
                </>
              )}
            </Button>
            <Button 
              variant={isAddingText ? "default" : "outline"} 
              onClick={toggleAddTextMode}
              disabled={!file || uploading}
              size="default"
              title="Toggle Add Text Mode"
            >
              <Type className="mr-2 h-4 w-4" /> {isAddingText ? "Cancel Text" : "Add Text"}
            </Button>
            {isAddingText && (
                <div className="flex items-center gap-2 ml-2 border-l pl-4 dark:border-gray-600">
                   <label htmlFor="textColorPicker" className="text-sm font-medium text-gray-700 dark:text-gray-300">Color:</label>
                    <input 
                        type="color" 
                        id="textColorPicker"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                        title="Select Text Color"
                    />
                </div>
            )}
          </div>

          {uploading && (
            <div className="mb-4 max-w-md mx-auto">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">{Math.round(uploadProgress)}%</p>
            </div>
          )}
          {uploadError && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-2 rounded text-sm text-center mb-4 max-w-md mx-auto flex items-center justify-center gap-2">
               <AlertCircle size={16} /> {uploadError}
            </div>
          )}
          {downloadURL && (
            <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-2 rounded text-sm text-center mb-4 max-w-md mx-auto flex items-center justify-center gap-2">
               <FileCheck size={16} /> Upload Successful! Metadata saved.
            </div>
          )}
          
          {viewerError && (
            <div className="w-full max-w-4xl bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded text-center mb-4 flex items-center justify-center gap-2">
               <AlertCircle size={16} /> {viewerError}
            </div>
          )}

          <div className="flex flex-col items-center relative">
            {file && (
              <div 
                ref={pageContainerRef} 
                className="border shadow-lg overflow-auto max-w-full bg-white dark:bg-gray-900 relative"
                style={{ maxHeight: 'calc(100vh - 300px)', cursor: isAddingText ? 'crosshair' : 'default' }}
                onClick={handlePageClick}
               >
                <Document
                  file={file}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto my-10"/>}
                >
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={false}
                    onLoadSuccess={onPageLoadSuccess}
                  />
                </Document>

                {textInput.isVisible && textInput.pageNum === pageNumber && (
                    <div 
                        className="absolute p-1 bg-white dark:bg-gray-800 border border-blue-500 shadow-lg rounded"
                        style={{ left: `${textInput.x}px`, top: `${textInput.y}px`, zIndex: 10 }}
                    >
                        <textarea 
                            value={textInput.value}
                            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                            placeholder="Enter text..."
                            autoFocus
                            className="w-48 h-16 p-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTextToPdf(); } }}
                        />
                         <div className="mt-1 flex justify-end gap-1">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setTextInput({...textInput, isVisible: false, value: ''})} 
                                title="Cancel"
                                className="px-2 py-1 text-xs"
                            >
                                Cancel
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={addTextToPdf} 
                                disabled={isSavingText || textInput.value.trim() === ''} 
                                title="Save Text (Enter)"
                                className="px-2 py-1 text-xs"
                            >
                                {isSavingText ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>}
                                Save
                            </Button>
                        </div>
                    </div>
                )}
              </div>
            )}
            
            {file && numPages && (
                <div className="mt-4 flex items-center gap-4">
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={pageNumber <= 1 || textInput.isVisible}
                    onClick={previousPage}
                    title={textInput.isVisible ? "Save or cancel text first" : "Previous Page"}
                  >
                    Previous
                  </Button>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pageNumber} of {numPages}
                  </p>
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={pageNumber >= numPages || textInput.isVisible}
                    onClick={nextPage}
                     title={textInput.isVisible ? "Save or cancel text first" : "Next Page"}
                 >
                    Next
                  </Button>
                </div>
              )}

              {!file && !viewerError && (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-10 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10">
                    <p>Select a PDF file using the button above to view and upload.</p>
                </div>
              )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 