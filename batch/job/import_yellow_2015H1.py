import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.dynamicframe import DynamicFrame
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
## @args: [database = "green__tripdata_staging", table_name = "stagingyellow_tripdata_2015_01_csv", transformation_ctx = "datasource0"]
## @return: datasource0
## @inputs: []
# origin = glueContext.create_dynamic_frame_from_options(connection_type = "s3",
#                                                        connection_options = {"paths": ["s3://taxi-data-etl/yellow_trippdata_test.csv"]},
#                                                        format = "csv",
#                                                        format_options={
#                                                            "withHeader": True,
#                                                            "separator": ","
#                                                        })

origin = glueContext.create_dynamic_frame.from_catalog(database="green__tripdata_staging",
                                                       table_name="stagingyellow_tripdata_2015_01_csv",
                                                       transformation_ctx="origin")
## @type: ApplyMapping
## @args: [mapping = [("vendorid", "long", "vendorid", "byte"), ("tpep_pickup_datetime", "string", "tpep_pickup_datetime", "timestamp"), ("tpep_dropoff_datetime", "string", "tpep_dropoff_datetime", "timestamp"), ("passenger_count", "long", "passenger_count", "long"), ("trip_distance", "double", "trip_distance", "double"), ("pickup_longitude", "double", "pickup_longitude", "double"), ("pickup_latitude", "double", "pickup_latitude", "double"), ("ratecodeid", "long", "ratecodeid", "byte"), ("store_and_fwd_flag", "string", "store_and_fwd_flag", "string"), ("dropoff_longitude", "double", "dropoff_longitude", "double"), ("dropoff_latitude", "double", "dropoff_latitude", "double"), ("payment_type", "long", "payment_type", "byte"), ("fare_amount", "double", "fare_amount", "double"), ("extra", "double", "extra", "double"), ("mta_tax", "double", "mta_tax", "double"), ("tip_amount", "double", "tip_amount", "double"), ("tolls_amount", "double", "tolls_amount", "double"), ("improvement_surcharge", "double", "improvement_surcharge", "double"), ("total_amount", "double", "total_amount", "double")], transformation_ctx = "applymapping1"]
## @return: applymapping1
## @inputs: [frame = datasource0]
applymapping1 = ApplyMapping.apply(frame=origin,
                                   mappings=[("vendorid", "long", "vendorid", "byte"),
                                             ("tpep_pickup_datetime", "string", "tpep_pickup_datetime", "timestamp"),
                                             ("tpep_dropoff_datetime", "string", "tpep_dropoff_datetime", "timestamp"),
                                             ("passenger_count", "long", "passenger_count", "long"),
                                             ("trip_distance", "double", "trip_distance", "double"),
                                             ("pickup_longitude", "double", "pickup_longitude", "double"),
                                             ("pickup_latitude", "double", "pickup_latitude", "double"),
                                             ("ratecodeid", "long", "ratecodeid", "byte"),
                                             ("store_and_fwd_flag", "string", "store_and_fwd_flag", "string"),
                                             ("dropoff_longitude", "double", "dropoff_longitude", "double"),
                                             ("dropoff_latitude", "double", "dropoff_latitude", "double"),
                                             ("payment_type", "long", "payment_type", "byte"),
                                             ("fare_amount", "double", "fare_amount", "double"),
                                             ("extra", "double", "extra", "double"),
                                             ("mta_tax", "double", "mta_tax", "double"),
                                             ("tip_amount", "double", "tip_amount", "double"),
                                             ("tolls_amount", "double", "tolls_amount", "double"),
                                             ("improvement_surcharge", "double", "improvement_surcharge", "double"),
                                             ("total_amount", "double", "total_amount", "double")],
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
yellow_DF = filtered_dyDF.toDF()
yellow_DF = yellow_DF.withColumn('cab_type', lit('yellow').astype('string')) \
    .withColumn('pickup_location_id', lit(None).astype('byte')) \
    .withColumn('dropoff_location_id', lit(None).astype('byte'))
target_df = DynamicFrame.fromDF(yellow_DF, glueContext, "target_df")
## @type: DropNullFields
## @args: [transformation_ctx = "dropnullfields3"]
## @return: dropnullfields3
## @inputs: [frame = resolvechoice2]
# dropnullfields3 = DropNullFields.apply(frame = resolvechoice2, transformation_ctx = "dropnullfields3")
## @type: DataSink
## @args: [connection_type = "s3", connection_options = {"path": "s3://taxi-data-etl/staging/yellow"}, format = "parquet", transformation_ctx = "datasink4"]
## @return: datasink4
## @inputs: [frame = dropnullfields3]
sink = glueContext.write_dynamic_frame.from_options(frame=target_df, connection_type="s3",
                                                    connection_options={
                                                        "path": "s3://taxi-data-etl/staging/trips"},
                                                    format="parquet", transformation_ctx="sink")

df0 = yellow_DF.createTempView('tbl0')
df1 = spark.sql("SELECT cab_type, date(tpep_pickup_datetime) AS date, pickup_location_id, COUNT(*) AS trips FROM tbl0 GROUP BY cab_type, date(tpep_pickup_datetime), pickup_location_id")
daily_df = DynamicFrame.fromDF(df1, glueContext, "daily_df")

sink2 = glueContext.write_dynamic_frame.from_options(frame=daily_df, connection_type="s3",
                                                    connection_options={"path": "s3://taxi-data-etl/staging/daily"},
                                                    format="parquet", transformation_ctx="sink2")
job.commit()
