'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/admin-shell';
import { Layout } from 'lucide-react';

export default function CMSPagesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified dynamic sections manager
    router.replace('/cms/dynamic-sections');
  }, [router]);

  return (
    <AdminShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Redirecting...</h2>
          <p className="text-muted-foreground">Moving to the unified Dynamic Sections manager.</p>
        </div>
      </div>
    </AdminShell>
  );
}
