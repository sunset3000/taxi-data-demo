import sys
from awsglue.transforms import *
from awsglue.dynamicframe import DynamicFrame
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql.functions import lit
from awsglue.context import GlueContext
from awsglue.job import Job

## @params: [JOB_NAME]
args = getResolvedOptions(sys.argv, ['JOB_NAME'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)
## @type: DataSource
## @args: [database = "green__tripdata_staging", table_name = "stagingfhv_tripdata_2015_01_csv", transformation_ctx = "datasource0"]
## @return: datasource0
## @inputs: []
origin = glueContext.create_dynamic_frame_from_options(connection_type="s3",
                                                       connection_options={"paths": [
                                                           "s3://taxi-data-etl/fhv_trippdata_test.csv"]},
                                                       format="csv",
                                                       format_options={
                                                           "withHeader": True,
                                                           "separator": ","
                                                       })

# origin = glueContext.create_dynamic_frame.from_catalog(database="green__tripdata_staging",
#                                                             table_name="stagingfhv_tripdata_2015_01_csv",
#                                                             transformation_ctx="origin")
## @type: ApplyMapping
## @args: [mapping = [("dispatching_base_num", "string", "dispatching_base_num", "string"), ("pickup_date", "string", "pickup_datetime", "timestamp"), ("locationid", "string", "pickup_location_id", "long")], transformation_ctx = "applymapping1"]
## @return: applymapping1
## @inputs: [frame = datasource0]
applymapping1 = ApplyMapping.apply(frame=origin,
                                   mappings=[("dispatching_base_num", "string", "dispatching_base_num", "string"),
                                             ("pickup_date", "string", "tpep_pickup_datetime", "timestamp"),
                                             ("locationid", "string", "pickup_location_id", "byte")],
                                   transformation_ctx="applymapping1")
## @type: ResolveChoice
## @args: [choice = "make_struct", transformation_ctx = "resolvechoice2"]
## @return: resolvechoice2
## @inputs: [frame = applymapping1]
resolvechoice2 = ResolveChoice.apply(frame=applymapping1, choice="make_struct", transformation_ctx="resolvechoice2")
## @type: DropNullFields
## @args: [transformation_ctx = "dropnullfields3"]
## @return: dropnullfield
## @inputs: [frame = resolvechoice2]
# dropnullfield = DropNullFields.apply(frame=resolvechoice2, transformation_ctx="dropnullfield")

fhv_df = resolvechoice2.toDF()
fhv_df = fhv_df.withColumn("vendorid", lit(0).astype('byte')) \
    .withColumn("cab_type", lit("fhv").astype('string')) \
    .withColumn("passenger_count", lit(1).astype('long')) \
    .withColumn("trip_distance", lit(None).astype('double')) \
    .withColumn("pickup_longitude", lit(None).astype('double')) \
    .withColumn("pickup_latitude", lit(0).astype('double')) \
    .withColumn("store_and_fwd_flag", lit('Y').astype('string')) \
    .withColumn("ratecodeid", lit(None).astype('byte')) \
    .withColumn("dropoff_longitude", lit(None).astype('double')) \
    .withColumn("dropoff_latitude", lit(None).astype('double')) \
    .withColumn("dropoff_location_id", lit(None).astype('byte')) \
    .withColumn("payment_type", lit(None).astype('byte')) \
    .withColumn("fare_amount", lit(None).astype('double')) \
    .withColumn("extra", lit(None).astype('double')) \
    .withColumn("mta_tax", lit(0).astype('double')) \
    .withColumn("tpep_dropoff_datetime", lit(None).astype('timestamp')) \
    .withColumn("tip_amount", lit(None).astype('double')) \
    .withColumn("tolls_amount", lit(None).astype('double')) \
    .withColumn("improvement_surcharge", lit(None).astype('double')) \
    .withColumn("total_amount", lit(0).astype('double'))
fhv_df = fhv_df.drop('dispatching_base_num')
target_df = DynamicFrame.fromDF(fhv_df, glueContext, "target_df")
## @type: DataSink
## @args: [connection_type = "s3", connection_options = {"path": "s3://tianf-mapreduce/trip-data-etl/fhv2015"}, format = "parquet", transformation_ctx = "datasink4"]
## @return: datasink4
## @inputs: [frame = dropnullfields3]
datasink = glueContext.write_dynamic_frame.from_options(frame=target_df, connection_type="s3",
                                                        connection_options={"path": "s3://taxi-data-etl/staging/fhv/"},
                                                        format="parquet", transformation_ctx="datasink")

df0 = fhv_df.createTempView('tbl0')
df1 = spark.sql("SELECT cab_type, date(tpep_pickup_datetime) AS date, pickup_location_id, COUNT(*) AS trips FROM tbl0 GROUP BY cab_type, date(tpep_pickup_datetime), pickup_location_id")

daily_df = DynamicFrame.fromDF(df1, glueContext, "daily_df")

sink2 = glueContext.write_dynamic_frame.from_options(frame=daily_df, connection_type="s3",
                                                    connection_options={"path": "s3://taxi-data-etl/staging/daily_fhv"},
                                                    format="parquet", transformation_ctx="sink2")
