-- pickups by geography
CREATE TABLE daily_pickups_taxi AS
SELECT
 cab_type,
 date(tpep_pickup_datetime) AS date,
 pickup_location_id,
 COUNT(*) AS trips
FROM trips
GROUP BY cab_type, date(tpep_pickup_datetime), pickup_location_id
ORDER BY cab_type, date(tpep_pickup_datetime), pickup_location_id;
-- CREATE UNIQUE INDEX idx_daily_with_locations ON daily_with_locations (car_type, date, pickup_location_id);


\copy (SELECT * FROM daily_with_locations) TO 'data/daily_trips_with_location_id.csv' CSV HEADER;
\copy (SELECT locationid, zone, borough FROM taxi_zones ORDER BY locationid) TO 'data/taxi_zones_simple.csv' CSV HEADER;

CREATE TABLE daily_trips AS
SELECT
  car_type,
  date,
  SUM(trips) AS trips,
  'total'::text AS geo
FROM daily_with_locations
GROUP BY car_type, date
ORDER BY car_type, date;

CREATE TABLE daily_manhattan AS
SELECT
  car_type,
  date,
  SUM(trips) AS trips,
  'manhattan'::text AS geo
FROM daily_with_locations
WHERE pickup_location_id IN (SELECT locationid FROM taxi_zones WHERE borough = 'Manhattan')
GROUP BY car_type, date
ORDER BY car_type, date;

CREATE TABLE daily_manhattan_hub AS
SELECT
  car_type,
  date,
  SUM(trips) AS trips,
  'manhattan_hub'::text AS geo
FROM daily_with_locations
WHERE pickup_location_id IN (SELECT locationid FROM hub_zones)
GROUP BY car_type, date
ORDER BY car_type, date;

-- JFK = 132, LGA = 138
CREATE TABLE daily_airports AS
SELECT
  car_type,
  date,
  SUM(trips) AS trips,
  'airports'::text AS geo
FROM daily_with_locations
WHERE pickup_location_id IN (132, 138)
GROUP BY car_type, date
ORDER BY car_type, date;

CREATE TABLE daily_outer_boroughs_ex_airports AS
SELECT
  car_type,
  date,
  SUM(trips) AS trips,
  'outer_boroughs_ex_airports'::text AS geo
FROM daily_with_locations
WHERE pickup_location_id IN (
  SELECT locationid
  FROM taxi_zones
  WHERE borough IN ('Bronx', 'Brooklyn', 'Queens', 'Staten Island')
    AND locationid NOT IN (132, 138)
)
GROUP BY car_type, date
ORDER BY car_type, date;



-- JFK protest / #DeleteUber analysis
-- JFK airport = location 132
CREATE TABLE hourly_pickups_taxi AS
SELECT
cab_type,
date_trunc('hour', tpep_pickup_datetime) AS pickup_hour,
pickup_location_id,
COUNT(*) AS trips
FROM trips
GROUP BY  cab_type, date_trunc('hour', tpep_pickup_datetime), pickup_location_id
ORDER BY  cab_type, date_trunc('hour', tpep_pickup_datetime), pickup_location_id;

CREATE TABLE jfk_hourly_pickups_fhv AS
SELECT
  dba_category,
  date_trunc('hour', pickup_datetime) AS pickup_hour,
  pickup_location_id,
  COUNT(*) AS trips
FROM fhv_trips t, fhv_bases b
WHERE t.dispatching_base_num = b.base_number
  AND t.pickup_location_id = 132
GROUP BY dba_category, pickup_hour, pickup_location_id
ORDER BY dba_category, pickup_hour, pickup_location_id;

-- Uber vs. Lyft
CREATE TABLE uber_vs_lyft AS
SELECT
  CASE
    WHEN date BETWEEN '2016-01-01' AND '2016-12-31' THEN '2016'
    WHEN date BETWEEN '2017-01-01' AND '2017-01-28' THEN 'pre_strike'
    WHEN date BETWEEN '2017-01-29' AND '2017-02-04' THEN 'post_strike'
    WHEN date BETWEEN '2017-02-05' AND '2017-12-31' THEN 'rest_of_2017'
  END AS era,
  pickup_location_id,
  SUM(CASE WHEN car_type = 'uber' THEN trips END) / SUM(trips)::numeric AS uber_share,
  SUM(CASE WHEN car_type = 'lyft' THEN trips END) / SUM(trips)::numeric AS lyft_share,
  SUM(CASE WHEN car_type = 'uber' THEN trips END) AS uber_trips,
  SUM(CASE WHEN car_type = 'lyft' THEN trips END) AS lyft_trips,
  SUM(trips) AS total_trips,
  COUNT(DISTINCT date) AS days
FROM daily_with_locations
WHERE car_type IN ('uber', 'lyft')
  AND date >= '2016-01-01'
  AND date < '2018-01-01'
GROUP BY era, pickup_location_id
ORDER BY pickup_location_id, era;

CREATE TABLE uber_vs_lyft_carto_data AS
SELECT
  *,
  ROUND(lyft_share_change * 100) || '%' AS lyft_share_change_pct,
  ROUND(pre_strike_lyft_share * 100) || '%' AS pre_strike_lyft_share_pct,
  ROUND(post_strike_lyft_share * 100) || '%' AS post_strike_lyft_share_pct,
  ROUND(rest_of_2017_lyft_share * 100) || '%' AS rest_of_2017_lyft_share_pct,
  ROUND(lyft_share_2016 * 100) || '%' AS lyft_share_2016_pct
FROM (
  SELECT
    z.locationid,
    z.zone,
    z.borough,
    SUM(CASE era WHEN 'post_strike' THEN lyft_share WHEN 'pre_strike' THEN -lyft_share END) AS lyft_share_change,
    SUM(CASE era WHEN 'pre_strike' THEN lyft_share END) AS pre_strike_lyft_share,
    SUM(CASE era WHEN 'post_strike' THEN lyft_share END) AS post_strike_lyft_share,
    SUM(CASE era WHEN 'rest_of_2017' THEN lyft_share END) AS rest_of_2017_lyft_share,
    SUM(CASE era WHEN '2016' THEN lyft_share END) AS lyft_share_2016
  FROM uber_vs_lyft ul
    INNER JOIN taxi_zones z ON ul.pickup_location_id = z.locationid
  GROUP BY z.locationid, z.zone, z.borough
  HAVING SUM(CASE WHEN era = 'pre_strike' THEN total_trips END) > 250
) q
ORDER BY lyft_share_change DESC;

\copy (SELECT * FROM uber_vs_lyft_carto_data) TO 'data/uber_vs_lyft_carto_data.csv' CSV HEADER;
