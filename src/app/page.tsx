"use client";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { LogIn, UserPlus, FileText, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="text-center py-16 md:py-24 bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-12">
          <FileText size={64} className="mx-auto text-blue-600 dark:text-blue-400 mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Welcome to CloudPDF
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Your secure and simple solution for managing and viewing PDF documents online.
          </p>
          {!user && (
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button size="lg">
                  <LogIn className="mr-2 h-5 w-5" /> Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline">
                   <UserPlus className="mr-2 h-5 w-5" /> Register
                </Button>
              </Link>
            </div>
          )}
          {user && (
             <Link href="/dashboard">
                <Button size="lg">
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
          )}
        </section>

        {user ? (
          <section>
             <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 dark:text-gray-200">Your PDF Hub</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>View PDFs</CardTitle>
                  <CardDescription>Access the PDF viewer to open and read your documents.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Link href="/pdf-viewer">
                      <Button variant="outline" className="w-full">
                        Open PDF Viewer <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                   <CardTitle>Account Dashboard</CardTitle>
                   <CardDescription>View your account details and manage settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard">
                     <Button variant="outline" className="w-full">
                       Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                     </Button>
                   </Link>
                </CardContent>
              </Card>
             
            </div>
          </section>
        ) : (
          <section className="text-center">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Why CloudPDF?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard title="Secure Storage" description="Keep your documents safe in the cloud." />
              <FeatureCard title="Easy Access" description="View your PDFs from anywhere, anytime." />
              <FeatureCard title="Simple Interface" description="Intuitive design for effortless navigation." />
            </div>
          </section>
        )}
      </main>
      
      <footer className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-12">
        © {new Date().getFullYear()} CloudPDF. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string, description: string }) {
  return (
    <Card className="text-left">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </CardContent>
    </Card>
  );
}
