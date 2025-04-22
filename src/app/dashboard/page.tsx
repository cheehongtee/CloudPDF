"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, Download, Loader2, AlertCircle, Inbox, Trash2 } from 'lucide-react';
import Link from "next/link";

interface UploadedFile {
  id: string;
  fileName: string;
  downloadURL: string;
  uploadedAt: Timestamp | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const filesCollectionRef = collection(db, "users", user.uid, "uploadedPdfs");
    const q = query(filesCollectionRef, orderBy("uploadedAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedFiles: UploadedFile[] = [];
      querySnapshot.forEach((doc) => {
        fetchedFiles.push({
          id: doc.id,
          ...doc.data(),
          uploadedAt: doc.data().uploadedAt || null,
        } as UploadedFile);
      });
      setFiles(fetchedFiles);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching files:", err);
      setError("Failed to fetch uploaded files.");
      setLoading(false);
    });

    return () => unsubscribe();

  }, [user]);

  const formatTimestamp = (timestamp: Timestamp | null): string => {
    if (!timestamp) return 'Date unavailable';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
        return;
    }

    setDeletingId(fileId);
    setDeleteError(null);

    try {
      const storageRef = ref(storage, `users/${user.uid}/pdfs/${fileName}`);
      await deleteObject(storageRef);
      console.log(`Successfully deleted ${fileName} from storage.`);

      const docRef = doc(db, "users", user.uid, "uploadedPdfs", fileId);
      await deleteDoc(docRef);
      console.log(`Successfully deleted Firestore doc ${fileId}.`);

    } catch (error: any) {
      console.error("Error deleting file:", error);
      setDeleteError(`Failed to delete ${fileName}. Error: ${error.message}`);
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your currently logged-in account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                <span className="text-gray-800 dark:text-gray-200">{user?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">User ID:</span>
                <span className="text-gray-800 dark:text-gray-200 break-all">{user?.uid}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
               <CardTitle>Your CloudPDF Files</CardTitle>
               <CardDescription>PDFs you have uploaded to your CloudPDF account.</CardDescription>
             </CardHeader>
             <CardContent>
               {loading && (
                 <div className="flex justify-center items-center py-10">
                   <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                   <p className="ml-2 text-gray-600 dark:text-gray-400">Loading files...</p>
                 </div>
               )}

               {error && (
                  <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded text-sm text-center flex items-center justify-center gap-2">
                     <AlertCircle size={16} /> {error}
                  </div>
               )}

               {deleteError && (
                  <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded text-sm text-center mb-4 flex items-center justify-center gap-2">
                     <AlertCircle size={16} /> {deleteError}
                  </div>
               )}

               {!loading && !error && files.length === 0 && (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                   <Inbox className="mx-auto h-12 w-12 mb-2" />
                   <p>You haven't uploaded any PDF files yet.</p>
                   <Link href="/pdf-viewer" className="mt-2 inline-block">
                     <Button variant="outline" size="sm">Upload your first PDF</Button>
                   </Link>
                 </div>
               )}

               {!loading && !error && files.length > 0 && (
                 <ul className="space-y-3">
                   {files.map((file) => (
                     <li key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm gap-2">
                       <div className="flex items-center space-x-3 overflow-hidden flex-grow min-w-0">
                         <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                         <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={file.fileName}>
                               {file.fileName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                               Uploaded: {formatTimestamp(file.uploadedAt)}
                            </p>
                         </div>
                       </div>
                       <div className="flex-shrink-0 flex items-center gap-1">
                          <a href={file.downloadURL} target="_blank" rel="noopener noreferrer" download={file.fileName}>
                            <Button variant="ghost" size="icon" title="Download" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                               <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete"
                            onClick={() => handleDelete(file.id, file.fileName)}
                            disabled={deletingId === file.id}
                            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 disabled:opacity-50"
                           >
                            {deletingId === file.id ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                               <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
             </CardContent>
           </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
} 