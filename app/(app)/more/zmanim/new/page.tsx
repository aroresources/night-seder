import Link from 'next/link';

import { createZman } from '@/app/actions/zmanim';
import { ScreenHeader } from '@/components/ui';
import { ZmanForm } from '@/components/zman-form';

export default function NewZmanPage() {
  return (
    <>
      <ScreenHeader
        title="New zman"
        action={
          <Link href="/more/zmanim" className="text-[17px] text-accent">
            Zmanim
          </Link>
        }
      />
      <ZmanForm action={createZman} submitLabel="Create zman" />
    </>
  );
}
