-- Built-in connection metadata is required on a fresh site, including payment foreign keys.
INSERT INTO "App" ("slug", "dirName", "categories", "enabled", "updatedAt") VALUES
  ('pramaan-calendar', 'pramaan-calendar', ARRAY['calendar']::"AppCategories"[], true, NOW()),
  ('pramaan-payment', 'pramaan-payment', ARRAY['payment']::"AppCategories"[], true, NOW()),
  ('weather_in_your_calendar', 'weather_in_your_calendar', ARRAY['other']::"AppCategories"[], true, NOW())
ON CONFLICT ("slug") DO NOTHING;
