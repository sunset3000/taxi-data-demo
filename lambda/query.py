from __future__ import print_function

import base64
import json
from redis import Redis

r = Redis(host='trip-cache.w0fmsk.0001.use1.cache.amazonaws.com', port=6379)


def get_nearby_trips(lon, lat):
    query = r.georadius("pickups", longitude=lon, latitude=lat, radius=10, unit="km", withdist=True, withcoord=True)
    print("{} trips found".format(len(query)))
    output = []
    for record in query:
        trip = {'distance': record[1], 'lon': record[2][0], 'lat': record[2][1]}
        try:
            trip['raw'] = json.loads(record[0])
            output.append(trip)
        except ValueError:
            print("Decode JSON {} error".format(record[0]))
            trip['raw'] = {}
        # print("record is: {}".format(trip))

    # print("trips: [{}]".format(output))
    return output


def lambda_handler(event, context):
    print("API controller")
    params = event['queryStringParameters']

    # check the params
    if 'lon' not in params or 'lat' not in params:
        error = {'error': 'request does not include longitude and latitude'}
        return {
            'statusCode': 405,
            'body': json.dumps(error)
        }

    # query redis
    result = get_nearby_trips(params['lon'], params['lat'])

    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
