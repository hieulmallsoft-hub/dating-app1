-- Rename legacy places table to locations and align column/enum names.
-- Run this once before starting the app after renaming the module.

ALTER TABLE IF EXISTS places RENAME TO locations;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'placeType'
    ) THEN
        ALTER TABLE locations RENAME COLUMN "placeType" TO "locationType";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'places_placetype_enum') THEN
        ALTER TYPE places_placetype_enum RENAME TO locations_locationtype_enum;
    ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'places_placeType_enum') THEN
        ALTER TYPE "places_placeType_enum" RENAME TO "locations_locationType_enum";
    END IF;
END $$;
