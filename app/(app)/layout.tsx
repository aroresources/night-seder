import { redirect } from 'next/navigation';

import { TabBar } from '@/components/tab-bar';
import { ToastProvider } from '@/components/toast';
import { currentUser } from '@/lib/supabase/server';

/**
 * Everything inside this group needs a session. The proxy redirects too; this
 * is the check that actually guards the data, since a proxy can be bypassed.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await currentUser();
  if (!user) redirect('/login');

  return (
    <ToastProvider>
      {children}
      <TabBar />
    </ToastProvider>
  );
}
