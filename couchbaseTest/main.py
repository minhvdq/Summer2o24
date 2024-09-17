import requests
import json


def create_bucket(cluster_url, bucket_name, username, password):
    url = f"http://{cluster_url}:8091/pools/default/buckets"
    headers = {'Content-Type': 'application/json'}
    data = {
        'name': bucket_name,
        'ramQuotaMB': 100,
        'bucketType': 'couchbase',
        'authType': 'sasl'
    }
    response = requests.post(url, headers=headers, json=data, auth=(username, password))
    if response.status_code == 202:
        print(f"Bucket {bucket_name} created successfully on {cluster_url}")
    else:
        print(f"Failed to create bucket {bucket_name} on {cluster_url}: {response.text}")

def setup_xdcr(source_cluster, dest_cluster, from_bucket, to_bucket, username, password):
    url = f"http://{source_cluster}:8091/controller/createReplication"
    headers = {'Content-Type': 'application/json'}
    data = {
        'fromBucket': from_bucket,
        'toCluster': dest_cluster,
        'toBucket': to_bucket,
        'replicationType': 'continuous'
    }
    response = requests.post(url, headers=headers, json=data, auth=(username, password))
    if response.status_code == 200:
        print(f"XDCR setup successfully from {from_bucket} to {to_bucket}")
    else:
        print(f"Failed to set up XDCR from {from_bucket} to {to_bucket}: {response.text}")

def main():
    cluster_a = "localhost:8091"
    cluster_b = "localhost:18091"
    username = "Administrator"
    password = "password"
    bucket_a = "bucketA"
    bucket_b = "bucketB"

    # Create buckets on both clusters
    create_bucket(cluster_a, bucket_a, username, password)
    create_bucket(cluster_b, bucket_b, username, password)

    # Wait for buckets to be created
    import time
    time.sleep(10)

    # Set up XDCR from A to B
    setup_xdcr(cluster_a, "localhost:18091", bucket_a, bucket_b, username, password)
    
    # Set up XDCR from B to A
    setup_xdcr(cluster_b, "localhost:8091", bucket_b, bucket_a, username, password)

if __name__ == "__main__":
    main()