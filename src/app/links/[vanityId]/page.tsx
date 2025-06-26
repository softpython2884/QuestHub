import { getProjectByVanityId } from '@/lib/db';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface LinksPageProps {
  params: {
    vanityId: string;
  };
}

export default async function LinksPage({ params }: LinksPageProps) {
  const { vanityId } = params;
  if (!vanityId) {
    notFound();
  }

  const project = await getProjectByVanityId(vanityId);

  if (project) {
    redirect(`/projects/${project.uuid}`);
  } else {
    notFound();
  }
}
