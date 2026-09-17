import { ContactList } from '@/components/contact-list';
import { ScreenHeader } from '@/components/ui';
import { loadContactData } from '@/lib/contact-data';

export default async function ContactPage() {
  const { rows } = await loadContactData();
  const needsAttention = rows.filter(
    (row) => row.trackContact && row.group === 'needs_attention',
  ).length;

  return (
    <>
      <ScreenHeader
        title="Contact"
        subtitle={
          needsAttention === 0
            ? 'Nobody needs chasing'
            : `${needsAttention} ${needsAttention === 1 ? 'person needs' : 'people need'} attention`
        }
      />
      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <ContactList rows={rows} />
      </div>
    </>
  );
}
