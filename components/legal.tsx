/**
 * The shell for the two public pages — the privacy policy and the terms.
 *
 * They are read by a carrier's reviewer on a desktop and by a man on his
 * phone, so this is plain prose at a readable width, with none of the app's
 * tab bar or chrome: there is nothing to navigate to from here.
 */
export function Legal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[640px] px-5 py-10">
      <h1 className="text-[28px] font-semibold">{title}</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">Ohr Mattisyahu</p>
      <div className="mt-6">{children}</div>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-[19px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[16px] leading-relaxed">{children}</p>;
}
