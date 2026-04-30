import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

export default async function HomeGate() {
  const session = await getSession();
  if (!session) redirect('/login');

  await connectDB();
  const user = await User.findById(session.userId).select('onboardedAt').lean();
  if (!user?.onboardedAt) redirect('/onboarding');

  redirect('/events');
}
