-- 테마를 white/black/auto 세 가지로 정리하고 사진 대표색 컬럼 추가
ALTER TABLE "Place" ADD COLUMN "accent" TEXT;
ALTER TABLE "Place" ALTER COLUMN "theme" SET DEFAULT 'white';
UPDATE "Place" SET "theme" = CASE WHEN "theme" = 'night' THEN 'black' WHEN "theme" IN ('white','black','auto') THEN "theme" ELSE 'white' END;
