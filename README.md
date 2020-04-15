# A Demo Application for a Lambda Architecture to Process New York TLC Trip Events
This demo is to implement a lambda architecture to provide batch-processing and stream-processing at the same time for a ride hiding company. 
The processed data will be used by machine learning to train the model to predict trip events in near-future for dynamic pricing. 
The analytics result will also displayed in a read-time dashboards for 3 groups of users: drivers, operators and analysts.

However as I am not familiar with Data Analytics and only have some time at night to learn related AWS services at night. Therefor most parts of the demo have not completed yet. Below is a summary of what has been done and what to be done.
## Structure of Code
1. analyze folder: the .sql files used to analyze trip events offline in PostgreSQL
2. deploy folder: the CloudFormation template (Not Completed yet).
3. batch folder:
    a) jobs folder: the Glue ETL jobs for green, yellow and fhv trip events separately. the Runtime is "Spark 2.4 + Python 2.7"
    b) table folder: the definition of tables in Glue Catalog regarding the corresponding raw csv files for New York TLC: 
        - fhv_2015H1.json for fhv s3://nyc-tlc/trip data/fhv_tripdata_2015_*.csv (only for 2015 to 2016, as the schema of csv files have been changed in 2016).
        - green_2015H1.json for s3://nyc-tlc/trip data/green_tripdata_2015_*.csv (only for 2015 H1, as the csv files of 2015 H2 have been changed.)
        - green_2015H1.json for s3://nyc-tlc/trip data/green_tripdata_2015_*.csv (only for 2015 H1, as the csv files of 2015 H2 have been changed.)
4. streaming folder: *.sql files is for the Kinesis Data Analytics app
5. lambda folder: 

## What Has Been Done
1. Glue ETL Jobs: three ETL jobs to read the New York TLC trip events of green taxi, yellow taxi and FHV trip events. 
    - It will clean the raw records, adjust the raw record to the same schema
    - Calculate the statistics of daily pickups
    - finally save to two series of data in S3 buckets in parquet format
   As the total size of all these trip events is over 290G. For demo purpose, I only load trip events of Jan, 2015 to save the time of processing data.
2. A lambda function to trigger the ETL jobs when new data file is ready.
3. Web Dashboard (10%): integration with Amazon Cognito and display different dashboards for different groups.
4. the Kinesis Data Analytics Application in stream folder.
5. the lambda function to execute query against Athena which will can called by javascript in dashboard to display charts.
6. Implement the lambda function trigger by output deliver stream of Kinesis Firehose to put the 10 min stats and 10 min raw trip events in Amazon ElasticCache~~
7. Implement the lambda function to get the nearby (10 min drive distance) trip events for Amazon ElasticCache


## To Do
5. Implement api calls in .js file of Web UI to call the lambda api to query Athena
6. Implement the charts in dashboard using HighCharts.js  
7. Complete the CloudFormation template to deploy the whole stack automatically.
8. Train a model to predict the number of trips in a location at peak hour using Amazon Machine Learning.

## Deploy to AWS
1. Create S3 bucket 'taxi-data-etl' for storing the trip events after ETL.
2. Create necessary roles in IAM for Glue Jobs, Glue Crawlers to access S3 Buckets.
3. Create tables in Glue Catalog regarding the definitions in batch/table/*.json
4. Create Glue Jobs with the python scripts in batch/job/*.py using the IAM role created before.
5. Create lambda function with batch/trigger_job.python
6. Create User Pool and Identity Pool in Amazon Cognito, add at least one driver user in "drivers" group, one operator user in "operators" group and one analyst user in "analysts" group.
7. Add a App Client in User Pool which will be used in .js code of dashboard.  
