import Link from 'next/link';

import { createPerson } from '@/app/actions/people';
import { PersonForm } from '@/components/person-form';
import { ScreenHeader } from '@/components/ui';
import { getGroups } from '@/lib/queries';

export default async function NewPersonPage() {
  const groups = await getGroups();

  return (
    <>
      <ScreenHeader
        title="Add person"
        action={
          <Link href="/more/people" className="text-[17px] text-accent">
            People
          </Link>
        }
      />
      <PersonForm action={createPerson} groups={groups} submitLabel="Add person" />
    </>
  );
}
