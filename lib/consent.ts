/**
 * The words on the public opt-in form.
 *
 * Kept in its own module because a "use server" file may only export async
 * functions, and both the page and the action need these words — the page to
 * show them, the action to store them against the signup.
 *
 * Changing this changes what future signups agreed to, never what past ones
 * did: each row keeps its own copy.
 */
export const CONSENT_TEXT =
  'I agree to receive text messages from Ohr Mattisyahu about night seder and ' +
  'morning learning: reminders of start times, notice when a session is cancelled ' +
  'or rescheduled, and occasional announcements. Message frequency varies and is ' +
  'usually fewer than four messages a month. Message and data rates may apply. ' +
  'Reply STOP to stop, HELP for help. Agreeing is not a condition of learning here.';
