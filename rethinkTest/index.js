const express = require('express')
require('express-async-errors')
const app = express()
const r = require('rethinkdb')
const bodyParser = require('body-parser')
const {randomUUID} = require('crypto')
const fs = require('fs')
const createCsvWriter = require('csv-writer').createArrayCsvWriter
const csvPath = './resource/data.csv'

const PORT = 3024
const rPort = 28015

let connection = null
let connection_2 = null
const idenFaceName = "Iden_Face"
const outputTable = []
const POLL_INTERVAL = 70 //ms
const TEST_SIZE = 100
let count = 0
let totalLat1 = 0
let totalLat2 = 0
let totalLat3 = 0
let totalSize = 0


app.use(express.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const connectToServer = async () => {
    connection = await r.connect( {host: "localhost", port: 28015})
    console.log('connected to local server')

    connection_2 = await r.connect({ host: "172.16.3.10", port: 28015 })
    console.log('connected to external server')
}

const randomNumber = (a) => {
    return Math.floor(Math.random() * (a + 1))
}


const createDummiData = () => {
    const random = randomNumber(1)
    const randomNum = randomNumber(1000)
    let randArr = []
    for( let i = 0; i < 26000; i ++ ){
        randArr.push(randomNumber(1000))
    }
    let dummyData = {
        Name: `name ${randomNum}`,
        Atribute: `Atribute ${randomNum}`,
        Array: randArr
    } 
    if( random === 0 ){
        dummyData.FacesVector = `face ${randomNum}`
    }



    // dummyData.TrackID = randomUUID()

    return dummyData
}


const testPostData = async () => {
    const dummiData = createDummiData()
    const trackID = randomUUID().toString()
    const inputData = {...dummiData, TrackID: trackID}
    const dataSize = Buffer.byteLength(JSON.stringify(inputData))

    //Test save local latency
    let sTime = Date.now()
    await r.db('test2').table(idenFaceName).insert(inputData).run(connection)
    // let latency1 = Date.now() - sTime

    let savedTime = Date.now()

    let broadcastedTime

    // totalLat1 += latency1
    // totalLat2 += latency2
    // totalSize += dataSize

    while(true){
        try{
            const s2Data = await r.db('test2').table(idenFaceName).filter(r.row('TrackID').eq(trackID)).run(connection_2)
            broadcastedTime = Date.now()

            const da = await s2Data.toArray()
            const arr2 = da[0].Array
            const arr1 = dummiData.Array

            // console.log('array 1',arr1)
            // console.log('array 2',arr2)

            if( JSON.stringify(arr1) === JSON.stringify(arr2) ){
                count ++;
            }else{
                console.log('data not match')
            }

            break
        }catch( error ){
            if (error instanceof couchbase.DocumentNotFoundError) { 
                // Document not found, retry after a short delay
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
              } else {
                console.error('Error retrieving document:', error);
                break;
              }
        }
    }

    const latency1 = savedTime - sTime
    const latency2 = broadcastedTime - savedTime

    sTime = Date.now()
    await r.db('test2').table(idenFaceName).filter(r.row('TrackID').eq(trackID)).run(connection)
    const latency3 = Date.now() - sTime

    totalLat1 += latency1
    totalLat2 += latency2
    totalLat3 += latency3
    totalSize += dataSize

    outputTable.push([count, latency1, latency2, latency3, dataSize])



}

const main = async () => {

    // Connect to Rethink Server
    await connectToServer()
    console.log('connection', connection)

    // Create the table name Iden_Face if it's not created
    const tables = await r.db('test2').tableList().run(connection);
    if( !tables.includes(idenFaceName) ){
        r.db('test2').tableCreate(idenFaceName).run(connection)
        console.log(`Created table name ${idenFaceName}`)
    }

}

main()

app.post('/testIdenFace', async (req, res ) => {
    if( !connection || !connection_2 ) {
        res.status(400).send("failed to connect to RethinkDB")
        return
    }

    for( let i = 0; i < TEST_SIZE; i ++ ){
        await testPostData()
    }

    outputTable.push(['avg', totalLat1 / TEST_SIZE, totalLat2 / TEST_SIZE, totalLat3 / TEST_SIZE, totalSize / TEST_SIZE])
    console.table(outputTable)
    console.log(`${count} documents match`)

    if( count == TEST_SIZE ){
        const csvWriter = createCsvWriter({
            path: csvPath,
            header: ['Index', 'Post Latency', 'Broadcast latency', 'Get Latency', 'Data Size'] // Header for csv output file
        })
        await csvWriter.writeRecords(outputTable);
        console.log('CSV file was written successfully');
    }

    res.status(200).send("Check Console to see result")
})

app.delete('/idenFace', async (req, res) => {
    if( !connection ) {
        res.status(400).send("failed to connect to RethinkDB")
        return
    }
    let sTime = Date.now()
    await r.db('test2').table(idenFaceName).delete().run( connection )
    let latency = Date.now() - sTime

    res.status(200).send(`Delete after ${latency}`)
})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})