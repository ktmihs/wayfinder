import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GuestView from "@/components/GuestView";
import { getPlaceById, toPublicPlace } from "@/lib/places";

export async function generateMetadata({ params }: PageProps<"/go/[id]">): Promise<Metadata> {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) return { title: "오시는 길" };
  return {
    title: place.name,
    description: `${place.placeName ?? place.address} 오시는 길`,
  };
}

export default async function GuestPage({ params }: PageProps<"/go/[id]">) {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) notFound();

  // adminKey는 절대 클라이언트로 보내지 않는다.
  return <GuestView place={toPublicPlace(place)} />;
}
