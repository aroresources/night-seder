'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { sendBroadcast, type SendOutcome } from '@/app/actions/messages';
import { isSendable } from '@/lib/phone';
import type { Group } from '@/lib/types';

import { Button, inputClasses } from './ui';
import { useToast } from './toast';

export interface Recipient {
  id: string;
  name: string;
  phone: string | null;
  inNight: boolean;
  inDaf: boolean;
  inShachris: boolean;
  optedOut: boolean;
  groupIds: string[];
}

/** A text is 160 characters; past that it is billed as more than one. */
const SEGMENT = 160;

export function MessageComposer({
  recipients,
  groups,
  configured,
}: {
  recipients: Recipient[];
  groups: Group[];
  /** False until the Twilio keys are in place. */
  configured: boolean;
}) {
  const [audience, setAudience] = useState('night');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const chosen = useMemo(() => {
    return recipients.filter((person) => {
      switch (audience) {
        case 'night':
          return person.inNight;
        case 'daf':
          return person.inDaf;
        case 'shachris':
          return person.inShachris;
        case 'group':
          return person.groupIds.includes(groupId);
        default:
          return true;
      }
    });
  }, [recipients, audience, groupId]);

  const willReceive = chosen.filter((p) => !p.optedOut && isSendable(p.phone));
  const noNumber = chosen.filter((p) => !p.optedOut && !isSendable(p.phone));
  const optedOut = chosen.filter((p) => p.optedOut);

  const segments = body.length === 0 ? 0 : Math.ceil(body.length / SEGMENT);
  const audienceLabel =
    audience === 'group'
      ? (groups.find((g) => g.id === groupId)?.name ?? 'Group')
      : audience === 'night'
        ? 'Night seder'
        : audience === 'daf'
          ? 'Daf'
          : audience === 'shachris'
            ? 'Shachris'
            : 'Everyone';

  function send() {
    const form = new FormData();
    form.set('body', body);
    form.set('audience', audience);
    form.set('group_id', groupId);
    form.set('audience_label', audienceLabel);

    startTransition(async () => {
      try {
        const result = await sendBroadcast(form);
        setOutcome(result);
        setConfirming(false);
        setBody('');
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Couldn't send.");
        setConfirming(false);
      }
    });
  }

  if (outcome) {
    return (
      <section className="px-4 pt-4">
        <div className="rounded-xl bg-surface p-4">
          <p className="text-[17px] font-semibold">
            Sent to {outcome.sent} {outcome.sent === 1 ? 'man' : 'men'}
          </p>
          {outcome.failed > 0 || outcome.skipped > 0 ? (
            <p className="mt-1 text-[15px] text-ink-secondary">
              {outcome.failed > 0 ? `${outcome.failed} failed. ` : ''}
              {outcome.skipped > 0 ? `${outcome.skipped} skipped.` : ''}
            </p>
          ) : null}

          {outcome.problems.length > 0 ? (
            <div className="mt-3 divide-y divide-hairline border-t border-hairline pt-2">
              {outcome.problems.map((problem) => (
                <p key={problem.name} className="py-1.5 text-[13px] text-ink-secondary">
                  <span className="text-ink">{problem.name}</span> — {problem.reason}
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-3">
            <Button onClick={() => setOutcome(null)} className="px-0">
              Write another
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pt-4">
      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
        {!configured ? (
          <p className="rounded-lg bg-canvas px-3 py-2 text-[13px] text-ink-secondary">
            Texting isn&apos;t set up yet. Add the Twilio keys in Vercel and this will start
            working — you can still see who a message would go to.
          </p>
        ) : null}

        <div>
          <span className="mb-1 block text-[13px] text-ink-secondary">Send to</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['night', 'Night seder'],
                ['daf', 'Daf'],
                ['shachris', 'Shachris'],
                ['all', 'Everyone'],
                ...(groups.length > 0 ? ([['group', 'A group']] as [string, string][]) : []),
              ] as [string, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAudience(value)}
                aria-pressed={audience === value}
                className={`min-h-[2.75rem] rounded-xl px-3 text-[15px] ${
                  audience === value ? 'bg-accent text-on-accent' : 'bg-canvas text-ink-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {audience === 'group' ? (
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            aria-label="Group"
            className={inputClasses}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-secondary">Message</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Night seder starts at 8:30 tonight."
            className={inputClasses}
          />
          <span className="mt-1 block text-[13px] text-ink-tertiary">
            {body.length} characters
            {segments > 1 ? ` · ${segments} texts each, so ${segments}× the cost` : ''}
          </span>
        </label>

        <div className="rounded-lg bg-canvas px-3 py-2 text-[13px] text-ink-secondary">
          <p className="text-[15px] text-ink">
            {willReceive.length} {willReceive.length === 1 ? 'man' : 'men'} will get this
          </p>
          {noNumber.length > 0 ? (
            <p className="mt-1">
              {noNumber.length} skipped, no usable number: {noNumber.map((p) => p.name).join(', ')}
            </p>
          ) : null}
          {optedOut.length > 0 ? (
            <p className="mt-1">
              {optedOut.length} asked not to be texted: {optedOut.map((p) => p.name).join(', ')}
            </p>
          ) : null}
        </div>

        {confirming ? (
          <div className="flex flex-col gap-2 rounded-lg bg-canvas p-3">
            <p className="text-[15px]">
              Send to {willReceive.length} {willReceive.length === 1 ? 'man' : 'men'}? This can&apos;t
              be taken back.
            </p>
            <div className="flex gap-2">
              <Button variant="filled" disabled={pending} onClick={send}>
                {pending ? 'Sending' : 'Yes, send it'}
              </Button>
              <Button onClick={() => setConfirming(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button
              variant="filled"
              disabled={!configured || body.trim() === '' || willReceive.length === 0}
              onClick={() => setConfirming(true)}
            >
              Send
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
