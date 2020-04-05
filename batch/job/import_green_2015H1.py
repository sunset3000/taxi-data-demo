import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql.functions import lit, window
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
## @args: [database = "green__tripdata_staging", table_name = "staginggreen_tripdata_2015_01_csv", transformation_ctx = "datasource0"]
## @return: datasource0
## @inputs: []

# origin = glueContext.create_dynamic_frame_from_options(connection_type = "s3",
#                                                        connection_options = {"paths": ["s3://taxi-data-etl/green_tripdata_test.csv"]},
#                                                        format = "csv",
#                                                        format_options={
#                                                            "withHeader": True,
#                                                            "separator": ","
#                                                        })

origin = glueContext.create_dynamic_frame.from_catalog(database="green__tripdata_staging",
                                                       table_name="staginggreen_tripdata_2015_01_csv",
                                                       transformation_ctx="origin")
## @type: ApplyMapping
## @args: [mapping = [("vendor_id", "string", "vendor_id", "byte"), ("lpep_pickup_datetime", "string", "lpep_pickup_datetime", "timestamp"), ("lpep_dropoff_datetime", "string", "lpep_dropoff_datetime", "timestamp"), ("store_and_fwd_flag", "string", "store_and_fwd_flag", "string"), ("rate_code_id", "string", "rate_code_id", "byte"), ("pickup_longitude", "string", "pickup_longitude", "string"), ("pickup_latitude", "string", "pickup_latitude", "string"), ("dropoff_longitude", "string", "dropoff_longitude", "string"), ("dropoff_latitude", "string", "dropoff_latitude", "string"), ("passenger_count", "string", "passenger_count", "int"), ("trip_distance", "string", "trip_distance", "double"), ("fare_amount", "string", "fare_amount", "double"), ("extra", "string", "extra", "double"), ("mta_tax", "string", "mta_tax", "double"), ("tip_amount", "string", "tip_amount", "double"), ("tolls_amount", "string", "tolls_amount", "double"), ("ehail_fee", "string", "ehail_fee", "double"), ("total_amount", "string", "total_amount", "double"), ("payment_type", "string", "payment_type", "byte"), ("trip_type", "string", "trip_type", "byte")], transformation_ctx = "applymapping1"]
## @return: applymapping1
## @inputs: [frame = datasource0]
applymapping1 = ApplyMapping.apply(frame=origin,
                                   mappings=[("vendor_id", "string", "vendor_id", "byte"),
                                             ("lpep_pickup_datetime", "string", "tpep_pickup_datetime", "timestamp"),
                                             ("lpep_dropoff_datetime", "string", "tpep_dropoff_datetime", "timestamp"),
                                             ("store_and_fwd_flag", "string", "store_and_fwd_flag", "string"),
                                             ("rate_code_id", "string", "rate_code_id", "byte"),
                                             ("pickup_longitude", "string", "pickup_longitude", "string"),
                                             ("pickup_latitude", "string", "pickup_latitude", "string"),
                                             ("dropoff_longitude", "string", "dropoff_longitude", "string"),
                                             ("dropoff_latitude", "string", "dropoff_latitude", "string"),
                                             ("passenger_count", "string", "passenger_count", "int"),
                                             ("trip_distance", "string", "trip_distance", "double"),
                                             ("fare_amount", "string", "fare_amount", "double"),
                                             ("extra", "string", "extra", "double"),
                                             ("mta_tax", "string", "mta_tax", "double"),
                                             ("tip_amount", "string", "tip_amount", "double"),
                                             ("tolls_amount", "string", "tolls_amount", "double"),
                                             ("ehail_fee", "string", "ehail_fee", "double"),
                                             ("total_amount", "string", "total_amount", "double"),
                                             ("payment_type", "string", "payment_type", "byte"),
                                             ("trip_type", "string", "trip_type", "byte")],
                                   transformation_ctx="applymapping1")

## @type: ResolveChoice
## @args: [choice = "make_struct", transformation_ctx = "resolvechoice2"]
## @return: resolvechoice2
## @inputs: [frame = applymapping1]
resolvechoice2 = ResolveChoice.apply(frame=applymapping1, choice="make_struct", transformation_ctx="resolvechoice2")

filtered_dyDF = Filter.apply(frame=resolvechoice2,
                             f=lambda x: x["pickup_longitude"] != 0 and x["pickup_latitude"] != 0 and x[
                                 "dropoff_longitude"] != 0 and x["dropoff_latitude"] != 0
                                         and x["tpep_dropoff_datetime"] > x["tpep_pickup_datetime"])
green_DF = filtered_dyDF.toDF()
green_DF = green_DF.withColumn('cab_type', lit('green').astype('string')) \
    .withColumn('pickup_location_id', lit(None).astype('byte')) \
    .withColumn('dropoff_location_id', lit(None).astype('byte'))
green_DF = green_DF.drop('junk1').drop('junk2')

## @type: DataSink
## @args: [connection_type = "s3", connection_options = {"path": "s3://taxi-data-etl/staging/green"}, format = "parquet", transformation_ctx = "datasink4"]
## @return: datasink4
## @inputs: [frame = dropnullfields3]
target_df = DynamicFrame.fromDF(green_DF, glueContext, "target_df")
sink1 = glueContext.write_dynamic_frame.from_options(frame=target_df, connection_type="s3",
                                                    connection_options={"path": "s3://taxi-data-etl/staging/trips"},
                                                    format="parquet", transformation_ctx="sink")


df0 = green_DF.createTempView('tbl0')
df1 = spark.sql("SELECT cab_type, date(tpep_pickup_datetime) AS date, pickup_location_id, COUNT(*) AS trips FROM tbl0 GROUP BY cab_type, date(tpep_pickup_datetime), pickup_location_id")
# df1 = df1.groupBy("cab_type", window("tpep_pickup_datetime", "1 day"), "pickup_location_id").count().alias("trips")
# df1 = df1.withColumnRenamed("window", "date")
# df1 = df1.orderBy("cab_type", "date", "pickup_location_id")


daily_df = DynamicFrame.fromDF(df1, glueContext, "daily_df")

sink2 = glueContext.write_dynamic_frame.from_options(frame=daily_df, connection_type="s3",
                                                    connection_options={"path": "s3://taxi-data-etl/staging/daily"},
                                                    format="parquet", transformation_ctx="sink2")
job.commit()
