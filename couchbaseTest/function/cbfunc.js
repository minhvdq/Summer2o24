const couchbase = require('couchbase')
require('express-async-errors')
const username = process.env.CB_USERNAME
const password = process.env.CB_PASSWORD
const connectUrl = `couchbase://localhost`
const bucketName = "Faces"

async function initCluster(){
    const cluster = await couchbase.connect(connectUrl, {
        username: username,
        password: password
    })

    await cluster.bucket().createBucket({
        name: bucketName,
        ramQuotaMB: 100,
    })
    console.log(`bucket ${bucketName} initialized successfully!`)
    return cluster
}

exports.module = {initCluster}