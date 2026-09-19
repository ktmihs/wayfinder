-- mode(단일) → modes(복수, 쉼표 구분). 기존 값은 그대로 옮긴다.
ALTER TABLE "Place" ADD COLUMN "modes" TEXT NOT NULL DEFAULT 'map';
UPDATE "Place" SET "modes" = "mode";
ALTER TABLE "Place" DROP COLUMN "mode";
