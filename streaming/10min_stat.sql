CREATE OR REPLACE STREAM "DESTINATION_SQL_STREAM_001" (
  cab_type VARCHAR(64),
  date DATE,
  trips INT,
);

CREATE OR REPLACE PUMP "SOURCE_SQL_STREAM_001" AS
    INSERT INTO "DESTINATION_SQL_STREAM_001"
    SELECT STREAM
      "SOURCE_SQL_STREAM_001".cab_type,
      "SOURCE_SQL_STREAM_001".tpep_pickup_datetime,
      "SOURCE_SQL_STREAM_001".pickup_location_id,
      "c".SETTEMP as SETTEMP,
      ((CAST( ABS("SOURCE_SQL_STREAM_001".TEMP - "c"."SETTEMP") AS DOUBLE )) / (CAST( "c"."SETTEMP" AS DOUBLE ))) AS PCT_INEFFICIENCY
    FROM "SOURCE_SQL_STREAM_001"
;
CREATE TABLE daily_pickups_taxi AS
SELECT
 cab_type,
 date(tpep_pickup_datetime) AS date,
 pickup_location_id,
 COUNT(*) AS trips
FROM trips
GROUP BY cab_type, date(tpep_pickup_datetime), pickup_location_id
ORDER BY cab_type, date(tpep_pickup_datetime), pickup_location_id;