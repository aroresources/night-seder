import Link from 'next/link';

import { PeopleList } from '@/components/people-list';
import { Empty, ButtonLink, ScreenHeader } from '@/components/ui';
import { getGroupMembership, getGroups, getPeople } from '@/lib/queries';

export default async function PeoplePage() {
  const [people, groups, membership] = await Promise.all([
    getPeople(),
    getGroups(),
    getGroupMembership(),
  ]);
  const groupsByPerson = Object.fromEntries(membership);

  return (
    <>
      <ScreenHeader
        title="People"
        subtitle={`${people.filter((p) => p.active).length} active`}
        action={
          <Link href="/more/people/new" className="text-[17px] text-accent">
            Add
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        {people.length === 0 ? (
          <Empty
            action={
              <ButtonLink href="/more/people/new" variant="filled">
                Add someone
              </ButtonLink>
            }
          >
            No people yet. Add the men who learn, or paste a whole list at once.
          </Empty>
        ) : (
          <PeopleList people={people} groups={groups} groupsByPerson={groupsByPerson} />
        )}

        <div className="px-4 pt-5">
          <Link href="/more/people/bulk" className="text-[17px] text-accent">
            Paste a list of names
          </Link>
        </div>
      </div>
    </>
  );
}
