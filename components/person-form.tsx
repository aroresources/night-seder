import { ageOn, today } from '@/lib/dates';
import { centsToInput } from '@/lib/money';
import { MARITAL_STATUSES, PAYMENT_METHODS, type Group, type Person } from '@/lib/types';

import { Button, inputClasses } from './ui';

/** Add and edit share one form; `person` is absent when adding. */
export function PersonForm({
  action,
  person,
  groups,
  memberOf = [],
  submitLabel,
}: {
  action: (form: FormData) => Promise<void>;
  person?: Person;
  /** Every group that exists, to tick. */
  groups: Group[];
  /** The ids this person is already in. */
  memberOf?: string[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="mx-auto w-full max-w-[480px] pb-tabbar">
      <section className="px-4 pt-4">
        <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">
              First name (optional)
            </span>
            <input
              name="first_name"
              defaultValue={person?.first_name ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">
              Middle name (optional)
            </span>
            <input
              name="middle_name"
              defaultValue={person?.middle_name ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Last name</span>
            <input
              name="last_name"
              required
              autoFocus={!person}
              defaultValue={person?.last_name ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Role</span>
            <select name="role" defaultValue={person?.role ?? 'working'} className={inputClasses}>
              <option value="working">Working</option>
              <option value="rabbi">Rabbi</option>
            </select>
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Phone (optional)</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={person?.phone ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="sms_opt_in"
              defaultChecked={person ? person.sms_opt_in : false}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="flex-1 text-[17px]">
              Gets text messages
              <span className="mt-0.5 block text-[13px] text-ink-tertiary">
                Only tick this once he has said yes. Most of the chabura prefer WhatsApp.
              </span>
            </span>
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Email (optional)</span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="off"
              autoCorrect="off"
              defaultValue={person?.email ?? ''}
              className={inputClasses}
            />
          </label>

          <div className="px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Single or married</span>
            {/* Wraps rather than squeezing: four of these don't fit one row
                at phone width. */}
            <div className="flex flex-wrap gap-2">
              {MARITAL_STATUSES.map((option) => (
                <label
                  key={option.label}
                  className="flex min-h-[2.75rem] min-w-[5.5rem] flex-1 items-center justify-center rounded-xl bg-canvas px-3 text-[15px] has-checked:bg-accent has-checked:text-on-accent"
                >
                  <input
                    type="radio"
                    name="marital_status"
                    value={option.value}
                    defaultChecked={(person?.marital_status ?? '') === option.value}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Job (optional)</span>
            <input name="job" defaultValue={person?.job ?? ''} className={inputClasses} />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Rebbe (optional)</span>
            <input name="rebbe" defaultValue={person?.rebbe ?? ''} className={inputClasses} />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">
              What he is looking for (optional)
            </span>
            <textarea
              name="looking_for"
              rows={3}
              defaultValue={person?.looking_for ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Birthday (optional)</span>
            <input
              type="date"
              name="birthday"
              defaultValue={person?.birthday ?? ''}
              className={inputClasses}
            />
            {person?.birthday ? (
              <span className="mt-1 block text-[13px] text-ink-tertiary">
                {ageOn(person.birthday, today())} years old
              </span>
            ) : null}
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Address (optional)</span>
            <textarea
              name="address"
              rows={2}
              defaultValue={person?.address ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Notes (optional)</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={person?.notes ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="in_night_seder"
              defaultChecked={person ? person.in_night_seder : true}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-[17px]">In night seder</span>
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="in_daf"
              defaultChecked={person ? person.in_daf : false}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-[17px]">In Daf</span>
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="in_shachris"
              defaultChecked={person ? person.in_shachris : false}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-[17px]">In Shachris</span>
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="in_misc"
              defaultChecked={person ? person.in_misc : false}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-[17px]">On the Misc list</span>
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="gets_paid"
              defaultChecked={person ? person.gets_paid : false}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-[17px]">Gets paid</span>
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">
              Usual monthly amount (optional)
            </span>
            <input
              name="monthly_amount"
              inputMode="decimal"
              placeholder="180"
              defaultValue={
                person?.monthly_amount_cents != null
                  ? centsToInput(person.monthly_amount_cents)
                  : ''
              }
              className={inputClasses}
            />
            <span className="mt-1 block text-[13px] text-ink-tertiary">
              Prefills each month on the Payments page. A payment can still be more or less.
            </span>
          </label>

          <div className="px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Usually paid by</span>
            {/* Wraps rather than squeezing: six of these don't fit one row
                at phone width. */}
            <div className="flex flex-wrap gap-2">
              {[{ value: '', label: 'Not said' }, ...PAYMENT_METHODS].map((option) => (
                <label
                  key={option.label}
                  className="flex min-h-[2.75rem] min-w-[5.5rem] flex-1 items-center justify-center rounded-xl bg-canvas px-3 text-[15px] has-checked:bg-accent has-checked:text-on-accent"
                >
                  <input
                    type="radio"
                    name="usual_payment_method"
                    value={option.value}
                    defaultChecked={(person?.usual_payment_method ?? '') === option.value}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <span className="mt-1 block text-[13px] text-ink-tertiary">
              Prefills how a payment was made. Any one payment can still be different.
            </span>
          </div>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Start date</span>
            <input
              type="date"
              name="start_date"
              defaultValue={person?.start_date ?? today()}
              className={inputClasses}
            />
            <span className="mt-1 block text-[13px] text-ink-tertiary">
              He is only expected at sessions from this date on.
            </span>
          </label>
        </div>
      </section>

      <section className="px-4">
        <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">Groups</h2>
        <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
          {groups.length === 0 ? (
            <p className="px-4 py-3 text-[15px] text-ink-secondary">
              No groups yet. Make one under More, then tag the men who learn that topic.
            </p>
          ) : (
            groups.map((group) => (
              <label
                key={group.id}
                className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5"
              >
                <input
                  type="checkbox"
                  name="group_ids"
                  value={group.id}
                  defaultChecked={memberOf.includes(group.id)}
                  className="h-5 w-5 accent-[var(--accent)]"
                />
                <span className="text-[17px]">{group.name}</span>
              </label>
            ))
          )}
        </div>
      </section>

      <div className="px-4 pt-4">
        <Button type="submit" variant="filled">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
