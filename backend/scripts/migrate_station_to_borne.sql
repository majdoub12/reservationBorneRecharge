BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stations'
      AND column_name = 'heur_ouverture'
  ) THEN
    ALTER TABLE stations ADD COLUMN heur_ouverture TIME NOT NULL DEFAULT '08:00:00';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stations'
      AND column_name = 'heur_fermeture'
  ) THEN
    ALTER TABLE stations ADD COLUMN heur_fermeture TIME NOT NULL DEFAULT '20:00:00';
  END IF;

  UPDATE stations SET heur_ouverture = COALESCE(heur_ouverture, '08:00:00'::time);
  UPDATE stations SET heur_fermeture = COALESCE(heur_fermeture, '20:00:00'::time);

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bornes'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'borne'
  ) THEN
    EXECUTE 'ALTER TABLE bornes RENAME TO borne';

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'bornes_station_fk'
    ) THEN
      EXECUTE 'ALTER TABLE borne RENAME CONSTRAINT bornes_station_fk TO borne_station_fk';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'borne'
  ) THEN
    EXECUTE '
      CREATE TABLE borne (
        id_b SERIAL PRIMARY KEY,
        station_id UUID NOT NULL,
        charging_speed_kw NUMERIC,
        average_duration_hours NUMERIC,
        tarif NUMERIC,
        CONSTRAINT borne_station_fk FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
      )
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reservations'
      AND column_name = 'borne_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN borne_id INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'reservations'::regclass
      AND conname = 'reservations_borne_fk'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT reservations_borne_fk
      FOREIGN KEY (borne_id) REFERENCES borne(id_b) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
DECLARE
  has_tariff boolean;
  has_tarif boolean;
  price_expr text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stations'
      AND column_name IN ('charging_speed_kw', 'average_duration_hours', 'tariff', 'tarif', 'capacity')
  ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stations' AND column_name = 'tariff'
    ) INTO has_tariff;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stations' AND column_name = 'tarif'
    ) INTO has_tarif;

    IF has_tariff AND has_tarif THEN
      price_expr := 'COALESCE(tariff, tarif)';
    ELSIF has_tariff THEN
      price_expr := 'tariff';
    ELSIF has_tarif THEN
      price_expr := 'tarif';
    ELSE
      price_expr := 'NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM borne LIMIT 1) THEN
      EXECUTE format(
        'INSERT INTO borne (station_id, charging_speed_kw, average_duration_hours, tarif)
         SELECT id, charging_speed_kw, average_duration_hours, %s
         FROM stations',
        price_expr
      );
    END IF;

    ALTER TABLE stations DROP COLUMN IF EXISTS charging_speed_kw;
    ALTER TABLE stations DROP COLUMN IF EXISTS average_duration_hours;
    ALTER TABLE stations DROP COLUMN IF EXISTS tariff;
    ALTER TABLE stations DROP COLUMN IF EXISTS tarif;
    ALTER TABLE stations DROP COLUMN IF EXISTS capacity;
  END IF;
END $$;

COMMIT;
