import Link from 'next/link';

import { createGroup, deleteGroup, renameGroup } from '@/app/actions/groups';
import { Button, ScreenHeader, inputClasses } from '@/components/ui';
import { getGroupMembership, getGroups, getPeople } from '@/lib/queries';

export default async function GroupsPage() {
  const [groups, membership, people] = await Promise.all([
    getGroups(),
    getGroupMembership(),
    getPeople(),
  ]);

  const names = new Map(people.map((person) => [person.id, person.name]));

  /** Who is in each group, in the same surname order as every other list. */
  const membersOf = new Map<string, string[]>();
  for (const [personId, groupIds] of membership) {
    for (const groupId of groupIds) {
      const existing = membersOf.get(groupId);
      const name = names.get(personId);
      if (!name) continue;
      if (existing) existing.push(name);
      else membersOf.set(groupId, [name]);
    }
  }

  return (
    <>
      <ScreenHeader
        title="Groups"
        subtitle="For tagging who learns what"
        action={
          <Link href="/more" className="text-[17px] text-accent">
            More
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <form action={createGroup} className="px-4 pt-4">
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
            <label className="block">
              <span className="mb-1 block text-[13px] text-ink-secondary">New group</span>
              <input
                name="name"
                required
                placeholder="For example Mishna Berura"
                className={inputClasses}
              />
            </label>
            <div>
              <Button type="submit" variant="filled">
                Add group
              </Button>
            </div>
          </div>
        </form>

        <section className="px-4">
          <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">
            Groups
          </h2>
          <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
            {groups.length === 0 ? (
              <p className="px-4 py-3 text-[15px] text-ink-secondary">
                No groups yet. Add one above, then tick it on each man&apos;s page.
              </p>
            ) : (
              groups.map((group) => {
                const members = membersOf.get(group.id) ?? [];
                return (
                  <div key={group.id} className="px-4 py-3">
                    <form
                      action={renameGroup.bind(null, group.id)}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="name"
                        defaultValue={group.name}
                        required
                        aria-label={`Name of ${group.name}`}
                        className={`${inputClasses} flex-1`}
                      />
                      <button type="submit" className="min-h-[2.75rem] px-2 text-[15px] text-accent">
                        Save
                      </button>
                    </form>

                    <div className="mt-1 flex items-baseline gap-2">
                      <p className="min-w-0 flex-1 text-[13px] text-ink-secondary">
                        {members.length === 0
                          ? 'Nobody tagged yet'
                          : `${members.length}: ${members.join(', ')}`}
                      </p>
                      <form action={deleteGroup.bind(null, group.id)}>
                        <button type="submit" className="px-2 text-[13px] text-danger">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="px-1 pt-2 text-[13px] text-ink-secondary">
            A group is only a label. Deleting one removes the tag from everyone who had it and
            touches nothing else — not pairs, not attendance, not payments.
          </p>
        </section>
      </div>
    </>
  );
}
