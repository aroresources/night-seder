import Link from 'next/link';
import { notFound } from 'next/navigation';

import { updateZman } from '@/app/actions/zmanim';
import { ScreenHeader } from '@/components/ui';
import { ZmanForm } from '@/components/zman-form';
import { getZman } from '@/lib/queries';

export default async function EditZmanPage(props: PageProps<'/more/zmanim/[id]/edit'>) {
  const { id } = await props.params;
  const zman = await getZman(id);
  if (!zman) notFound();

  return (
    <>
      <ScreenHeader
        title="Edit zman"
        action={
          <Link href={`/more/zmanim/${id}`} className="text-[17px] text-accent">
            Cancel
          </Link>
        }
      />
      <ZmanForm action={updateZman.bind(null, id)} zman={zman} submitLabel="Save changes" />
    </>
  );
}
