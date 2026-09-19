import { prisma } from "@/lib/db";
import type { Place } from "@/generated/prisma/client";

export type { Place };

export function getPlaceById(id: string) {
  return prisma.place.findUnique({ where: { id } });
}

export function getPlaceByAdminKey(adminKey: string) {
  return prisma.place.findUnique({ where: { adminKey } });
}

/** 손님 페이지에 넘길 때 adminKey는 절대 포함하지 않는다. */
export function toPublicPlace(place: Place) {
  const { adminKey: _adminKey, ...rest } = place;
  return rest;
}

export type PublicPlace = ReturnType<typeof toPublicPlace>;
