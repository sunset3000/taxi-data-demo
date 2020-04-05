import shapefile
from shapely.geometry import Polygon
from descartes.patch import PolygonPatch
import matplotlib as mpl
import pandas as pd
import numpy as np
# import urllib.request
import zipfile
import random
import itertools
import math
from pyproj import Proj

# for second test
import geopandas as gpd
from shapely.geometry import Point


# import matplotlib.pyplot as plt

# plt.style.use('ggplot')

def get_lat_lon(sf):
    content = []
    nyc_prj = Proj(
        "+proj=lcc +lat_1=40.66666666666666 +lat_2=41.03333333333333 +lat_0=40.16666666666666 +lon_0=-74 +x_0=300000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs")
    for sr in sf.shapeRecords():
        shape = sr.shape
        rec = sr.record
        loc_id = rec[shp_dic['LocationID']]

        x = (shape.bbox[0] + shape.bbox[2]) / 2
        y = (shape.bbox[1] + shape.bbox[3]) / 2
        x1, y1 = nyc_prj(x, y, inverse=True)
        content.append((loc_id, x1, y1))
    return pd.DataFrame(content, columns=["LocationID", "longitude", "latitude"])


def first_test():
    sf = shapefile.Reader("/root/taxizones/taxi_zones.shp")
    fields_name = [field[0] for field in sf.fields[1:]]
    shp_dic = dict(zip(fields_name, list(range(len(fields_name)))))
    attributes = sf.records()
    shp_attr = [dict(zip(fields_name, attr)) for attr in attributes]

    df_loc = pd.DataFrame(shp_attr).join(get_lat_lon(sf).set_index("LocationID"), on="LocationID")
    print df_loc


df = gpd.read_file('/root/taxizones/taxi_zones.shp').to_crs({'init': 'epsg:4326'})
df = df.drop(['Shape_Area', 'Shape_Leng', 'OBJECTID'], axis=1)
gpd.sjoin(gpd.GeoDataFrame(crs={'init': 'epsg:4326'},
                           geometry=[Point(-73.966, 40.78)]), df, how='left', op='within')
print df
