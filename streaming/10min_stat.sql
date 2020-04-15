CREATE OR REPLACE STREAM "DESTINATION_SQL_STREAM" (
  "cab_type" VARCHAR(64),
  "tpep_pickup_datetime" TIMESTAMP,
  "pickup_location_id" INT,
  "trips" INT
);

CREATE OR REPLACE PUMP "STREAM_PUMP" AS
  INSERT INTO "DESTINATION_SQL_STREAM"
    SELECT STREAM
        "cab_type",
        FlOOR("tpep_pickup_datetime" TO MINUTE),
        "pickup_location_id",
        COUNT(*) AS trips
    FROM "SOURCE_SQL_STREAM_001"
    WINDOWED BY STAGGER (
            PARTITION BY "cab_type",  FlOOR("tpep_pickup_datetime" TO MINUTE), "pickup_location_id" RANGE INTERVAL '1' MINUTE);
