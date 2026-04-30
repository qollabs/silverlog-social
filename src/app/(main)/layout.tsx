import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { BottomNav } from '@/components/BottomNav';
import { FlutterBridgeProvider } from '@/components/FlutterBridgeProvider';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  await connectDB();
  const user = await User.findById(session.userId).select('onboardedAt').lean();
  if (!user?.onboardedAt) redirect('/onboarding');

  return (
    <FlutterBridgeProvider>
      <main className="max-w-md mx-auto pb-24 min-h-screen">{children}</main>
      <BottomNav />
    </FlutterBridgeProvider>
  );
}
