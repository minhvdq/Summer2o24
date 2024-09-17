const express = require('express')
const bodyParser = require('body-parser')
const couchbase = require('couchbase')
require('dotenv').config()
require('express-async-errors')
const middlewares = require('./utils/middlewares')
const serverVariables = require('./serverVariables')
const app = express()
const cors = require('cors')
const {randomUUID} = require('crypto')
const {initCluster} = require('./function/cbfunc')
const username = process.env.CB_USERNAME
const password = process.env.CB_PASSWORD
const couchase2Url = 'couchbase://172.16.3.10'

let cluster = null

app.use(cors())
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
// app.use(express.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.argv[3] ? process.argv[3] : 3000

let num = 0

console.log(`username ${username} password ${password}`)

const bucketName = 'Faces'
const idenCollName = 'Iden_Faces'
const scopeName = 'Inventory'

const main = async () => {
    cluster = await couchbase.connect('couchbase://localhost', {
        username: username,
        password: password
    })

    console.log('connected to couchbase server 1')
    
    const cluster2 = await couchbase.connect(couchase2Url, {
        username: username,
        password: password
    })

    console.log('connected to couchbase server 2')

    // const bucket = cluster.bucket(bucketName)

    // const cluster = await couchbase.connect(`couchbase://127.0.0.1`,{
    //     username: username,
    //     password: password
    // })

    const bucketManager = cluster.buckets()
    const buckets = await bucketManager.getAllBuckets()

    console.log('buckets are', buckets)

    // if( !buckets.find( bucket => bucket.name === 'Faces')){
    //     await bucketManager.createBucket({
    //         name: 'Faces',
    //         ramQuotaMB: 50,
    //         flushEnabled: true, // Enable bucket flush if needed
    //         replicaNumber: 1, // Number of replicas
    //     });
    // }
    const bucket = cluster.bucket('Faces')

    const coll = bucket.defaultCollection()
    const IdenFace = bucket.scope(scopeName).collection(idenCollName)

    app.use(middlewares.requestLogger)
    app.use(middlewares.tokenExtractor)

    // Face endpoint
    app.get('/face', async( req, res ) => {
        let call = `SELECT * From default:${bucketName}`
        console.log('call: ', call)
        const data = (await cluster.query(call)).rows
        console.log(`data is ${JSON.stringify(data)}`)
        res.status(200).json(data)
    })

    app.post('/face', async ( req, res ) => {
        const body = req.body
        console.log('body is', body)
        const newTrackId = randomUUID().toString()
        const data = await coll.upsert(newTrackId, JSON.stringify(body))
        res.status(200).json(data)
    })
    
    //Iden_Face endpoint

    // get all the documents in Iden Face collection
    app.get('/idenFace', async( req, res ) => {
        let call = `SELECT * From default:${bucketName}.${scopeName}.${idenCollName} `
        console.log('call: ', call)
        const data = (await cluster.query(call)).rows
        console.log(`data is ${JSON.stringify(data)}`)
        res.status(200).json(data)
    })

    // Get a specific document from the collection
    app.get('/idenFace/:trackID', async (req, res) => {
        const trackID = req.params.trackID

        const resData = await IdenFace.get(trackID)
        res.status(200).json(resData)
    })

    // Post a document to the collection
    app.post('/idenFace', async ( req, res ) => {
        const body = req.body
        console.log('body is', body)
        const newTrackId = randomUUID().toString()
        // const jsonBody = JSON.stringify(body)
        const newData = {...body, TrackID: newTrackId }
        const dataSize = Buffer.byteLength(JSON.stringify(newData))
        const startTime = Date.now()
        const data = await IdenFace.upsert(newTrackId, newData)
        const waitTime = Date.now() - startTime

        console.log(`waited ${waitTime} ms for write command with size ${dataSize} bytes`)
        res.status(200).json({trakID: newTrackId, waitTime: waitTime})
    })

    //delete all the document in the collection
    app.delete('/idenFace', async( req, res ) => {
        const facesVector = req.body.FacesVector
        let call = `DELETE FROM ${bucketName} f WHERE f.FacesVector = ${facesVector} RETURN f `

    })


    app.use(middlewares.unknownEndpoint)
    app.use(middlewares.errorHandler)
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })

}

main().then(() => {
    console.log('running couchbase successfully')
}).catch( error => {
    console.log('caught error', error)
})