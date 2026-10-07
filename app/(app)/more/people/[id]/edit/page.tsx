import Link from 'next/link';
import { notFound } from 'next/navigation';

import { updatePerson } from '@/app/actions/people';
import { PersonForm } from '@/components/person-form';
import { ScreenHeader } from '@/components/ui';
import { getGroupMembership, getGroups, getPerson } from '@/lib/queries';

export default async function EditPersonPage(props: PageProps<'/more/people/[id]/edit'>) {
  const { id } = await props.params;
  const [person, groups, membership] = await Promise.all([
    getPerson(id),
    getGroups(),
    getGroupMembership(),
  ]);
  if (!person) notFound();

  return (
    <>
      <ScreenHeader
        title={person.name}
        subtitle="Editing"
        back={{ href: `/more/people/${id}`, label: 'Back' }}
        action={
          <Link href={`/more/people/${id}`} className="text-[17px] text-accent">
            Cancel
          </Link>
        }
      />
      <PersonForm
        action={updatePerson.bind(null, id)}
        person={person}
        groups={groups}
        memberOf={membership.get(id) ?? []}
        submitLabel="Save changes"
      />
    </>
  );
}
