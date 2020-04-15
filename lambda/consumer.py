from __future__ import print_function

import base64
from datetime import datetime
import time
import json
from redis import Redis

r = Redis(host='trip-cache.w0fmsk.0001.use1.cache.amazonaws.com', port=6379)


def lambda_handler(event, context):
    print('Loading function')
    recordNum = 1
    okRecords = 0
    processingFailedRecords = 0

    output = []

    for record in event['records']:
        payload = json.loads(base64.b64decode(record['data']))
        jsData = json.dumps(payload)
        r.zrem("pickups", jsData)
        r.geoadd("pickups", payload['pickup_longitude'], payload['pickup_latitude'], jsData)
        pos = r.geopos("pickups", jsData)
        result = "Ok"
        okRecords += 1

        recordNum += 1

        output_record = {
            'recordId': record['recordId'],
            'result': result,
            'data': base64.b64encode(jsData + "\n")
        }
        output.append(output_record)

    query = r.georadius("pickups", longitude=-74.286875, latitude=40.7625169, radius=100, unit="km", withdist=True)

    print('reslult is {}'.format(query))
    print('Successfully processed {} record(s).'.format(okRecords))
    print('Failed to process {} record(s).'.format(processingFailedRecords))
    print('Records Received {} record(s).'.format(len(event['records'])))

    return {'records': output}