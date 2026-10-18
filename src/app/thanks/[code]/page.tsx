import {
  ShareCardPage,
  shareCardMetadata,
} from "~/app/_components/share/share-card-page";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  return shareCardMetadata("thanks", code);
}

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <ShareCardPage kind="thanks" code={code} />;
}
