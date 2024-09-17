const express = require('express');
require('dotenv').config()
const app = express();
const axios = require('axios')
const middlewares = require('./utils/middlewares')
const couchbase = require('couchbase')
const bodyParser = require('body-parser')
const { randomUUID } = require('crypto')
const CircularJSON = require('circular-json')
const fs = require('fs')
const createCsvWriter = require('csv-writer').createArrayCsvWriter
const csvPath = './resource/data.csv'


const PORT = 2000;

const WAIT_TIMEOUT = 10000 // send a new data every 10s
const POLL_INTERVAL = 50 // poll after every some ms
const TEST_SIZE = 100

const dTable = []

const desPort = 3000


const cbConnectStr_2 = `couchbase://172.16.3.10` // IP of the external node
const cbConnectStr = `couchbase://172.16.2.163`  // IP of the local node
const username = 'minhvdq'
const password = `571114`
const bucketName = 'Faces'
const scopeName = 'Inventory'
const idenCollName = 'Iden_Faces'

let cluster
let cluster2
let idenFaceColl    // Collection from local 
let idenFaceColl2   // Collection from external


let totalLat1 = 0
let totalLat2 = 0
let totalLat3 = 0
let totalSize = 0

/*
    A function take in an integer "a" and return a random integer between 0 and a
*/
const randomNumber = (a) => {
    return Math.floor(Math.random() * (a + 1))
}

/*
    Function creating random dummy data with the size of around 100kB
*/
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

    return dummyData
}


let testCount = 0;

/*
    Function benchmark the communication latency between 2 servers
*/
const testSyncFromEx = async () => {

    // Generate dummy data and attach it with a tracID( use built in function UUID)
    const dummiData = createDummiData()
    const trackID = randomUUID()
    const newData = {...dummiData, trackID: trackID}
    const dataSize = Buffer.byteLength(JSON.stringify(newData)) // Save the data size

    //Insert the dummy data to the local server and wait for it to sync with the external server
    let sTime = Date.now() 
    await idenFaceColl.upsert(trackID, dummiData)
    const savedTime = Date.now()
    
    let broadcastedTime
    
    // Keep pulling the data using assigned unique trackID from the external server wever POLL_INTERVAL ms until the dummy data appears there
    while(true){
        try{
            const s2Data = await idenFaceColl2.get(trackID)
            broadcastedTime = Date.now()
            const arr2 = s2Data.content.Array
            const arr1 = dummiData.Array

            // console.log('array 1',arr1)
            // console.log('array 2',arr2)

            if( JSON.stringify(arr1) === JSON.stringify(arr2) ){
                testCount ++;
            }else{
                console.log('data not match')
            }

            break

            // console.log(s2Data)

            // const waitTime = D   ate.now() - sTime
            // console.log(`Test case 3: Total time: ${broadcastedTime - sTime} Saved time: ${savedTime - sTime} Sync Time: ${broadcastedTime - savedTime}  Data size: ${dataSize}`)
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
    await idenFaceColl.get(trackID)
    const latency3 = Date.now() - sTime

    dTable.push([testCount, latency1, latency2, latency3, dataSize])

    // Save the latencies into the table
    totalLat1 += latency1
    totalLat2 += latency2
    totalLat3 += latency3
    totalSize += dataSize
}

const initCluster = async () => {

    cluster =  await couchbase.connect(cbConnectStr, {
        username, password
    })
    console.log('connected to cb server b - local')

    cluster2 = await couchbase.connect(cbConnectStr_2, {
        username, password
    })

    console.log('connected to cb server a - external')
    bucket = cluster.bucket(bucketName) 
    idenFaceColl = bucket.scope(scopeName).collection(idenCollName)
    idenFaceColl2 = cluster2.bucket(bucketName).scope(scopeName).collection(idenCollName)
    return [cluster, cluster2]
}



let cnt = 1
let total = 0


const main = async () => {

    for( let i = 0; i < TEST_SIZE; i ++ ){
        await testSyncFromEx()
    }

    dTable.push( ['avg', totalLat1 / TEST_SIZE, totalLat2 / TEST_SIZE, totalLat3/ TEST_SIZE, totalSize / TEST_SIZE])

    console.table( dTable)

    console.log(`${testCount} data cases match`)

    if( testCount == TEST_SIZE ){
        console.log('writing csv')
        const csvWriter = createCsvWriter({
            path: csvPath,
            header: ['Index', 'Post Latency', 'Broadcast latency', 'Get Latency', 'Data Size'] // Header for csv output file
        })
        await csvWriter.writeRecords(dTable);
        console.log('CSV file was written successfully');
    }

}

app.use(express.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

initCluster().then( res => {
    console.log('connected to cluster servers')

    main()
}).catch(error => {
    console.log(`Caught new Error ${error}`)
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});