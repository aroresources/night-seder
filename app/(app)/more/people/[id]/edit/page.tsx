import Link from 'next/link';
import { notFound } from 'next/navigation';

import { updatePerson } from '@/app/actions/people';
import { PersonForm } from '@/components/person-form';
import { ScreenHeader } from '@/components/ui';
import { getPerson } from '@/lib/queries';

export default async function EditPersonPage(props: PageProps<'/more/people/[id]/edit'>) {
  const { id } = await props.params;
  const person = await getPerson(id);
  if (!person) notFound();

  return (
    <>
      <ScreenHeader
        title="Edit person"
        action={
          <Link href={`/more/people/${id}`} className="text-[17px] text-accent">
            Cancel
          </Link>
        }
      />
      <PersonForm action={updatePerson.bind(null, id)} person={person} submitLabel="Save changes" />
    </>
  );
}
