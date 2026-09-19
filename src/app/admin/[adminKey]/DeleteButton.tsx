"use client";

import { useTransition } from "react";
import { deletePlace } from "@/app/actions";

export default function DeleteButton({ adminKey }: { adminKey: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("안내 페이지를 삭제할까요? 손님용 링크도 더 이상 열리지 않아요.")) {
          start(() => deletePlace(adminKey));
        }
      }}
      className="text-sm text-rose-600 disabled:opacity-50"
    >
      {pending ? "삭제 중…" : "이 안내 페이지 삭제"}
    </button>
  );
}
