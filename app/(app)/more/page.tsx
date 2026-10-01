import { SignOut } from '@/components/sign-out';
import { Group, LinkRow, ScreenHeader } from '@/components/ui';
import { currentUser } from '@/lib/supabase/server';

export default async function MorePage() {
  const user = await currentUser();

  return (
    <>
      <ScreenHeader title="More" />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <Group>
          <LinkRow href="/more/people">People</LinkRow>
          <LinkRow href="/more/zmanim">Zmanim</LinkRow>
          <LinkRow href="/more/payments">Payments</LinkRow>
          <LinkRow href="/more/daf-days-off">Daf days off</LinkRow>
          <LinkRow href="/more/settings">Settings</LinkRow>
        </Group>

        <Group footer={user?.email ?? undefined}>
          <SignOut />
        </Group>
      </div>
    </>
  );
}
