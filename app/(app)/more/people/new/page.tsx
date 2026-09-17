import Link from 'next/link';

import { createPerson } from '@/app/actions/people';
import { PersonForm } from '@/components/person-form';
import { ScreenHeader } from '@/components/ui';

export default function NewPersonPage() {
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
      <PersonForm action={createPerson} submitLabel="Add person" />
    </>
  );
}
