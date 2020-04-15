import base64
import boto3
import botocore.config
import uuid

sns_arn = "arn:aws:sns:us-east-1:67789:logprocess"
client = boto3.client('s3')

def lambda_handler(event, context):
    # TODO implement
    for record in event['Records']:
        # Kinesis data is base64 encoded so decode here
        payload = base64.b64decode(record["kinesis"]["data"])
        print("Decoded payload: " + str(payload))

    config = botocore.config.Config()
    config.region_name = "us-east-1"
    config.connection_timeout = 60
    config.read_timeout = 60

    kinesis_client = boto3.client('kinesis', config=config)
    print "kinesis client created."

    partition_key = str(uuid.uuid4())
    explicit_hash_key = str(uuid.uuid4().int)
    raw_data = base64.b64encode("record from lambda[consumer]")

    print('Submitting record with EHK=%s NumRecords=%d' %
          (explicit_hash_key, 1))
    try:
        kinesis_client.put_record(StreamName="lambda-stream",
                                  Data=raw_data,
                                  PartitionKey=partition_key,
                                  ExplicitHashKey=explicit_hash_key)
    except Exception as e:
        print('Transmission Failed: %s' % e)
    else:
        print('Completed record with EHK=%s' % explicit_hash_key)
